import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, Sun, Moon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  getUserInitials,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from '@/utils/profileIdentity';

interface HeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, icon, actions }: HeaderProps) {
  const { user, profile, signOut } = useAuth();
  const { userSettings, setTheme: persistTheme } = useSettings();
  const { resolvedTheme, setTheme: applyTheme } = useTheme();
  const navigate = useNavigate();

  const handleThemeToggle = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    void persistTheme(nextTheme, { showSuccessToast: false });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const resolvedDisplayName = resolveUserDisplayName(profile, userSettings, user);
  const resolvedAvatarUrl = resolveUserAvatarUrl(profile, userSettings);
  const avatarSrc = resolvedAvatarUrl || undefined;

  return (
    <header
      role="banner"
      className="sticky top-0 z-20 border-b border-border bg-surface/95 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur supports-[backdrop-filter]:bg-surface/85"
    >
      {/* Row 1: icon + title + (desktop) actions + theme toggle + avatar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 lg:gap-4 lg:px-6 lg:py-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm lg:h-11 lg:w-11">
              {icon}
            </div>
          )}

          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-foreground lg:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p
                data-testid="header-subtitle-desktop"
                className="mt-1 hidden text-sm text-muted-foreground lg:block"
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2 lg:gap-3">
          {actions ? <div className="hidden items-center gap-3 lg:flex">{actions}</div> : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl border border-border/70 bg-surface-elevated/80 text-muted-foreground shadow-sm hover:bg-surface-overlay hover:text-foreground"
            onClick={handleThemeToggle}
            aria-label={
              resolvedTheme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'
            }
            title={
              resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'
            }
          >
            {resolvedTheme === 'dark' ? (
              <Sun size={20} className="text-current" />
            ) : (
              <Moon size={20} className="text-current" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-11 w-11 rounded-full border border-border/70 bg-surface-elevated/80 p-0 shadow-sm hover:bg-surface-overlay"
                aria-label="Abrir menu do usuario"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarSrc} alt="Avatar" />
                  <AvatarFallback className="border border-primary/20 bg-primary/15 text-primary">
                    {getUserInitials(resolvedDisplayName, user?.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="px-3 py-2 text-left normal-case tracking-normal">
                <div className="flex min-w-0 flex-col space-y-1">
                  <p className="truncate text-sm font-medium leading-none text-foreground">
                    {resolvedDisplayName}
                  </p>
                  <p
                    className="truncate text-[11px] leading-none lowercase text-muted-foreground"
                    title={user?.email}
                  >
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/perfil')}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/configuracoes')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-danger focus:bg-danger-subtle focus:text-danger data-[highlighted]:bg-danger-subtle data-[highlighted]:text-danger"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Row 2: mobile-only — subtitle + actions */}
      {(subtitle || actions) && (
        <div
          data-testid="header-row2"
          className="flex items-center gap-2 border-t border-border/60 px-4 py-2 lg:hidden"
        >
          {subtitle ? (
            <p
              data-testid="header-subtitle-mobile"
              className="flex-1 truncate text-xs text-muted-foreground lg:hidden"
            >
              {subtitle}
            </p>
          ) : (
            <span className="flex-1" />
          )}
          {actions ? (
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap">
              {actions}
            </div>
          ) : null}
        </div>
      )}
    </header>
  );
}
