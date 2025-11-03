import { useAuthStore } from '@/store/authStore';
import { Bell, ChevronDown } from 'lucide-react';
import { getInitials } from '@/utils/formatters';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { user } = useAuthStore();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>

        <div className="flex items-center space-x-4">
          {/* Actions */}
          {actions && <div className="flex items-center space-x-2">{actions}</div>}

          {/* Notifications */}
          <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell size={20} className="text-gray-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
          </button>

          {/* User Menu */}
          <div className="flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user ? getInitials(user.name) : 'US'}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-600">{user?.email}</p>
            </div>
            <ChevronDown size={16} className="text-gray-600" />
          </div>
        </div>
      </div>
    </header>
  );
}
