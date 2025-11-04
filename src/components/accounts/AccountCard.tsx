import React from 'react';
import { Edit, Archive, MoreVertical } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { formatCurrency } from '@/utils/formatters';
import { ACCOUNT_TYPES, ACCOUNT_COLORS, ACCOUNT_ICONS } from '@/constants/accounts';
import type { Account } from '@/types/accounts';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
}

const IconBox: React.FC<{
  icon: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ icon, className = '', style }) => (
  <div className={`flex items-center justify-center w-16 h-16 rounded-2xl ${className}`} style={style}>
    {icon}
  </div>
);

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete
}) => {
  const accountType = ACCOUNT_TYPES[account.type];
  const accountColor = ACCOUNT_COLORS[account.color];
  const IconComponent = ACCOUNT_ICONS[account.icon] || ACCOUNT_ICONS['checking'];

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200 h-full">
      {/* Header - IconBox + Menu Dropdown */}
      <div className="flex items-start justify-between mb-4">
        <IconBox
          icon={<IconComponent size={32} className="text-white" />}
          style={{ backgroundColor: accountColor }}
        />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(account)}>
              <Edit size={16} className="mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(account.id)} className="text-red-600">
              <Archive size={16} className="mr-2" />
              Arquivar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Título */}
      <h3 className="text-lg font-semibold mb-1">{account.name}</h3>
      
      {/* Subtítulo - Tipo • Banco */}
      <p className="text-sm text-gray-500 mb-4">
        {accountType}{account.bank ? ` • ${account.bank}` : account.type === 'cash' ? ' • Outro' : ''}
      </p>

      {/* Label Saldo Atual */}
      <p className="text-sm text-gray-500 mb-1">Saldo Atual</p>
      
      {/* Valor em destaque */}
      <p className="text-2xl font-bold mb-4">{formatCurrency(account.balance)}</p>

      {/* Badge Ativa */}
      {account.is_active && (
        <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
          Ativa
        </Badge>
      )}
    </Card>
  );
};