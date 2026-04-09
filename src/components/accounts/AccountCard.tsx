import React from 'react';
import { Edit, Trash2, MoreVertical, Archive, List, DollarSign } from 'lucide-react';

import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  <div className={`flex h-14 w-14 items-center justify-center rounded-[1.1rem] ${className}`} style={style}>
    {icon}
  </div>
);

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onArchive,
  onViewTransactions,
  onAdjustBalance,
  onDelete,
}) => {
  const accountType = ACCOUNT_TYPES[account.type];
  const shouldUseBankBranding =
    account.type === 'checking' || account.type === 'savings' || account.type === 'credit_card';

  const bankCode = shouldUseBankBranding ? detectBankFromName(account.name) : null;
  const accountColor = bankCode
    ? getBankColor(bankCode)
    : typeof account.color === 'string' && account.color.startsWith('#')
      ? account.color
      : (ACCOUNT_COLORS as Record<string, string>)[String(account.color)] ?? '#3b82f6';
  const IconComponent = bankCode
    ? getBankLogo(bankCode)
    : ACCOUNT_ICONS[account.icon] || ACCOUNT_ICONS.checking;

  return (
    <Card className="group relative h-full min-h-[300px] overflow-hidden rounded-[28px] border border-border/70 bg-card/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)] dark:shadow-[0_22px_55px_rgba(2,6,23,0.28)] dark:hover:shadow-[0_28px_65px_rgba(2,6,23,0.38)]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-20 opacity-90"
        style={{
          background: `radial-gradient(circle at top left, ${accountColor}22 0%, transparent 68%)`,
        }}
      />

      <div className="relative flex h-full flex-col">
        <div className="mb-6 flex items-start justify-between">
          <IconBox
            icon={<IconComponent size={28} className="text-white" />}
            className="shadow-[0_14px_28px_rgba(15,23,42,0.18)]"
            style={{ backgroundColor: accountColor }}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 rounded-xl border border-border/70 bg-surface-elevated/80 p-0 text-muted-foreground shadow-sm hover:bg-surface-overlay hover:text-foreground"
              >
                <MoreVertical size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(account)}>
                <Edit size={16} className="mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onArchive(account.id)}>
                <Archive size={16} className="mr-2" />
                Arquivar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewTransactions(account.id)}>
                <List size={16} className="mr-2" />
                Transações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAdjustBalance(account)}>
                <DollarSign size={16} className="mr-2" />
                Reajuste de saldo
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(account.id)}
                className="text-danger focus:text-danger data-[highlighted]:text-danger"
              >
                <Trash2 size={16} className="mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="text-[1.65rem] font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          {account.name}
        </h3>

        <p className="mb-6 text-sm text-muted-foreground">
          {accountType}
          {account.bank_name ? ` • ${account.bank_name}` : account.type === 'cash' ? ' • Outro' : ''}
        </p>

        <p className="mb-1 text-sm font-medium text-muted-foreground">Saldo Atual</p>

        <p className="mb-6 text-[1.75rem] font-semibold leading-tight tracking-tight text-foreground [font-variant-numeric:tabular-nums] sm:text-[1.9rem]">
          {formatCurrency(account.current_balance)}
        </p>

        {account.is_active && (
          <Badge variant="success" className="mt-auto w-fit px-3 py-1 text-xs font-semibold">
            Ativa
          </Badge>
        )}
      </div>
    </Card>
  );
};
