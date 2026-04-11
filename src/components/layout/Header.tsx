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

  const handleLogout = async () => {
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
    <header className="sticky top-0 z-20 border-b border-border bg-surface/95 px-6 py-6 text-foreground shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary shadow-sm">
              {icon}
            </div>
          )}

          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {actions ? <div className="flex items-center gap-3">{actions}</div> : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-xl border border-border/70 bg-surface-elevated/80 text-muted-foreground shadow-sm hover:bg-surface-overlay hover:text-foreground"
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
                onClick={handleLogout}
                className="text-danger focus:bg-danger-subtle focus:text-danger data-[highlighted]:bg-danger-subtle data-[highlighted]:text-danger"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
