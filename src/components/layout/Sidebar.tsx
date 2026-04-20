import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { useUIStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { usePayableBills } from '@/hooks/usePayableBills';
import { useSettings } from '@/hooks/useSettings';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  Plus,
  Menu,
  X,
  Bot,
  MoreHorizontal,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getUserInitials,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from '@/utils/profileIdentity';
import {
  primaryMenuItems,
  moreMenuItems,
  quickCreateItems,
  type QuickCreateAction,
} from '@/config/navigation';

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, setSidebarOpen, setAnaCoachOpen, openQuickCreate } = useUIStore();
  const { profile, user } = useAuth();
  const { userSettings } = useSettings();
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const resolvedDisplayName = resolveUserDisplayName(profile, userSettings, user);
  const resolvedAvatarUrl = resolveUserAvatarUrl(profile, userSettings);
  const avatarSrc = resolvedAvatarUrl || undefined;

  const handleQuickCreate = (action: QuickCreateAction) => {
    openQuickCreate(action);

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="contents lg:contents max-lg:hidden">
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-border bg-surface/95 text-foreground shadow-[inset_-1px_0_0_rgba(255,255,255,0.03),0_18px_50px_rgba(3,8,20,0.32)] backdrop-blur supports-[backdrop-filter]:bg-surface/92 transition-all duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-6">
          <div className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-primary/20 bg-primary/12 text-primary shadow-sm">
              <Wallet size={18} className="text-current" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Finance LA</h1>
          </div>
          <button
            onClick={toggleSidebar}
            className="rounded-xl border border-border bg-surface-elevated p-2 text-muted-foreground transition-colors hover:bg-surface-overlay hover:text-foreground lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full rounded-xl border border-primary/25 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
                <Plus size={20} className="mr-2" />
                Novo
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="bottom" className="w-60">
              <DropdownMenuLabel>Acoes rapidas</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {quickCreateItems.map((item) => {
                const Icon = item.icon;

                return (
                  <DropdownMenuItem
                    key={item.action}
                    onSelect={() => handleQuickCreate(item.action)}
                    className="gap-3 py-2.5"
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {primaryMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'mb-1 flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-200',
                  isActive
                    ? 'bg-surface-elevated text-foreground shadow-sm ring-1 ring-primary/20'
                    : 'text-muted-foreground hover:bg-surface-elevated/80 hover:text-foreground',
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={20} className={cn(isActive ? 'text-primary' : 'text-current')} />
                  <span className={cn(isActive ? 'font-semibold' : undefined)}>{item.label}</span>
                </div>
                {item.path === '/contas-pagar' && location.pathname !== '/contas-pagar' ? (
                  <PayableBillsAlertBadge />
                ) : null}
              </Link>
            );
          })}

          <div className="mt-2">
            <button
              onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
              className={cn(
                'mb-1 flex w-full items-center justify-between rounded-xl px-4 py-3 transition-all duration-200',
                moreOptionsOpen || moreMenuItems.some(item => location.pathname === item.path)
                  ? 'bg-surface-elevated text-foreground shadow-sm ring-1 ring-primary/15'
                  : 'text-muted-foreground hover:bg-surface-elevated/80 hover:text-foreground',
              )}
            >
              <div className="flex items-center space-x-3">
                <MoreHorizontal size={20} className="text-current" />
                <span>Mais opções</span>
              </div>
              <ChevronDown
                size={16}
                className={cn(
                  'transition-transform duration-200',
                  moreOptionsOpen && 'rotate-180',
                )}
              />
            </button>

            {moreOptionsOpen ? (
              <div className="ml-4 space-y-1 border-l border-border/70 pl-3">
                {moreMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center space-x-3 rounded-xl px-4 py-2.5 transition-all duration-200',
                        isActive
                          ? 'bg-surface-elevated text-foreground shadow-sm ring-1 ring-primary/15'
                          : 'text-muted-foreground hover:bg-surface-elevated/70 hover:text-foreground',
                      )}
                    >
                      <Icon size={18} className={cn(isActive ? 'text-primary' : 'text-current')} />
                      <span className={cn('text-sm', isActive ? 'font-medium' : undefined)}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="mt-auto border-t border-border p-4">
          <div className="flex items-center space-x-3 rounded-2xl border border-border/70 bg-surface-elevated/70 px-4 py-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={avatarSrc} alt="Avatar" />
              <AvatarFallback className="border border-primary/20 bg-primary/15 text-primary">
                {getUserInitials(resolvedDisplayName, user?.email)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {resolvedDisplayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <button
        onClick={() => setAnaCoachOpen(true)}
        className="fixed bottom-6 right-6 z-30 flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-2xl shadow-primary/20 transition-all hover:scale-105 hover:bg-primary/90"
      >
        <Bot size={28} className="text-current" />
      </button>
    </div>
  );
}

function PayableBillsAlertBadge() {
  const { summary } = usePayableBills({ status: ['pending', 'overdue'] });

  if (summary.overdue_count <= 0) {
    return null;
  }

  return (
    <Badge variant="danger" className="ml-auto">
      {summary.overdue_count}
    </Badge>
  );
}
