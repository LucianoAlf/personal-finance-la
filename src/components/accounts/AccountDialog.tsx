import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

import { ACCOUNT_TYPES, ACCOUNT_ICONS, COLOR_OPTIONS, ACCOUNT_COLORS } from '@/constants/accounts';
import type { Account, AccountType } from '@/types/accounts';

interface AccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account?: Account;
  onSave: (account: AccountFormData) => void;
}

const accountSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  type: z.enum(['checking', 'savings', 'cash', 'investment', 'credit_card'] as const),
  bank_name: z.string().optional(),
  initial_balance: z.number().min(0, 'Saldo inicial deve ser maior ou igual a 0'),
  color: z.string(),
  icon: z.string(),
  is_shared: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type AccountFormData = z.infer<typeof accountSchema>;

export const AccountDialog: React.FC<AccountDialogProps> = ({
  open,
  onOpenChange,
  account,
  onSave
}) => {
  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      type: 'checking',
      bank_name: '',
      initial_balance: 0,
      color: '#3b82f6', // Azul padrão
      icon: 'checking',
      is_shared: false,
      is_active: true,
    },
  });

  // Resetar formulário quando account mudar (modo edição)
  useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        type: account.type,
        bank_name: account.bank_name || '',
        initial_balance: account.current_balance, // carregar saldo total atual
        color: account.color?.startsWith('#')
          ? account.color
          : (ACCOUNT_COLORS as any)[account.color] ?? '#3b82f6',
        icon: account.icon,
        is_shared: account.is_shared,
        is_active: account.is_active,
      });
    } else {
      form.reset({
        name: '',
        type: 'checking',
        bank_name: '',
        initial_balance: 0,
        color: '#3b82f6', // Azul padrão
        icon: 'checking',
        is_shared: false,
        is_active: true,
      });
    }
  }, [account, form]);

  const onSubmit = (data: AccountFormData) => {
    onSave(data);
    form.reset();
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {account ? 'Editar Conta' : 'Nova Conta'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Conta</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Conta Corrente Nubank" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tipo */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Conta</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ACCOUNT_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Banco */}
            <FormField
              control={form.control}
              name="bank_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Nubank, Itaú, Bradesco..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Saldo Total */}
            <FormField
              control={form.control}
              name="initial_balance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Saldo Total</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">R$</span>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="pl-8"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const rawValue = e.target.value;

                          if (rawValue === '') {
                            field.onChange(undefined);
                            return;
                          }

                          field.onChange(parseFloat(rawValue));
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cor */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma cor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COLOR_OPTIONS.map((option) => (
                        <SelectItem key={option.key} value={option.color}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-4 h-4 rounded-full" 
                              style={{ backgroundColor: option.color }}
                            />
                            {option.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Ícone */}
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ícone</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um ícone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ACCOUNT_ICONS).map(([key, IconComponent]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <IconComponent size={16} />
                            {ACCOUNT_TYPES[key as keyof typeof ACCOUNT_TYPES]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Botões */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                {account ? 'Atualizar' : 'Criar'} Conta
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};