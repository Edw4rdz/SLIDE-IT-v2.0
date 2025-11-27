import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEnvelope, FaShieldAlt, FaClock } from "react-icons/fa";
import "../styles/verify-otp.css";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email and userName from navigation state
  const email = location.state?.email || "";
  const userName = location.state?.userName || "User";
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      navigate("/signup");
    }
  }, [email, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Enable resend button after 60 seconds
  useEffect(() => {
    const resendTimer = setTimeout(() => {
      setCanResend(true);
    }, 60000); // 1 minute

    return () => clearTimeout(resendTimer);
  }, []);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle OTP input change
  const handleChange = (element, index) => {
    if (isNaN(element.value)) return;

    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);

    // Focus next input
    if (element.value && index < 5) {
      document.getElementById(`otp-input-${index + 1}`).focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        document.getElementById(`otp-input-${index - 1}`).focus();
      }
      const newOtp = [...otp];
      newOtp[index] = "";
      setOtp(newOtp);
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    // Focus last filled input or next empty
    const focusIndex = Math.min(pastedData.length, 5);
    document.getElementById(`otp-input-${focusIndex}`).focus();
  };

  // Verify OTP
  const handleVerify = async () => {
    const otpCode = otp.join("");
    
    if (otpCode.length !== 6) {
      setError("Please enter the complete 6-digit OTP");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("http://localhost:5000/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpCode }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => {
          navigate("/login", { state: { emailVerified: true } });
        }, 2000);
      } else {
        setError(data.message || "Invalid OTP. Please try again.");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setError("Failed to verify OTP. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setResendLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("http://localhost:5000/api/otp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, userName }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("OTP resent successfully! Check your email.");
        setTimeLeft(600); // Reset timer to 10 minutes
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]); // Clear OTP inputs
        
        // Re-enable resend after 1 minute
        setTimeout(() => {
          setCanResend(true);
        }, 60000);
      } else {
        setError(data.message || "Failed to resend OTP.");
      }
    } catch (err) {
      console.error("Error resending OTP:", err);
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="verify-otp-container">
      <div className="verify-otp-card">
        <div className="otp-icon-wrapper">
          <FaShieldAlt className="otp-shield-icon" />
        </div>
        
        <h1 className="otp-title">Verify Your Email</h1>
        <p className="otp-subtitle">
          <FaEnvelope className="inline-icon" /> We've sent a 6-digit code to
        </p>
        <p className="otp-email">{email}</p>

        {/* Timer */}
        <div className="otp-timer">
          <FaClock className="timer-icon" />
          <span>Code expires in: {formatTime(timeLeft)}</span>
        </div>

        {/* Error/Success Messages */}
        {error && <div className="otp-error">{error}</div>}
        {success && <div className="otp-success">{success}</div>}

        {/* OTP Input Fields */}
        <div className="otp-inputs">
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-input-${index}`}
              type="text"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(e.target, index)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              onPaste={index === 0 ? handlePaste : undefined}
              className="otp-input-box"
              disabled={loading}
            />
          ))}
        </div>

        {/* Verify Button */}
        <button
          onClick={handleVerify}
          disabled={loading || otp.join("").length !== 6}
          className="otp-verify-btn"
        >
          {loading ? "Verifying..." : "Verify Email"}
        </button>

        {/* Resend OTP */}
        <div className="otp-resend-section">
          <p>Didn't receive the code?</p>
          <button
            onClick={handleResend}
            disabled={!canResend || resendLoading}
            className="otp-resend-btn"
          >
            {resendLoading ? "Sending..." : "Resend OTP"}
          </button>
        </div>

        {/* Back to Signup */}
        <button
          onClick={() => navigate("/signup")}
          className="otp-back-btn"
        >
          ← Back to Signup
        </button>
      </div>
    </div>
  );
}
