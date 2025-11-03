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
}

export function StatCard({
  title,
  value,
  icon,
  gradient,
  badge,
  trend,
  subtitle,
  onClick,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'p-6 cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl relative overflow-hidden group',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />

      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <IconBox icon={icon} gradient={gradient} size="md" />
      </div>

      {(badge || trend) && (
        <div className="flex items-center space-x-2">
          {badge && <Badge variant={badge.variant}>{badge.text}</Badge>}
          {trend && (
            <div
              className={cn(
                'flex items-center space-x-1 text-sm font-medium',
                trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.direction === 'up' ? (
                <TrendingUp size={16} />
              ) : (
                <TrendingDown size={16} />
              )}
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
