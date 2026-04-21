import { cn } from '@/lib/cn';

export interface SlidingPillTab {
  value: string;
  label: string;
}

interface SlidingPillTabsProps {
  tabs: SlidingPillTab[];
  value: string;
  onValueChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}

export function SlidingPillTabs({
  tabs,
  value,
  onValueChange,
  ariaLabel,
  className,
}: SlidingPillTabsProps) {
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.value === value));
  const pillWidth = `calc((100% - ${(tabs.length + 1) * 0.25}rem) / ${tabs.length})`;
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'relative inline-flex w-full rounded-full border border-border/70 bg-card/95 p-1 shadow-[0_2px_8px_rgba(0,0,0,0.06)]',
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-full bg-primary shadow-sm transition-transform duration-300 ease-out"
        style={{
          width: pillWidth,
          transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 0.25}rem))`,
        }}
      />
      {tabs.map((tab) => {
        const isActive = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              'relative z-10 flex flex-1 items-center justify-center rounded-full px-3 py-2 text-sm font-semibold transition-colors',
              isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
