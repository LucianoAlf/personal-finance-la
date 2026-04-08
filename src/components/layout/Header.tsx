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
  const avatarSrc = resolvedAvatarUrl
    ? `${resolvedAvatarUrl}?v=${encodeURIComponent(userSettings?.updated_at || '')}`
    : undefined;

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-8 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Ícone da página */}
          {icon && (
            <div className="text-gray-700 dark:text-gray-300 opacity-80">
              {icon}
            </div>
          )}

          {/* Título e subtitle */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Actions */}
          {actions && <div className="flex items-center space-x-4">{actions}</div>}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-lg"
            onClick={handleThemeToggle}
            aria-label={
              resolvedTheme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'
            }
            title={
              resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'
            }
          >
            {resolvedTheme === 'dark' ? (
              <Sun size={20} className="text-gray-600 dark:text-gray-300" />
            ) : (
              <Moon size={20} className="text-gray-600 dark:text-gray-400" />
            )}
          </Button>

          {/* Menu do Usuário */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
                aria-label="Abrir menu do usuario"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    key={avatarSrc || 'no-avatar'}
                    src={avatarSrc}
                    alt="Avatar"
                  />
                  <AvatarFallback className="bg-purple-600 text-white">
                    {getUserInitials(resolvedDisplayName, user?.email)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {resolvedDisplayName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
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
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
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
