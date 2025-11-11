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
  Home,
  Wallet,
  List,
  CreditCard,
  Receipt,
  Calendar,
  Target,
  TrendingUp,
  BarChart3,
  GraduationCap,
  Settings,
  Plus,
  Menu,
  X,
  HelpCircle,
  Bot,
  MoreHorizontal,
  Tag,
  FolderTree,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Wallet, label: 'Contas', path: '/contas' },
  { icon: List, label: 'Transações', path: '/transacoes' },
  { icon: CreditCard, label: 'Cartões', path: '/cartoes' },
  { icon: Receipt, label: 'Contas a Pagar', path: '/contas-pagar' },
  { icon: Target, label: 'Metas', path: '/metas' },
  { icon: TrendingUp, label: 'Investimentos', path: '/investimentos' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: GraduationCap, label: 'Educação', path: '/educacao' },
];

const moreOptionsItems = [
  { icon: Tag, label: 'Tags', path: '/tags' },
  { icon: FolderTree, label: 'Categorias', path: '/categorias' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export function Sidebar() {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar, setAnaCoachOpen } = useUIStore();
  const { profile, user } = useAuth();
  const { userSettings } = useSettings();
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  
  // Buscar alertas de contas a pagar
  const { summary } = usePayableBills({ status: ['pending', 'overdue'] });

  const getInitials = (name: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transition-all duration-300 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 w-64'
        )}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Wallet size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance LA</h1>
          </div>
          <button onClick={toggleSidebar} className="lg:hidden">
            <X size={24} />
          </button>
        </div>

        {/* New Button */}
        <div className="p-4">
          <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-md">
            <Plus size={20} className="mr-2" />
            Novo
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            // Badge de alertas para Contas a Pagar
            const alertCount = item.path === '/contas-pagar' 
              ? summary.overdue_count 
              : 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center justify-between px-4 py-3 rounded-lg mb-1 transition-all duration-200',
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary dark:text-primary-400 font-semibold'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <div className="flex items-center space-x-3">
                  <Icon size={20} />
                  <span>{item.label}</span>
                </div>
                {alertCount > 0 && (
                  <Badge variant="danger" className="ml-auto">
                    {alertCount}
                  </Badge>
                )}
              </Link>
            );
          })}

          {/* Mais opções (dropdown) */}
          <div className="mt-2">
            <button
              onClick={() => setMoreOptionsOpen(!moreOptionsOpen)}
              className={cn(
                'flex items-center justify-between w-full px-4 py-3 rounded-lg mb-1 transition-all duration-200',
                moreOptionsOpen || moreOptionsItems.some(item => location.pathname === item.path)
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <div className="flex items-center space-x-3">
                <MoreHorizontal size={20} />
                <span>Mais opções</span>
              </div>
              <ChevronDown 
                size={16} 
                className={cn(
                  'transition-transform duration-200',
                  moreOptionsOpen && 'rotate-180'
                )}
              />
            </button>

            {/* Submenu */}
            {moreOptionsOpen && (
              <div className="ml-4 space-y-1">
                {moreOptionsItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center space-x-3 px-4 py-2 rounded-lg transition-all duration-200',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary dark:text-primary-400 font-semibold'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      )}
                    >
                      <Icon size={18} />
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Footer com perfil */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 mt-auto">
          <div className="flex items-center space-x-3 px-4 py-3">
            <Avatar className="h-10 w-10">
              <AvatarImage 
                key={userSettings?.avatar_url || 'no-avatar'}
                src={userSettings?.avatar_url ? `${userSettings.avatar_url}?v=${encodeURIComponent(userSettings.updated_at || '')}` : (profile?.avatar_url || undefined)} 
                alt="Avatar"
              />
              <AvatarFallback className="bg-purple-600 text-white">
                {getInitials(userSettings?.display_name || profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {userSettings?.display_name || profile?.full_name || 'Carregando...'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {user?.email}
              </p>
            </div>
          </div>
          <button className="flex items-center space-x-3 px-4 py-3 w-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors mt-3">
            <HelpCircle size={20} />
            <span>Ajuda</span>
          </button>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-30 lg:hidden bg-white p-2 rounded-lg shadow-md"
      >
        <Menu size={24} />
      </button>

      {/* Ana Clara Floating Button */}
      <button
        onClick={() => setAnaCoachOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full shadow-lg flex items-center justify-center z-30 hover:scale-110 transition-transform"
      >
        <Bot size={28} className="text-white" />
      </button>
    </>
  );
}
