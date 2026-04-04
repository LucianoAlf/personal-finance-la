import React from 'react';
import { Edit, Trash2, MoreVertical, Archive, List, DollarSign } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { formatCurrency } from '@/utils/formatters';
import { ACCOUNT_TYPES, ACCOUNT_COLORS, ACCOUNT_ICONS } from '@/constants/accounts';
import { getBankLogo, detectBankFromName, getBankColor } from '@/constants/bankLogos';
import type { Account } from '@/types/accounts';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onArchive: (id: string) => void;
  onViewTransactions: (accountId: string) => void;
  onAdjustBalance: (account: Account) => void;
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
  onArchive,
  onViewTransactions,
  onAdjustBalance,
  onDelete
}) => {
  const accountType = ACCOUNT_TYPES[account.type];
  
  const shouldUseBankBranding = account.type === 'checking' || account.type === 'savings' || account.type === 'credit_card';

  // Detectar banco pelo nome da conta apenas para tipos bancarios/cartao
  const bankCode = shouldUseBankBranding ? detectBankFromName(account.name) : null;
  
  // Usar cor do banco se detectado, senão usar cor da conta
  const accountColor = bankCode 
    ? getBankColor(bankCode)
    : (typeof account.color === 'string' && account.color.startsWith('#'))
      ? account.color
      : (ACCOUNT_COLORS as any)[account.color] ?? '#3b82f6';
  
  // Usar logo do banco se detectado, senão usar ícone padrão
  const IconComponent = bankCode 
    ? getBankLogo(bankCode)
    : ACCOUNT_ICONS[account.icon] || ACCOUNT_ICONS['checking'];
  
  const handleEditClick = () => {
    onEdit(account);
  };
  
  const handleArchiveClick = () => {
    onArchive(account.id);
  };
  
  const handleViewTransactionsClick = () => {
    onViewTransactions(account.id);
  };
  
  const handleAdjustBalanceClick = () => {
    onAdjustBalance(account);
  };
  
  const handleDeleteClick = () => {
    onDelete(account.id);
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200 h-full relative">
      {/* Header - IconBox + Menu Dropdown */}
      <div className="flex items-start justify-between mb-4">
        <IconBox
          icon={<IconComponent size={32} className="text-white" />}
          style={{ backgroundColor: accountColor }}
        />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
            >
              <MoreVertical size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEditClick}>
              <Edit size={16} className="mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleArchiveClick}>
              <Archive size={16} className="mr-2" />
              Arquivar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleViewTransactionsClick}>
              <List size={16} className="mr-2" />
              Transações
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAdjustBalanceClick}>
              <DollarSign size={16} className="mr-2" />
              Reajuste de saldo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
              <Trash2 size={16} className="mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Título */}
      <h3 className="text-lg font-semibold mb-1">{account.name}</h3>
      
      {/* Subtítulo - Tipo • Banco */}
      <p className="text-sm text-gray-500 mb-4">
        {accountType}{account.bank_name ? ` • ${account.bank_name}` : account.type === 'cash' ? ' • Outro' : ''}
      </p>

      {/* Label Saldo Atual */}
      <p className="text-sm text-gray-500 mb-1">Saldo Atual</p>
      
      {/* Valor em destaque */}
      <p className="text-2xl font-bold mb-4">{formatCurrency(account.current_balance)}</p>

      {/* Badge Ativa */}
      {account.is_active && (
        <Badge className="bg-emerald-500 text-white hover:bg-emerald-500">
          Ativa
        </Badge>
      )}
    </Card>
  );
};