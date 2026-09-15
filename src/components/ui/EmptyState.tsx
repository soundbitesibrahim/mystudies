import React from 'react';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'spark', title, text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="empty enter-fade">
      <span className="empty__icon">
        <Icon name={icon} size={20} />
      </span>
      <p className="empty__title">{title}</p>
      <p className="empty__text">{text}</p>
      {actionLabel && onAction && (
        <Button variant="primary" icon="plus" className="empty__action" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
