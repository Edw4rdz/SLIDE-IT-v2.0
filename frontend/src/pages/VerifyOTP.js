import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaEnvelope, FaShieldAlt, FaClock, FaCheckCircle, FaArrowLeft, FaLock, FaKey, FaUserShield } from "react-icons/fa";
import "../styles/verify-otp.css";

export default function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get email and userName from navigation state
  const email = location.state?.email || "";
  const userName = location.state?.userName || "User";
  const userId = location.state?.userId || null;
  
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const inputRefs = useRef([]);

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
    setError(""); // Clear error on input

    // Focus next input
    if (element.value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace
  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
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
    setError("");

    // Focus last filled input or next empty
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
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
        body: JSON.stringify({ email, otp: otpCode, userId }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => {
          navigate("/login", { state: { emailVerified: true } });
        }, 2000);
      } else {
        setError(data.message || "Invalid OTP. Please try again.");
        // Clear OTP on error
        setOtp(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
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
        inputRefs.current[0]?.focus();
        
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
      {/* Animated Background Elements */}
      <div className="bg-animation">
        <div className="bg-circle bg-circle-1"></div>
        <div className="bg-circle bg-circle-2"></div>
        <div className="bg-circle bg-circle-3"></div>
        <div className="bg-circle bg-circle-4"></div>
        <div className="bg-circle bg-circle-5"></div>
      </div>

      {/* Grid Pattern Overlay */}
      <div className="grid-overlay"></div>

      {/* Split Layout */}
      <div className="otp-layout">
        {/* Left Side - Form */}
        <div className="otp-form-section">
          <button
            onClick={() => navigate("/signup")}
            className="otp-back-button"
            aria-label="Back to signup"
          >
            <FaArrowLeft />
            <span>Back</span>
          </button>

          <div className="verify-otp-card">
            {/* Icon Section */}
            <div className="otp-icon-section">
              <div className="otp-icon-wrapper">
                <FaShieldAlt className="otp-shield-icon" />
                <div className="icon-glow"></div>
              </div>
            </div>
            
            {/* Header Section */}
            <div className="otp-header">
              <h1 className="otp-title">Verify Your Email</h1>
              <p className="otp-description">
                We've sent a verification code to your email address. Please enter the 6-digit code below.
              </p>
            </div>

            {/* Email Display */}
            <div className="otp-email-section">
              <FaEnvelope className="email-icon" />
              <span className="otp-email-text">{email}</span>
            </div>

            {/* Timer Section */}
            <div className={`otp-timer-wrapper ${timeLeft < 60 ? 'timer-warning' : ''}`}>
              <div className="otp-timer">
                <FaClock className="timer-icon" />
                <div className="timer-content">
                  <span className="timer-label">Code expires in</span>
                  <span className="timer-value">{formatTime(timeLeft)}</span>
                </div>
              </div>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="otp-message otp-error-message">
                <span className="message-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="otp-message otp-success-message">
                <FaCheckCircle className="message-icon" />
                <span>{success}</span>
              </div>
            )}

            {/* OTP Input Fields */}
            <div className="otp-inputs-wrapper">
              <label className="otp-input-label">Enter Verification Code</label>
              <div className="otp-inputs">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    id={`otp-input-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength="1"
                    value={digit}
                    onChange={(e) => handleChange(e.target, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`otp-input-box ${digit ? 'otp-input-filled' : ''} ${error ? 'otp-input-error' : ''}`}
                    disabled={loading}
                    autoComplete="off"
                    aria-label={`OTP digit ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Verify Button */}
            <button
              onClick={handleVerify}
              disabled={loading || otp.join("").length !== 6}
              className="otp-verify-btn"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  <span>Verify Email</span>
                </>
              )}
            </button>

            {/* Resend OTP Section */}
            <div className="otp-resend-section">
              <div className="resend-divider">
                <span>or</span>
              </div>
              <p className="resend-text">Didn't receive the code?</p>
              <button
                onClick={handleResend}
                disabled={!canResend || resendLoading}
                className="otp-resend-btn"
              >
                {resendLoading ? (
                  <>
                    <span className="spinner-small"></span>
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <FaEnvelope />
                    <span>Resend OTP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side - Visual Content */}
        <div className="otp-visual-section">
          <div className="visual-content">
            <div className="visual-icon-wrapper">
              <FaLock className="visual-icon visual-icon-1" />
            </div>
            <div className="visual-icon-wrapper">
              <FaKey className="visual-icon visual-icon-2" />
            </div>
            <div className="visual-icon-wrapper">
              <FaUserShield className="visual-icon visual-icon-3" />
            </div>
            <div className="visual-text">
              <h2>Secure Verification</h2>
              <p>Your account security is our priority</p>
            </div>
            <div className="floating-shapes">
              <div className="shape shape-1"></div>
              <div className="shape shape-2"></div>
              <div className="shape shape-3"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
