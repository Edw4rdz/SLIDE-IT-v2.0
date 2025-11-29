import React, { useState } from "react";
import "../styles/ai-provider-modal.css";

const PROVIDERS = [
  { value: "openai", label: "Grok AI (default)" },
  { value: "gemini", label: "Gemini" }
];

export default function AIProviderModal({ isOpen, onSelect, onCancel }) {
  const [selectedProvider, setSelectedProvider] = useState("openai");

  if (!isOpen) return null;

  return (
    <div className="ai-provider-modal-overlay">
      <div className="ai-provider-modal-content">
        <h2>Select AI Provider</h2>
        <div className="ai-provider-options">
          {PROVIDERS.map((provider) => (
            <label key={provider.value} className="ai-provider-option">
              <input
                type="radio"
                name="ai-provider"
                value={provider.value}
                checked={selectedProvider === provider.value}
                onChange={() => setSelectedProvider(provider.value)}
              />
              {provider.label}
            </label>
          ))}
        </div>
        <div className="ai-provider-modal-actions">
          <button onClick={() => onSelect(selectedProvider)}>Continue</button>
          <button onClick={onCancel} style={{ marginLeft: 8 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
