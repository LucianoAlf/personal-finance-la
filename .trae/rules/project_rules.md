# Project Rules - Personal Finance LA

## Propósito
Este documento define as regras e boas práticas de desenvolvimento para o projeto Personal Finance LA MVP. Todas as implementações devem seguir estritamente estas diretrizes.

---

## 1. Stack Tecnológico Obrigatório

### Frontend
- **Framework:** React 18+ com TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS v3.4+
- **UI Components:** shadcn/ui
- **Icons:** Lucide React (OBRIGATÓRIO - sem emojis)
- **Charts:** Recharts
- **Forms:** React Hook Form + Zod
- **State:** Zustand
- **Routing:** React Router v6
- **Dates:** date-fns

### Backend
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Realtime:** Supabase Realtime
- **Automation:** N8N Webhooks

---

## 2. Regras de Iconografia

### CRÍTICO: Sem Emojis

```tsx
// NUNCA FAZER
<div>🏠 Dashboard</div>
<button>💰 Nova Receita</button>
<span>🎯 Meta</span>

// SEMPRE FAZER
import { Home, Wallet, Target } from 'lucide-react';

<div><Home size={20} /> Dashboard</div>
<button><Wallet size={20} /> Nova Receita</button>
<span><Target size={20} /> Meta</span>
```

### Tamanhos Padrão de Ícones
```tsx
// Ícones inline em texto
<Icon size={16} />

// Ícones em botões
<Icon size={20} />

// Ícones em cards/UI padrão
<Icon size={24} />

// Ícones em IconBox
<Icon size={28} />

// Ícones destacados/hero
<Icon size={32} />
```

### Stroke Width
```tsx
// Padrão
<Icon strokeWidth={2} />

// Emphasis (headings, botões primários)
<Icon strokeWidth={2.5} />

// Subtle (decorativos)
<Icon strokeWidth={1.5} />
```

---

## 3. Convenções de Nomenclatura

### Arquivos e Pastas
```
PascalCase para componentes: Button.tsx, TransactionCard.tsx
camelCase para utils/hooks: formatCurrency.ts, useTransactions.ts
kebab-case para páginas de rota: /contas, /planejamento
lowercase para configs: vite.config.ts, tailwind.config.js
```

### Componentes React
```tsx
// PascalCase para componentes
export const TransactionList = () => {}
export const StatCard = () => {}

// camelCase para funções utilitárias
export const formatCurrency = () => {}
export const calculateTotal = () => {}

// SCREAMING_SNAKE_CASE para constantes
export const API_BASE_URL = 'https://...'
export const MAX_FILE_SIZE = 5242880
```

### CSS Classes (Tailwind)
```tsx
// Ordem de classes: layout → sizing → spacing → colors → effects → states
className="flex items-center gap-4 w-full p-6 bg-white rounded-lg shadow-lg hover:shadow-xl"

// Use clsx ou cn para condicionais
import { cn } from '@/lib/utils'
className={cn(
  "base-classes",
  isPaid && "opacity-50",
  isActive && "border-primary"
)}
```

---

## 4. Estrutura de Componentes

### Anatomia de um Componente

```tsx
// 1. Imports (agrupados por tipo)
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency } from '@/utils/formatters';

import type { Transaction } from '@/types';

// 2. Types/Interfaces
interface TransactionCardProps {
  transaction: Transaction;
  onClick?: () => void;
  className?: string;
}

// 3. Component
export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction,
  onClick,
  className
}) => {
  // 4. Hooks (sempre no topo)
  const navigate = useNavigate();
  const { updateTransaction } = useTransactions();
  
  // 5. Estado local
  const [isLoading, setIsLoading] = React.useState(false);
  
  // 6. Handlers
  const handleClick = () => {
    onClick?.();
  };
  
  // 7. Effects
  React.useEffect(() => {
    // ...
  }, []);
  
  // 8. Render
  return (
    <Card className={cn("transaction-card", className)}>
      {/* JSX */}
    </Card>
  );
};
```

### Props Guidelines
```tsx
// Sempre tipar props
interface Props {
  title: string;           // Obrigatório
  subtitle?: string;       // Opcional
  onClick?: () => void;    // Callbacks opcionais
  className?: string;      // Sempre permitir className
  children?: React.ReactNode; // Se aceitar children
}

// Usar desestruturação com defaults
const Component = ({ 
  title, 
  subtitle = '', 
  onClick,
  className 
}: Props) => {}
```

---

## 5. Padrões de UI

### Cores - Uso Semântico

```tsx
// NUNCA hardcodear cores
<div className="bg-[#8b5cf6]"> // ERRADO

// SEMPRE usar tokens do Tailwind
<div className="bg-primary-600"> // CORRETO

// Uso por contexto:
primary-600    // Botões primários, links, highlights
success-600    // Receitas, feedback positivo
danger-600     // Despesas, erros, alertas críticos
warning-600    // Avisos, alertas de atenção
info-600       // Informações neutras
gray-600       // Textos primários
gray-500       // Textos secundários
```

### Border-Top Animation (Center Origin)

```tsx
// Padrão de animação para cards hover
const CardWithAnimation = () => (
  <div className="
    relative overflow-hidden
    hover:-translate-y-2
    before:content-['']
    before:absolute before:top-0 before:left-0 before:right-0
    before:h-1
    before:bg-gradient-to-r before:from-primary-600 before:to-primary-700
    before:scale-x-0 before:origin-center
    before:transition-transform before:duration-300
    hover:before:scale-x-100
  ">
    {/* Content */}
  </div>
);
```

### Responsividade

```tsx
// Mobile-first approach
<div className="
  grid grid-cols-1           // Mobile: 1 coluna
  sm:grid-cols-2             // Tablet: 2 colunas (≥640px)
  lg:grid-cols-4             // Desktop: 4 colunas (≥1024px)
  gap-4 sm:gap-5 lg:gap-6    // Gaps responsivos
">
```

### Loading States

```tsx
// Skeleton screens para carregamento inicial
import { Skeleton } from '@/components/ui/skeleton';

const LoadingCard = () => (
  <div className="space-y-3">
    <Skeleton className="h-12 w-12 rounded-full" />
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
  </div>
);

// Spinners para ações assíncronas
import { Loader2 } from 'lucide-react';

<Button disabled={isLoading}>
  {isLoading && <Loader2 className="animate-spin" size={16} />}
  Salvar
</Button>
```

---

## 6. Gerenciamento de Estado

### Zustand Store Pattern

```tsx
// src/store/transactionStore.ts
import { create } from 'zustand';

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchTransactions: () => Promise<void>;
  addTransaction: (transaction: Transaction) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
}

export const useTransactionStore = create<TransactionState>((set, get) => ({
  transactions: [],
  isLoading: false,
  error: null,
  
  fetchTransactions: async () => {
    set({ isLoading: true, error: null });
    try {
      // Fetch logic
      set({ transactions: data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },
  
  // ... outras actions
}));
```

### Uso em Componentes

```tsx
// Selecionar apenas o necessário
const transactions = useTransactionStore(state => state.transactions);
const fetchTransactions = useTransactionStore(state => state.fetchTransactions);

// Evitar
const store = useTransactionStore(); // Re-render em qualquer mudança
```

---

## 7. Integração com Supabase

### Client Setup

```tsx
// src/services/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Auth helper
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
};
```

### Realtime Subscriptions

```tsx
// Hook personalizado para realtime
export const useRealtimeTransactions = () => {
  const { fetchTransactions } = useTransactionStore();
  
  useEffect(() => {
    const channel = supabase
      .channel('transactions')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'transactions' 
        },
        (payload) => {
          // Atualizar store
          fetchTransactions();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};
```

### Error Handling

```tsx
// Sempre tratar erros do Supabase
const saveTransaction = async (data: Transaction) => {
  const { data: result, error } = await supabase
    .from('transactions')
    .insert(data)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase error:', error);
    throw new Error('Erro ao salvar transação. Tente novamente.');
  }
  
  return result;
};
```

---

## 8. Formulários

### React Hook Form + Zod

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Schema de validação
const transactionSchema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  amount: z.number().positive('Valor deve ser positivo'),
  date: z.date(),
  account_id: z.string().uuid('Conta inválida'),
  category_id: z.string().uuid('Categoria inválida'),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

// Componente
const TransactionForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
  });
  
  const onSubmit = async (data: TransactionFormData) => {
    // Submit logic
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('description')} />
      {errors.description && (
        <span className="text-danger-600 text-sm">
          {errors.description.message}
        </span>
      )}
      
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="animate-spin" size={16} />}
        Salvar
      </Button>
    </form>
  );
};
```

---

## 9. Utilities e Helpers

### Formatação de Moeda

```tsx
// src/utils/formatters.ts
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Uso
const total = formatCurrency(1234.56); // "R$ 1.234,56"
```

### Formatação de Datas

```tsx
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'dd/MM/yyyy', { locale: ptBR });
};

export const formatDateRelative = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  const today = new Date();
  
  if (isSameDay(dateObj, today)) return 'Hoje';
  if (isSameDay(dateObj, subDays(today, 1))) return 'Ontem';
  if (isSameDay(dateObj, addDays(today, 1))) return 'Amanhã';
  
  return format(dateObj, 'dd/MM/yyyy');
};
```

---

## 10. Tratamento de Erros

### Error Boundaries

```tsx
// src/components/ErrorBoundary.tsx
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <AlertTriangle className="text-danger-600" size={48} />
          <h1 className="text-2xl font-bold mt-4">Algo deu errado</h1>
          <p className="text-gray-600 mt-2">
            Recarregue a página ou tente novamente mais tarde.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg"
          >
            Recarregar Página
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

### Toast Notifications

```tsx
// Usar biblioteca ou criar custom
import { toast } from 'sonner'; // ou react-hot-toast

// Success
toast.success('Transação salva com sucesso!');

// Error
toast.error('Erro ao salvar transação. Tente novamente.');

// Warning
toast.warning('Você atingiu 90% do orçamento');

// Info
toast.info('Ana Clara tem uma dica para você');
```

---

## 11. Performance

### Code Splitting

```tsx
// Lazy load de rotas
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Transactions = lazy(() => import('@/pages/Transactions'));

// No router
<Route 
  path="/" 
  element={
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard />
    </Suspense>
  } 
/>
```

### Memoização

```tsx
// useMemo para cálculos pesados
const totalExpenses = useMemo(() => {
  return transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
}, [transactions]);

// useCallback para callbacks estáveis
const handleDelete = useCallback((id: string) => {
  deleteTransaction(id);
}, [deleteTransaction]);

// React.memo para componentes puros
export const StatCard = React.memo(({ title, value }) => {
  return <div>{title}: {value}</div>;
});
```

---

## 12. Testes

### Estrutura de Testes

```tsx
// TransactionCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionCard } from './TransactionCard';

describe('TransactionCard', () => {
  const mockTransaction = {
    id: '1',
    description: 'Supermercado',
    amount: 150.00,
    type: 'expense',
    date: new Date(),
  };
  
  it('should render transaction details', () => {
    render(<TransactionCard transaction={mockTransaction} />);
    
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
  });
  
  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(
      <TransactionCard 
        transaction={mockTransaction} 
        onClick={handleClick} 
      />
    );
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## 13. Acessibilidade

### ARIA Labels

```tsx
// Botões com apenas ícone
<button aria-label="Editar transação">
  <Edit size={20} />
</button>

// Inputs com labels
<label htmlFor="amount">Valor</label>
<input 
  id="amount" 
  type="number" 
  aria-required="true"
  aria-invalid={!!errors.amount}
  aria-describedby={errors.amount ? 'amount-error' : undefined}
/>
{errors.amount && (
  <span id="amount-error" className="text-danger-600">
    {errors.amount.message}
  </span>
)}
```

### Navegação por Teclado

```tsx
// Garantir tab order lógico
<form>
  <input tabIndex={1} />
  <input tabIndex={2} />
  <button tabIndex={3}>Salvar</button>
</form>

// Fechar modal com ESC
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  
  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [onClose]);
```

---

## 14. Segurança

### Variáveis de Ambiente

```bash
# .env.local (NUNCA commitar)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

```tsx
// Usar import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Validar variáveis no startup
if (!supabaseUrl) {
  throw new Error('VITE_SUPABASE_URL is required');
}
```

### XSS Prevention

```tsx
// Evitar dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: userInput }} /> // NUNCA

// Sanitizar se absolutamente necessário
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ 
  __html: DOMPurify.sanitize(userInput) 
}} />
```

---

## 15. Git Workflow

### Commit Messages

```bash
# Formato: tipo(escopo): descrição

feat(transactions): adicionar filtro por período
fix(dashboard): corrigir cálculo de saldo total
style(cards): ajustar espaçamento do StatCard
refactor(hooks): otimizar useTransactions
docs(readme): atualizar instruções de setup
test(utils): adicionar testes para formatCurrency
chore(deps): atualizar dependências
```

### Branch Strategy

```bash
main           # Produção estável
develop        # Desenvolvimento integrado
feature/nome   # Nova funcionalidade
fix/nome       # Correção de bug
refactor/nome  # Refatoração
```

---

## 16. Checklist de PR

Antes de submeter um Pull Request:

- [ ] Código segue todos os padrões deste documento
- [ ] Sem emojis (usar Lucide React)
- [ ] Componentes tipados corretamente
- [ ] Sem erros do TypeScript
- [ ] Sem warnings do ESLint
- [ ] Responsivo (mobile, tablet, desktop)
- [ ] Acessível (ARIA, keyboard navigation)
- [ ] Loading states implementados
- [ ] Error handling adequado
- [ ] Testes passando (se aplicável)
- [ ] Performance otimizada (memoization se necessário)
- [ ] Variáveis de ambiente documentadas
- [ ] Commit messages seguem padrão

---

## 17. Recursos e Referências

### Documentação Oficial
- [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide React](https://lucide.dev/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/docs)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Recharts](https://recharts.org/)

### Design System
- Ver `personal-finance-la-ui-ux-architecture.md` para detalhes completos de UI/UX

---

## Conclusão

Estas regras garantem consistência, qualidade e manutenibilidade do código. Toda contribuição deve seguir estritamente estas diretrizes. Em caso de dúvida, consulte a documentação oficial ou discuta com o time.

**Lembre-se: SEM EMOJIS - SEMPRE USE LUCIDE REACT ICONS.**

---

**Versão:** 1.0.0  
**Última atualização:** Novembro 2025  
**Mantido por:** LA Music Team