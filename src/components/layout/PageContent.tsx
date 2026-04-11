import type { HTMLAttributes } from 'react';

import { cn } from '@/lib/cn';

export function PageContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-testid="app-page-content"
      className={cn('relative w-full px-6 lg:px-8', className)}
      {...props}
    />
  );
}
