import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/cn';

interface InsightCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  variant: 'success' | 'warning' | 'info' | 'danger';
  onClick?: () => void;
}

const variantStyles = {
  success: {
    border: 'border-l-4 border-green-500',
    iconColor: 'text-green-500',
    bgHover: 'hover:bg-green-50',
  },
  warning: {
    border: 'border-l-4 border-orange-500',
    iconColor: 'text-orange-500',
    bgHover: 'hover:bg-orange-50',
  },
  info: {
    border: 'border-l-4 border-blue-500',
    iconColor: 'text-blue-500',
    bgHover: 'hover:bg-blue-50',
  },
  danger: {
    border: 'border-l-4 border-red-500',
    iconColor: 'text-red-500',
    bgHover: 'hover:bg-red-50',
  },
};

export function InsightCard({ title, description, icon: Icon, variant, onClick }: InsightCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card
      className={cn(
        styles.border,
        styles.bgHover,
        'transition-all duration-200 cursor-pointer hover:shadow-md',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <Icon className={cn(styles.iconColor, 'flex-shrink-0')} size={24} />
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
