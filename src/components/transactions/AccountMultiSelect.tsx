import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAccounts } from '@/hooks/useAccounts';
import { ACCOUNT_TYPES } from '@/constants/accounts';
import { getBankLogo, detectBankFromName, getBankColor } from '@/constants/bankLogos';

interface AccountMultiSelectProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function AccountMultiSelect({
  selectedIds,
  onSelectionChange,
}: AccountMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const { accounts } = useAccounts();

  const toggleAccount = (accountId: string) => {
    if (selectedIds.includes(accountId)) {
      onSelectionChange(selectedIds.filter(id => id !== accountId));
    } else {
      onSelectionChange([...selectedIds, accountId]);
    }
  };

  const selectedCount = selectedIds.length;
  const displayText = selectedCount === 0 
    ? 'Todas as contas' 
    : selectedCount === 1 
    ? accounts.find(a => a.id === selectedIds[0])?.name || '1 selecionada'
    : `${selectedCount} selecionadas`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal"
        >
          <span className={cn(selectedCount === 0 && "text-gray-500")}>
            {displayText}
          </span>
          <span className="text-gray-400">▼</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="max-h-[300px] overflow-y-auto p-2">
          {accounts.map((account) => {
            const isSelected = selectedIds.includes(account.id);
            const bankCode = detectBankFromName(account.name);
            const BankIcon = getBankLogo(bankCode);
            const bankColor = bankCode ? getBankColor(bankCode) : account.color;
            
            return (
              <button
                key={account.id}
                onClick={() => toggleAccount(account.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-gray-100 transition-colors",
                  isSelected && "bg-purple-50"
                )}
              >
                {/* Logo do banco */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: bankColor }}
                >
                  <BankIcon size={20} />
                </div>
                
                {/* Info da conta */}
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900">
                    {account.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {ACCOUNT_TYPES[account.type]}
                  </div>
                </div>
                
                {/* Badge Open Finance (se aplicável) */}
                {(account as any).is_open_finance && (
                  <Badge 
                    className="bg-blue-50 text-blue-600 text-xs border-blue-200"
                  >
                    Open Finance
                  </Badge>
                )}
                
                {/* Check */}
                {isSelected && (
                  <Check size={16} className="text-purple-600" />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
