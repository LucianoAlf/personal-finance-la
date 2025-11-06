import * as React from 'react';
import { cn } from '@/lib/cn';

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

function Badge({ className, variant = 'default', style, onClick, children }: BadgeProps) {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
    danger: 'bg-danger text-danger-foreground',
    info: 'bg-info text-info-foreground',
    outline: 'text-foreground border border-input',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        variants[variant],
        className
      )}
      style={style}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export { Badge };
