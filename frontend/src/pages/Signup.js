import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaUser, FaCalendarAlt } from "react-icons/fa";
import signupImg from "../assets/signupImg.jpg";
import "../styles/signup.css";
import { notifySignupSuccess, notify } from "../utils/notify";
import RoleSelectionModal from "../components/RoleSelectionModal";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, runTransaction, updateDoc } from "firebase/firestore";

export default function Signup() {
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  
  // Password policy realtime state
  const [pwdInfo, setPwdInfo] = useState({
    length: false,
    upper: false,
    lower: false,
    digit: false,
    noSpace: true,
  });

  const evaluatePassword = (pwd) => ({
    length: typeof pwd === 'string' && pwd.length >= 8,
    upper: /[A-Z]/.test(pwd || ''),
    lower: /[a-z]/.test(pwd || ''),
    digit: /\d/.test(pwd || ''),
    noSpace: !/\s/.test(pwd || ''),
  });

  const isPasswordValid = (info) => (
    info.length && info.upper && info.lower && info.digit && info.noSpace
  );
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [pendingDocId, setPendingDocId] = useState(null);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const nameRegex = /^[A-Za-z\s'-]+$/;

  const validateForm = () => {
    if (!username.trim()) return "Username is required.";
    if (username.length < 3) return "Username must be at least 3 characters.";

    if (!firstName.trim()) return "First name is required.";
    if (!nameRegex.test(firstName)) return "First name contains invalid characters.";

    if (!lastName.trim()) return "Last name is required.";
    if (!nameRegex.test(lastName)) return "Last name contains invalid characters.";

    if (!birthday) return "Birthday is required.";
    const bDate = new Date(birthday);
    if (isNaN(bDate.getTime())) return "Invalid birthday.";
    if (bDate > new Date()) return "Birthday cannot be in the future.";

    // Age Check (13+)
    const today = new Date();
    let age = today.getFullYear() - bDate.getFullYear();
    const m = today.getMonth() - bDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
      age--;
    }
    if (age < 13) {
      return "You must be at least 13 years old to create an account.";
    }

    if (!email.trim()) return "Email is required.";
    if (!emailRegex.test(email)) return "Please enter a valid email address.";

    if (!password) return "Password is required.";
    const info = evaluatePassword(password);
    if (!info.length) return "Password must be at least 8 characters.";
    if (!info.upper) return "Password must include at least one uppercase letter.";
    if (!info.lower) return "Password must include at least one lowercase letter.";
    if (!info.digit) return "Password must include at least one number.";
    if (!info.noSpace) return "Password must not contain spaces.";

    if (!confirmPassword) return "Please confirm your password.";
    if (password !== confirmPassword) return "Passwords do not match.";

    return "";
  };

  const handleRoleSubmit = async (roleData) => {
    try {
      if (pendingDocId) {
        const userDocRef = doc(db, "users", pendingDocId);
        await updateDoc(userDocRef, roleData);
      }
      
      setShowRoleModal(false);
      notifySignupSuccess();
      navigate("/login");
    } catch (err) {
      console.error("Error saving role:", err);
      notify("Failed to save role. Please try again.");
    }
  }
  const handleRoleSkip = () => {
    setShowRoleModal(false);
    notify("Account created! You can set your role later in Settings.");
    navigate("/login");
  };

  const handleRegister = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const lowerEmail = email.toLowerCase();
      const userCredential = await createUserWithEmailAndPassword(auth, lowerEmail, password);
      const user = userCredential.user;

      const counterRef = doc(db, "metadata", "userCounter");
      const newUserId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { count: 1 });
          return 1;
        }
        const newCount = (counterDoc.data().count || 0) + 1;
        transaction.update(counterRef, { count: newCount });
        return newCount;
      });

      const numericDocRef = doc(db, "users", newUserId.toString());
      const userObj = {
        username,
        firstName,
        lastName,
        birthday: new Date(birthday).toISOString(),
        email: lowerEmail,
        createdAt: new Date().toISOString(),
        authUID: user.uid,
        numericId: newUserId,
        emailVerified: false, // Add email verification status
      };
      await setDoc(numericDocRef, userObj);

      // Send OTP to user's email
      try {
        const otpResponse = await fetch("http://localhost:5000/api/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: lowerEmail, 
            userName: firstName 
          }),
        });

        const otpData = await otpResponse.json();
        
        if (otpData.success) {
          // Redirect to OTP verification page
          navigate("/verify-otp", { 
            state: { 
              email, 
              userName: firstName,
              userId: newUserId 
            } 
          });
        } else {
          console.warn("Failed to send OTP:", otpData.message);
          notify("Account created but failed to send verification email. Please contact support.");
        }
      } catch (otpError) {
        console.error("Error sending OTP:", otpError);
        notify("Account created but failed to send verification email. You can verify later from settings.");
      }

      localStorage.setItem(
        "user",
        JSON.stringify({
          username,
          firstName,
          lastName,
          birthday: userObj.birthday,
          email,
          user_id: newUserId,
          authUID: user.uid,
          emailVerified: false,
        })
      );

    } catch (err) {
      console.error("❌ Firebase Signup Error:", err);
      let errorMessage = "An error occurred. Please try again.";

      if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered. Try another email";
      } else if (err.code === "auth/invalid-email") {
        errorMessage = "Invalid email address.";
      } else if (err.code === "auth/weak-password") {
        errorMessage = "Password should be at least 6 characters.";
      } else if (err.code === "permission-denied") {
        errorMessage = "Database permission denied. Check Firestore rules.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <RoleSelectionModal
        isOpen={showRoleModal}
        onSubmit={handleRoleSubmit}
        onSkip={handleRoleSkip}
      />
      
     <div className="signup-page">
        <div className="signup-container">
        <div className="cover">
          <img src={signupImg} alt="Signup background" />
          <div className="text">
            <span className="text-1">Create Account</span>
            <span className="text-2">Join Slide-IT today</span>
          </div>
        </div>

        <div className="forms">
          <div className="form-content">
            <div className="signup-form">
              <h2 className="title">Sign Up</h2>

              {error && <p className="error-message">{error}</p>}

              {/* Row 1: Username & First Name */}
              <div className="form-grid two-column">
                
                {/* Username Group */}
                <div className="input-group">
                  <label className="input-label">Username</label>
                  <div className="input-box">
                    <i><FaUser /></i>
                    <input
                      type="text"
                      placeholder="e.g. SlideMaster99"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={{ paddingLeft: "35px" }}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* First Name Group */}
                <div className="input-group">
                  <label className="input-label">First Name</label>
                  <div className="input-box">
                    <i><FaUser /></i>
                    <input
                      type="text"
                      placeholder="e.g. John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      style={{ paddingLeft: "35px" }}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Last Name & Birthday */}
              <div className="form-grid two-column" style={{ marginTop: "16px" }}>
                
                {/* Last Name Group */}
                <div className="input-group">
                  <label className="input-label">Last Name</label>
                  <div className="input-box">
                    <i><FaUser /></i>
                    <input
                      type="text"
                      placeholder="e.g. Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      style={{ paddingLeft: "35px" }}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Birthday Group */}
                <div className="input-group">
                  <label className="input-label">Date of Birth</label>
                  <div className="input-box">
                    <i><FaCalendarAlt /></i>
                    <input
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      disabled={loading}
                      style={{ paddingLeft: "35px" }}
                    />
                  </div>
                </div>
              </div>
              {/* Row 3: Email (Full Width) */}
              <div className="form-grid one-column" style={{ marginTop: "16px" }}>
                <div className="input-group">
                  <label className="input-label">Email Address</label>
                  <div className="input-box">
                    <i><FaEnvelope /></i>
                    <input
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={{ paddingLeft: "35px" }}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Passwords */}
              <div className="form-grid two-column" style={{ marginTop: "16px" }}>
                
                {/* Password Group */}
                <div className="input-group">
                  <label className="input-label">Password</label>
                  <div className="input-box">
                    <i><FaLock /></i>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="8+ characters"
                      value={password}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPassword(val);
                        setPwdInfo(evaluatePassword(val));
                        if (confirmPassword && val !== confirmPassword) {
                          setError("Passwords do not match.");
                        } else if (error && error.startsWith("Passwords do not match")) {
                          setError("");
                        }
                      }}
                      style={{ paddingLeft: "35px" }}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Confirm Password Group */}
                <div className="input-group">
                  <label className="input-label">Confirm Password</label>
                  <div className="input-box">
                    <i><FaLock /></i>
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => {
                        const val = e.target.value;
                        setConfirmPassword(val);
                        if (password && val && password !== val) {
                          setError("Passwords do not match.");
                        } else if (error && error.startsWith("Passwords do not match")) {
                          setError("");
                        }
                      }}
                      style={{ paddingLeft: "35px" }}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              {/* Password policy checklist */}
              <div style={{ marginTop: 12, fontSize: 13, color: '#444', lineHeight: 1.45 }}>
                <div style={{ marginBottom: 4 }}>Password must contain:</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {[
                    { key: 'length', label: 'At least 8 characters' },
                    { key: 'upper', label: 'One uppercase letter (A-Z)' },
                    { key: 'lower', label: 'One lowercase letter (a-z)' },
                    { key: 'digit', label: 'One number (0-9)' },
                    { key: 'noSpace', label: 'No spaces' },
                  ].map((rule) => (
                    <li key={rule.key}>
                      <span style={{ color: pwdInfo[rule.key] ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {pwdInfo[rule.key] ? '✓' : '✗'}
                      </span>
                      <span style={{ marginLeft: 8 }}>{rule.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="show-password">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  style={{ paddingLeft: "35px" }}
                  disabled={loading}
                />
                <label htmlFor="showPassword"> Show Password</label>
              </div>

              <div className="button">
                <input
                  type="button"
                  value={loading ? "Registering..." : "Register"}
                  onClick={handleRegister}
                  disabled={loading}
                />
              </div>

              <p className="sign-up-text">
                Already have an account? <Link to="/login">Login now</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}