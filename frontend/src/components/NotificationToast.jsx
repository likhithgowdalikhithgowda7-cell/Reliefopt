import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';

export default function NotificationToast({ notification, onClose }) {
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      onClose();
    }, 4500);
    return () => clearTimeout(timer);
  }, [notification, onClose]);

  if (!notification) return null;

  const { type, message } = notification;

  return (
    <div className={`toast-notification toast-${type}`} role="alert">
      <div className="toast-icon">
        {type === 'success' && <CheckCircle2 size={18} />}
        {type === 'warning' && <AlertTriangle size={18} />}
        {type === 'error' && <AlertCircle size={18} />}
      </div>
      <div className="toast-message">{message}</div>
      <button onClick={onClose} className="toast-close-btn" aria-label="Dismiss notification">
        <X size={16} />
      </button>
    </div>
  );
}
