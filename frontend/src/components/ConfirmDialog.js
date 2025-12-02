import React from "react";

export default function ConfirmDialog({ open, title = "Confirm", message, confirmText = "Confirm", cancelText = "Cancel", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="modal-content" style={{ background: '#fff', borderRadius: 12, padding: 20, width: 360, boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ color: '#444' }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onCancel} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#f7f7f7' }}>{cancelText}</button>
          <button onClick={onConfirm} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff' }}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
