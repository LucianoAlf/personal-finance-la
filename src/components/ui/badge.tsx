import * as React from 'react';
import { cn } from '@/lib/cn';

export interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'destructive' | 'info' | 'outline' | 'secondary';
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

function Badge({ className, variant = 'default', style, onClick, children }: BadgeProps) {
  const variants = {
    default: 'border border-primary/20 bg-primary/10 text-primary',
    secondary: 'border border-border bg-surface-elevated text-foreground',
    success: 'border border-success-border bg-success-subtle text-success',
    warning: 'border border-warning-border bg-warning-subtle text-warning',
    danger: 'border border-danger-border bg-danger-subtle text-danger',
    destructive: 'border border-danger-border bg-danger-subtle text-danger',
    info: 'border border-primary/20 bg-primary/10 text-primary',
    outline: 'border border-border bg-transparent text-foreground',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
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
