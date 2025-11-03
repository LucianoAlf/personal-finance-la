import { LucideIcon } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/badge';
import { mockCategories } from '@/utils/mockData';
import { 
  ShoppingCart, 
  Car, 
  Home, 
  UtensilsCrossed, 
  Heart, 
  PartyPopper, 
  Wallet, 
  Briefcase,
  Key,
  Shield,
  Laptop,
  Plane,
  PiggyBank,
  Landmark,
  CreditCard,
  Play
} from 'lucide-react';

interface TransactionItemProps {
  type: 'income' | 'expense' | 'transfer';
  description: string;
  category_id: string;
  date: Date;
  amount: number;
  is_paid?: boolean;
  is_recurring?: boolean;
  onClick?: () => void;
}

// Mapeamento de ícones string para componentes Lucide
const iconMap: Record<string, React.ComponentType<any>> = {
  'ShoppingCart': ShoppingCart,
  'Car': Car,
  'Home': Home,
  'UtensilsCrossed': UtensilsCrossed,
  'Heart': Heart,
  'PartyPopper': PartyPopper,
  'Wallet': Wallet,
  'Briefcase': Briefcase,
  'Key': Key,
  'Shield': Shield,
  'Laptop': Laptop,
  'Plane': Plane,
  'PiggyBank': PiggyBank,
  'Landmark': Landmark,
  'CreditCard': CreditCard,
  'Play': Play,
};

export function TransactionItem({
  type,
  description,
  category_id,
  date,
  amount,
  is_paid = true,
  is_recurring,
  onClick,
}: TransactionItemProps) {
  const category = mockCategories.find((c) => c.id === category_id);
  const IconComponent = category?.icon ? iconMap[category.icon] : Wallet;

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-lg border-l-4 hover:translate-x-1 transition-all duration-200 cursor-pointer bg-white hover:shadow-md',
        type === 'income' ? 'border-green-500' : 'border-red-500'
      )}
      onClick={onClick}
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div
          className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
            type === 'income' ? 'bg-green-100' : 'bg-red-100'
          )}
        >
          {IconComponent ? (
            <IconComponent 
              size={20} 
              className={cn(
                type === 'income' ? 'text-green-600' : 'text-red-600'
              )} 
            />
          ) : (
            <span className="text-lg">{category?.icon || '💰'}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{description}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-sm text-gray-600 truncate">{category?.name || 'Sem categoria'}</p>
            {is_recurring && (
              <Badge variant="info" className="text-xs whitespace-nowrap">
                Recorrente
              </Badge>
            )}
            {!is_paid && (
              <Badge variant="warning" className="text-xs whitespace-nowrap">
                Pendente
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="text-right flex-shrink-0 ml-4">
        <p
          className={cn(
            'font-bold text-lg',
            type === 'income' ? 'text-green-600' : 'text-red-600'
          )}
        >
          {type === 'income' ? '+' : '-'} {formatCurrency(amount)}
        </p>
        <p className="text-sm text-gray-500">{formatDate(date, 'dd/MM')}</p>
      </div>
    </div>
  );
}
