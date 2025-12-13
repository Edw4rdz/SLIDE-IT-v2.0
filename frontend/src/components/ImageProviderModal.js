import React, { useState } from "react";
import "../styles/ai-provider-modal.css";

const PROVIDERS = [
  { 
    value: "pollinations", 
    label: "Pollinations", 
    desc: "Fast AI for generating images.",
  },
  { 
    value: "imagen", 
    label: "Google Imagen", 
    desc: "Generate higher-quality images.",
  }
];

export default function ImageProviderModal({ isOpen, onSelect, onCancel }) {
  const [selectedProvider, setSelectedProvider] = useState("pollinations");

  if (!isOpen) return null;

  return (
    <div className="ai-provider-modal-overlay">
      <div className="ai-provider-modal-content">
        <div className="ai-provider-modal-header">
          <h2 className="ai-provider-modal-title">Select Image Model</h2>
          <p className="ai-provider-modal-subtitle">
            Select an AI model that will generate images for your presentation slides.
          </p>
        </div>

        <div className="ai-provider-options">
          {PROVIDERS.map((provider) => (
            <label 
              key={provider.value} 
              className={`ai-provider-option ${selectedProvider === provider.value ? 'selected' : ''}`}
            >
              <div className="ai-provider-radio">
                <input
                  type="radio"
                  name="image-provider"
                  value={provider.value}
                  checked={selectedProvider === provider.value}
                  onChange={() => setSelectedProvider(provider.value)}
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