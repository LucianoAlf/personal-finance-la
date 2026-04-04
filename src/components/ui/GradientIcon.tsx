import * as React from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface GradientIconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  colors?: [string, string];
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses: Record<NonNullable<GradientIconProps['size']>, string> = {
  sm: 'h-10 w-10',
  md: 'h-14 w-14',
  lg: 'h-16 w-16',
};

export function GradientIcon({ icon: Icon, colors = ['#8b5cf6', '#7c3aed'], size = 'md', className, ...props }: GradientIconProps) {
  return (
    <div
      className={cn('rounded-xl flex items-center justify-center shadow-sm', sizeClasses[size], className)}
      style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
      {...props}
    >
      <Icon className="h-6 w-6 text-white" />
    </div>
  );
}
