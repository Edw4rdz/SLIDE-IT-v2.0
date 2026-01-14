import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "../firebase";
import { notify } from "../utils/notify";
import { FaLock } from "react-icons/fa";
import "../styles/login.css"; // Reuse login styles

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [email, setEmail] = useState(""); // Extracted from code if possible
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Get the action code from the URL
  const actionCode = searchParams.get('oobCode');

  // Password policy state
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

  useEffect(() => {
    if (!actionCode) {
      setError("Invalid password reset link.");
      setVerifying(false);
      return;
    }

    // Verify the password reset code is valid.
    verifyPasswordResetCode(auth, actionCode)
      .then((email) => {
        setEmail(email);
        setVerifying(false);
      })
      .catch((err) => {
        console.error("Invalid code:", err);
        setError("This reset link is invalid or has expired.");
        setVerifying(false);
      });
  }, [actionCode]);

  const handleReset = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    const info = evaluatePassword(password);
    if (!info.length) return setError("Password must be at least 8 characters.");
    if (!info.upper) return setError("Password must include at least one uppercase letter.");
    if (!info.lower) return setError("Password must include at least one lowercase letter.");
    if (!info.digit) return setError("Password must include at least one number.");
    if (!info.noSpace) return setError("Password must not contain spaces.");
    
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, actionCode, password);
      notify("Password has been reset successfully!", "success");
      navigate("/login");
    } catch (err) {
      console.error("Reset failed:", err);
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (verifying) return <div className="login-page"><div className="login-container" style={{padding: 40}}>Verifying link...</div></div>;
  if (error && !email) return <div className="login-page"><div className="login-container" style={{padding: 40, color: 'red'}}>{error} <br/><Link to="/forgot-password">Try again</Link></div></div>;

  return (
    <div className="login-page">
      <div className="login-container" style={{ maxWidth: 520 }}>
        <div className="login-left" style={{ padding: 30 }}>
          <h2 className="title">Reset Password</h2>
          <p className="subtitle">Set a new password for {email}</p>

          <form onSubmit={handleReset}>
            {/* Password */}
            <div className="input-group" style={{ marginBottom: 15 }}>
              <div className="input-box">
                <i><FaLock /></i>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={password}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPassword(val);
                    setPwdInfo(evaluatePassword(val));
                    setError("");
                  }}
                  style={{ paddingLeft: "35px" }}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="input-group" style={{ marginBottom: 15 }}>
              <div className="input-box">
                <i><FaLock /></i>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  style={{ paddingLeft: "35px" }}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Checklist */}
            <div style={{ marginBottom: 20, fontSize: 13, color: '#444', lineHeight: 1.45 }}>
              <div style={{ marginBottom: 4, fontWeight: 'bold' }}>Requirements:</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4 }}>
                {[
                  { key: 'length', label: '8+ chars' },
                  { key: 'upper', label: 'One uppercase' },
                  { key: 'lower', label: 'One lowercase' },
                  { key: 'digit', label: 'One number' },
                  { key: 'noSpace', label: 'No spaces' },
                ].map((rule) => (
                  <li key={rule.key}>
                    <span style={{ color: pwdInfo[rule.key] ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {pwdInfo[rule.key] ? '✓' : '✗'}
                    </span>
                    <span style={{ marginLeft: 6 }}>{rule.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {error && <p style={{ color: "#c0392b", marginBottom: 15 }}>{error}</p>}

            <div className="show-password" style={{ marginBottom: 20 }}>
              <input
                type="checkbox"
                id="showPassword"
                checked={showPassword}
                onChange={() => setShowPassword(!showPassword)}
              />
              <label htmlFor="showPassword"> Show Password</label>
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        </div>
        <div className="login-right" style={{ display: "none" }} />
      </div>
    </div>
  );
}