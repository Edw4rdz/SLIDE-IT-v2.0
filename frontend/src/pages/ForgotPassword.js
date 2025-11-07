import React, { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebase";
import "../styles/login.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(
        "If an account with that email exists, a password reset link has been sent. Check your inbox." 
      );
    } catch (err) {
      console.error("Error sending password reset email:", err);
      // Provide a generic message to avoid leaking which emails exist
      setError(
        "Unable to send reset email. Please try again later or contact support."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container" style={{ maxWidth: 520 }}>
        <div className="login-left" style={{ padding: 30 }}>
          <h2 className="title">Forgot Password</h2>
          <p className="subtitle">Enter your account email and we'll send a reset link.</p>

          <form onSubmit={handleSubmit}>
            <div className="input-box">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={{ paddingLeft: 12 }}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? "Sending..." : "Send reset email"}
            </button>

            {message && (
              <p style={{ color: "green", marginTop: 12 }}>{message}</p>
            )}
            {error && (
              <p style={{ color: "#c0392b", marginTop: 12 }}>{error}</p>
            )}

            <p className="signup-text" style={{ marginTop: 16 }}>
              Remembered your password? <a href="/login">Back to login</a>
            </p>
          </form>
        </div>

        <div className="login-right" style={{ display: "none" }} />
      </div>
    </div>
  );
}
