'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, RefreshCw } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useCategoryRules } from '@/hooks/useCategoryRules';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/formatters';
import { toast } from 'sonner';
import { BILL_CATEGORIES, getBillCategoryById } from '@/constants/bill-categories';
import { useCategories } from '@/hooks/useCategories';

// Mapeamento de BILL_CATEGORIES.id para nome da categoria no banco de dados
// Os nomes aqui correspondem EXATAMENTE aos nomes na tabela `categories`
const BILL_CATEGORY_TO_DB_MAPPING: Record<string, string> = {
  'subscription': 'Assinaturas',
  'service': 'Serviços (Água, Luz, Gás)',
  'housing': 'Moradia',
  'telecom': 'Telecomunicações',
  'healthcare': 'Saúde',
  'education': 'Educação',
  'food': 'Alimentação',
  'tax': 'Impostos e Taxas',
  'insurance': 'Seguros',
  'loan': 'Empréstimos',
  'installment': 'Parcelamentos',
  'credit_card': 'Cartão de Crédito',
  'other': 'Outros',
};

interface MerchantGroup {
  merchant: string;
  count: number;
  totalAmount: number;
  currentCategoryId: string | null;
  currentCategoryName: string;
  currentCategoryIcon: string;
  transactionIds: string[];
}

interface ReassignCategoriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
  cardName: string;
}

export function ReassignCategoriesDialog({
  open,
  onOpenChange,
  cardId,
  cardName,
}: ReassignCategoriesDialogProps) {
  const { user } = useAuth();
  const { createBulkRules } = useCategoryRules();
  const { categories } = useCategories();
  
  const [merchantGroups, setMerchantGroups] = useState<MerchantGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMerchants, setSelectedMerchants] = useState<Set<string>>(new Set());
  const [newCategoryId, setNewCategoryId] = useState<string>('');
  const [createRule, setCreateRule] = useState(false);
  const [applying, setApplying] = useState(false);

  // Buscar transações agrupadas por estabelecimento
  const fetchMerchantGroups = async () => {
    if (!user || !cardId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('credit_card_transactions')
        .select(`
          id,
          description,
          amount,
          category_id,
          categories:category_id (
            id,
            name,
            icon
          )
        `)
        .eq('user_id', user.id)
        .eq('credit_card_id', cardId)
        .order('description');

      if (error) throw error;

      // Agrupar por descrição (estabelecimento)
      const groups = new Map<string, MerchantGroup>();

      data?.forEach((tx: any) => {
        const merchant = tx.description || 'Sem descrição';
        const existing = groups.get(merchant);

        if (existing) {
          existing.count++;
          existing.totalAmount += tx.amount || 0;
          existing.transactionIds.push(tx.id);
        } else {
          groups.set(merchant, {
            merchant,
            count: 1,
            totalAmount: tx.amount || 0,
            currentCategoryId: tx.category_id,
            currentCategoryName: tx.categories?.name || 'Sem categoria',
            currentCategoryIcon: tx.categories?.icon || '📦',
            transactionIds: [tx.id],
          });
        }
      });

      // Ordenar por quantidade de transações (mais frequentes primeiro)
      const sortedGroups = Array.from(groups.values()).sort(
        (a, b) => b.count - a.count
      );

      setMerchantGroups(sortedGroups);
    } catch (err) {
      console.error('Erro ao buscar transações:', err);
      toast.error('Erro ao carregar transações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && cardId) {
      fetchMerchantGroups();
      setSelectedMerchants(new Set());
      setNewCategoryId('');
      setSearchTerm('');
      setCreateRule(false);
    }
  }, [open, cardId]);

  // Filtrar por busca
  const filteredGroups = merchantGroups.filter((group) =>
    group.merchant.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle seleção de estabelecimento
  const toggleMerchant = (merchant: string) => {
    const newSelected = new Set(selectedMerchants);
    if (newSelected.has(merchant)) {
      newSelected.delete(merchant);
    } else {
      newSelected.add(merchant);
    }
    setSelectedMerchants(newSelected);
  };

  // Selecionar todos
  const selectAll = () => {
    const allMerchants = new Set(filteredGroups.map((g) => g.merchant));
    setSelectedMerchants(allMerchants);
  };

  // Limpar seleção
  const clearSelection = () => {
    setSelectedMerchants(new Set());
  };

  // Contar transações selecionadas
  const selectedTransactionCount = filteredGroups
    .filter((g) => selectedMerchants.has(g.merchant))
    .reduce((sum, g) => sum + g.count, 0);

  // Aplicar recategorização
  const handleApply = async () => {
    if (!newCategoryId || selectedMerchants.size === 0) {
      toast.error('Selecione estabelecimentos e uma nova categoria');
      return;
    }

    try {
      setApplying(true);
      // Mapear billCategoryId para category_id do banco
      const dbCategoryId = getBillCategoryDbId(newCategoryId);
      if (!dbCategoryId) {
        toast.error('Categoria não encontrada no banco de dados');
        return;
      }

      // Coletar todos os IDs de transações selecionadas
      const transactionIds: string[] = [];
      const merchantPatterns: string[] = [];
      
      filteredGroups
        .filter((g) => selectedMerchants.has(g.merchant))
        .forEach((g) => {
          transactionIds.push(...g.transactionIds);
          merchantPatterns.push(g.merchant);
        });

      // Atualizar em lote
      const { error } = await supabase
        .from('credit_card_transactions')
        .update({ category_id: dbCategoryId })
        .in('id', transactionIds);

      if (error) throw error;

      // Criar regras automáticas se checkbox marcado
      if (createRule && merchantPatterns.length > 0) {
        const ruleSuccess = await createBulkRules(merchantPatterns, dbCategoryId);
        if (ruleSuccess) {
          toast.success(
            `${transactionIds.length} transações recategorizadas + ${merchantPatterns.length} regras criadas!`
          );
        } else {
          toast.success(
            `${transactionIds.length} transações recategorizadas! (Erro ao criar regras)`
          );
        }
      } else {
        toast.success(
          `${transactionIds.length} transações recategorizadas com sucesso!`
        );
      }

      // Recarregar dados
      await fetchMerchantGroups();
      setSelectedMerchants(new Set());
      setNewCategoryId('');
      setCreateRule(false);
    } catch (err) {
      console.error('Erro ao recategorizar:', err);
      toast.error('Erro ao recategorizar transações');
    } finally {
      setApplying(false);
    }
  };

  // Função para obter ícone da categoria
  const getCategoryIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  // Função para mapear billCategoryId para category_id do banco
  const getBillCategoryDbId = (billCategoryId: string): string | null => {
    const billCategoryName = BILL_CATEGORY_TO_DB_MAPPING[billCategoryId];
    if (!billCategoryName) return null;
    
    const dbCategory = categories.find(
      (cat) => cat.name === billCategoryName && cat.type === 'expense'
    );
    return dbCategory?.id || null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Reassociar Categorias - {cardName}
          </DialogTitle>
          <DialogDescription>
            Selecione estabelecimentos para alterar a categoria de suas transações em lote.
          </DialogDescription>
        </DialogHeader>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar estabelecimento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Ações em lote */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Selecionar todos
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Limpar
            </Button>
          </div>
          {selectedMerchants.size > 0 && (
            <Badge variant="outline">
              {selectedMerchants.size} grupos ({selectedTransactionCount} transações)
            </Badge>
          )}
        </div>

        {/* Lista de estabelecimentos */}
        <ScrollArea className="flex-1 min-h-[200px] max-h-[300px] border rounded-md">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              Nenhuma transação encontrada
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredGroups.map((group) => (
                <div
                  key={group.merchant}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedMerchants.has(group.merchant)
                      ? 'bg-primary/10 border border-primary/30'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => toggleMerchant(group.merchant)}
                >
                  <Checkbox
                    checked={selectedMerchants.has(group.merchant)}
                    onCheckedChange={() => toggleMerchant(group.merchant)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.merchant}</p>
                    <p className="text-sm text-muted-foreground">
                      {group.count} transações • {formatCurrency(group.totalAmount)}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {group.currentCategoryIcon} {group.currentCategoryName}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Seletor de nova categoria */}
        {selectedMerchants.size > 0 && (
          <div className="space-y-3 pt-2 border-t">
            <div className="space-y-2">
              <Label>Nova categoria para as transações selecionadas:</Label>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria..." />
                </SelectTrigger>
                <SelectContent>
                  {BILL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        {getCategoryIcon(cat.icon)}
                        <span>{cat.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Checkbox para criar regra automática */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="createRule"
                checked={createRule}
                onCheckedChange={(checked) => setCreateRule(checked === true)}
              />
              <Label htmlFor="createRule" className="text-sm font-normal cursor-pointer">
                Criar regra automática para futuras transações
              </Label>
            </div>
            {createRule && (
              <p className="text-xs text-muted-foreground ml-6">
                Novas transações desses estabelecimentos serão categorizadas automaticamente.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedMerchants.size === 0 || !newCategoryId || applying}
          >
            {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aplicar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
