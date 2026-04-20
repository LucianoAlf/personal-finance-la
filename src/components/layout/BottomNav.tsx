import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { bottomNavItems } from '@/config/navigation';
import { useUIStore } from '@/store/uiStore';
import { usePayableBills } from '@/hooks/usePayableBills';

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { anaCoachOpen, moreSheetOpen, setAnaCoachOpen, setMoreSheetOpen } = useUIStore();
  const { summary } = usePayableBills({ status: ['pending', 'overdue'] });
  const overdueCount = summary?.overdue_count ?? 0;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:hidden"
    >
      {bottomNavItems.map((item, index) => {
        const Icon = item.icon;
        let isActive = false;
        let onClick: (() => void) | undefined;
        const label = item.label;
        let ariaLabel = item.label;
        let badge: React.ReactNode = null;

        if (item.kind === 'route') {
          isActive = location.pathname === item.path && !anaCoachOpen && !moreSheetOpen;
          onClick = () => {
            setAnaCoachOpen(false);
            setMoreSheetOpen(false);
            navigate(item.path);
          };
          if (
            item.path === '/contas-pagar' &&
            overdueCount > 0 &&
            location.pathname !== '/contas-pagar'
          ) {
            badge = (
              <span
                aria-label={`${overdueCount} contas vencidas`}
                className="absolute -top-0.5 right-3 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
              >
                {overdueCount}
              </span>
            );
          }
        } else if (item.kind === 'ana-clara') {
          isActive = anaCoachOpen;
          onClick = () => {
            setMoreSheetOpen(false);
            setAnaCoachOpen(true);
          };
          ariaLabel = 'Ana Clara';
        } else {
          // 'more'
          isActive = moreSheetOpen;
          onClick = () => {
            setAnaCoachOpen(false);
            setMoreSheetOpen(true);
          };
          ariaLabel = 'Mais opções';
        }

        return (
          <button
            key={`${item.kind}-${index}`}
            type="button"
            onClick={onClick}
            aria-current={isActive ? 'page' : undefined}
            aria-label={ariaLabel}
            className={cn(
              'relative flex min-h-12 flex-col items-center justify-center gap-1 px-2 text-[11px] transition-colors',
              isActive ? 'font-semibold text-primary' : 'text-muted-foreground',
            )}
          >
            <span className="relative">
              <Icon size={22} aria-hidden="true" />
              {badge}
            </span>
            <span className="leading-none">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
