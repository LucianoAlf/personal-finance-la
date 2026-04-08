import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IconBox } from '@/components/shared/IconBox';
import { cn } from '@/lib/cn';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'pink';
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info';
  };
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
  subtitle?: string;
  onClick?: () => void;
  loading?: boolean;
}

const accentStyles = {
  blue: {
    line: 'via-sky-300/80',
    glow: 'bg-sky-400/15',
    iconRing: 'ring-sky-300/25',
  },
  green: {
    line: 'via-emerald-300/80',
    glow: 'bg-emerald-400/15',
    iconRing: 'ring-emerald-300/25',
  },
  red: {
    line: 'via-rose-300/80',
    glow: 'bg-rose-400/15',
    iconRing: 'ring-rose-300/25',
  },
  orange: {
    line: 'via-amber-300/80',
    glow: 'bg-amber-400/15',
    iconRing: 'ring-amber-300/25',
  },
  purple: {
    line: 'via-primary/80',
    glow: 'bg-primary/15',
    iconRing: 'ring-primary/25',
  },
  pink: {
    line: 'via-fuchsia-300/80',
    glow: 'bg-fuchsia-400/15',
    iconRing: 'ring-fuchsia-300/25',
  },
} as const;

export function StatCard({
  title,
  value,
  icon,
  gradient,
  badge,
  trend,
  subtitle,
  onClick,
  loading = false,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'group relative overflow-hidden rounded-[1.75rem] border-border/70 bg-surface/92 p-6 transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/25 hover:bg-surface-elevated/90 hover:shadow-[0_24px_50px_rgba(3,8,20,0.28)]',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-80 transition-transform duration-300 group-hover:scale-x-105',
          accentStyles[gradient].line
        )}
      />
      <div
        className={cn(
          'absolute -right-12 top-4 h-24 w-24 rounded-full blur-3xl transition-opacity duration-300 group-hover:opacity-100',
          accentStyles[gradient].glow
        )}
      />

      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <p className="mb-1 text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="h-7 w-28 animate-pulse rounded-full bg-surface-elevated" />
          ) : (
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
          )}
          {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <IconBox
          icon={icon}
          gradient={gradient}
          size="md"
          className={cn('ring-1 shadow-[0_18px_28px_rgba(5,10,24,0.28)]', accentStyles[gradient].iconRing)}
        />
      </div>

      {(badge || trend) && (
        <div className="flex items-center space-x-2 border-t border-border/60 pt-3">
          {badge ? <Badge variant={badge.variant}>{badge.text}</Badge> : null}
          {trend ? (
            <div
              className={cn(
                'flex items-center space-x-1 text-sm font-medium',
                trend.direction === 'up' ? 'text-success' : 'text-danger'
              )}
            >
              {trend.direction === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{trend.value}</span>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}
