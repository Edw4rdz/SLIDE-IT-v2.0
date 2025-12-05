import React, { useState } from "react";
import axios from "axios";
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
      const API_BASE = process.env.REACT_APP_BACKEND_URL 
        ? `${process.env.REACT_APP_BACKEND_URL.replace(/\/$/, '')}/api`
        : "http://localhost:5000/api";

      const response = await axios.post(`${API_BASE}/password-reset/send`, {
        email: email.toLowerCase()
      });

      if (response.data.success) {
        setMessage("Password reset email sent successfully! Check your inbox and spam folder.");
      } else {
        setError(response.data.error || "Failed to send reset email.");
      }
    } catch (err) {
      console.error("Error sending password reset email:", err);
      
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.status === 404) {
        setError("No account exists with that email address.");
      } else if (err.message.includes("Network Error")) {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError("Unable to send reset email. Please try again later.");
      }
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
