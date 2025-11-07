// src/pages/Signup.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaEnvelope, FaLock, FaUser, FaCalendarAlt } from "react-icons/fa";
import signupImg from "../assets/signupImg.jpg";
import "../styles/signup.css";

import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, setDoc, runTransaction } from "firebase/firestore";

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

    if (!email.trim()) return "Email is required.";
    if (!emailRegex.test(email)) return "Please enter a valid email address.";

    if (!password) return "Password is required.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (/\s/.test(password)) return "Password must not contain spaces.";

    if (!confirmPassword) return "Please confirm your password.";
    if (password !== confirmPassword) return "Passwords do not match.";

    return "";
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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
        email,
        createdAt: new Date().toISOString(),
        authUID: user.uid,
        numericId: newUserId,
      };
      await setDoc(numericDocRef, userObj);

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
        })
      );

      alert(`✅ Account created successfully! (User #${newUserId})`);
      navigate("/dashboard");
    } catch (err) {
      console.error("❌ Firebase Signup Error:", err);
      let errorMessage = "An error occurred. Please try again.";

      if (err.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered.";
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

              {/* Two-column fields */}
              <div className="form-grid two-column">
                <div className="input-box">
                  <i><FaUser /></i>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="input-box">
                  <i><FaUser /></i>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="input-box">
                  <i><FaUser /></i>
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="input-box">
                  <i><FaCalendarAlt /></i>
                  <input
                    type="date"
                    placeholder="Birthday"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Single-row email */}
              <div className="form-grid one-column">
                <div className="input-box">
                  <i><FaEnvelope /></i>
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Two-column password fields */}
              <div className="form-grid two-column">
                <div className="input-box">
                  <i><FaLock /></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <div className="input-box">
                  <i><FaLock /></i>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="show-password">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
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
  );
}
