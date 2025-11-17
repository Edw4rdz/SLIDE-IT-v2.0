import React, { useState } from "react";
import "../styles/roleModal.css";

const ROLES = [
  { value: "student", label: "Student", icon: "🎓" },
  { value: "educator", label: "Educator/Faculty", icon: "👨‍🏫" },
  { value: "professional", label: "Professional", icon: "💼" },
  { value: "other", label: "Other", icon: "✨" },
];

export default function RoleSelectionModal({ isOpen, onSubmit, onSkip }) {
  const [selectedRole, setSelectedRole] = useState("");
  const [otherText, setOtherText] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!selectedRole) {
      setError("Please select a role");
      return;
    }

    if (selectedRole === "other" && !otherText.trim()) {
      setError("Please describe your role");
      return;
    }

    const roleData = {
      role: selectedRole,
      roleDescription: selectedRole === "other" ? otherText.trim() : null,
    };

    onSubmit(roleData);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="role-modal-overlay">
      <div className="role-modal-content">
        <div className="role-modal-header">
          <h2>Welcome to SLIDE-IT! 👋</h2>
          <p>Help us personalize your experience by telling us about yourself</p>
        </div>

        <form onSubmit={handleSubmit} className="role-modal-form">
          <div className="role-options">
            {ROLES.map((role) => (
              <button
                key={role.value}
                type="button"
                className={`role-option ${selectedRole === role.value ? "selected" : ""}`}
                onClick={() => {
                  setSelectedRole(role.value);
                  setError("");
                  if (role.value !== "other") {
                    setOtherText("");
                  }
                }}
              >
                <span className="role-icon">{role.icon}</span>
                <span className="role-label">{role.label}</span>
              </button>
            ))}
          </div>

          {selectedRole === "other" && (
            <div className="other-input-group">
              <label htmlFor="otherRole">Please describe your role:</label>
              <input
                type="text"
                id="otherRole"
                value={otherText}
                onChange={(e) => {
                  setOtherText(e.target.value);
                  setError("");
                }}
                placeholder="e.g., Freelancer, Researcher, Entrepreneur..."
                maxLength={50}
              />
            </div>
          )}

          {error && <p className="role-error">{error}</p>}

          <div className="role-modal-actions">
            {onSkip && (
              <button
                type="button"
                className="role-btn-skip"
                onClick={handleSkip}
              >
                Skip for now
              </button>
            )}
            <button
              type="submit"
              className="role-btn-submit"
              disabled={!selectedRole}
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
