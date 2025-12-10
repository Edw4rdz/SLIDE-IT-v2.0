import React, { useState } from "react";
import "../styles/ai-provider-modal.css";

const PROVIDERS = [
  { 
    value: "gemini", 
    label: "Gemini", 
    desc: "Fast and reliable AI for presentation content",
    badge: "Free",
    badgeClass: "free"
  },
  { 
    value: "grok", 
    label: "Grok AI", 
    desc: "Premium AI",
    badge: "Premium",
    badgeClass: "premium",
    disabled: false
  }
];

export default function AIProviderModal({ isOpen, onSelect, onCancel }) {
  const [selectedProvider, setSelectedProvider] = useState("gemini");

  if (!isOpen) return null;

  return (
    <div className="ai-provider-modal-overlay">
      <div className="ai-provider-modal-content">
        <div className="ai-provider-modal-header">
          <h2 className="ai-provider-modal-title">Select AI Provider</h2>
          <p className="ai-provider-modal-subtitle">
            Choose the AI model to generate your presentation content
          </p>
        </div>

        <div className="ai-provider-options">
          {PROVIDERS.map((provider) => (
            <label 
              key={provider.value} 
              className={`ai-provider-option ${selectedProvider === provider.value ? 'selected' : ''} ${provider.disabled ? 'disabled' : ''}`}
            >
              <div className="ai-provider-radio">
                <input
                  type="radio"
                  name="ai-provider"
                  value={provider.value}
                  checked={selectedProvider === provider.value}
                  onChange={() => !provider.disabled && setSelectedProvider(provider.value)}
                  disabled={provider.disabled}
                />
              </div>
              <div className="ai-provider-option-content">
                <div className="ai-provider-option-label">
                  {provider.label}
                  <span className={`ai-provider-badge ${provider.badgeClass}`}>
                    {provider.badge}
                  </span>
                </div>
                <div className="ai-provider-option-desc">{provider.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <div className="ai-provider-modal-actions">
          <button className="ai-provider-btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="ai-provider-btn primary" onClick={() => onSelect(selectedProvider)}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
