import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

interface IconBoxProps {
  icon: LucideIcon;
  gradient?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'pink';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function IconBox({ icon: Icon, gradient = 'purple', size = 'md', className }: IconBoxProps) {
  const gradients = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    pink: 'from-pink-500 to-pink-600',
  };

  const sizes = {
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-16 h-16',
  };

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 28,
  };

  return (
    <div
      className={cn(
        'rounded-xl bg-gradient-to-br flex items-center justify-center shadow-md',
        gradients[gradient],
        sizes[size],
        className
      )}
    >
      <Icon size={iconSizes[size]} className="text-white" />
    </div>
  );
}
