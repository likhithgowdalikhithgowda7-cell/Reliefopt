import React from 'react';
import { PackageOpen, Plus } from 'lucide-react';

export default function EmptyState({
  icon = <PackageOpen size={42} strokeWidth={1.5} />,
  title = 'No records found',
  description = 'No database entries are currently registered.',
  actionLabel,
  onAction,
}) {
  return (
    <div className="empty-state-box">
      <div className="empty-state-icon">{icon}</div>
      <h4 className="empty-state-title">{title}</h4>
      <p className="empty-state-desc">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );
}
