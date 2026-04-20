import {
  Home,
  Wallet,
  List,
  CreditCard,
  Receipt,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  GraduationCap,
  CalendarDays,
  Settings,
  Bot,
  MoreHorizontal,
  Tag,
  FolderTree,
  ArrowRightLeft,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';

export type QuickCreateAction =
  | 'expense'
  | 'income'
  | 'transfer'
  | 'card-expense'
  | 'payable-bill';

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

export interface QuickCreateItem {
  icon: LucideIcon;
  label: string;
  action: QuickCreateAction;
}

export type BottomNavEntry =
  | { kind: 'route'; icon: LucideIcon; label: string; path: string }
  | { kind: 'ana-clara'; icon: LucideIcon; label: string }
  | { kind: 'more'; icon: LucideIcon; label: string };

export const primaryMenuItems: MenuItem[] = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Wallet, label: 'Contas', path: '/contas' },
  { icon: List, label: 'Transações', path: '/transacoes' },
  { icon: ShieldCheck, label: 'Conciliação', path: '/conciliacao' },
  { icon: CreditCard, label: 'Cartões', path: '/cartoes' },
  { icon: Receipt, label: 'Contas a Pagar', path: '/contas-pagar' },
  { icon: CalendarDays, label: 'Agenda', path: '/agenda' },
  { icon: Target, label: 'Metas', path: '/metas' },
  { icon: TrendingUp, label: 'Investimentos', path: '/investimentos' },
  { icon: BarChart3, label: 'Relatórios', path: '/relatorios' },
  { icon: GraduationCap, label: 'Educação', path: '/educacao' },
];

export const moreMenuItems: MenuItem[] = [
  { icon: Tag, label: 'Tags', path: '/tags' },
  { icon: FolderTree, label: 'Categorias', path: '/categorias' },
  { icon: Settings, label: 'Configurações', path: '/configuracoes' },
];

export const quickCreateItems: QuickCreateItem[] = [
  { icon: TrendingDown, label: 'Despesa', action: 'expense' },
  { icon: TrendingUp, label: 'Receita', action: 'income' },
  { icon: CreditCard, label: 'Despesa cartão', action: 'card-expense' },
  { icon: ArrowRightLeft, label: 'Transferência', action: 'transfer' },
  { icon: Receipt, label: 'Conta a pagar', action: 'payable-bill' },
];

export const bottomNavItems: BottomNavEntry[] = [
  { kind: 'route', icon: Home, label: 'Início', path: '/' },
  { kind: 'route', icon: List, label: 'Lanç.', path: '/transacoes' },
  { kind: 'ana-clara', icon: Bot, label: 'Ana' },
  { kind: 'route', icon: Receipt, label: 'A Pagar', path: '/contas-pagar' },
  { kind: 'more', icon: MoreHorizontal, label: 'Mais' },
];

const bottomNavRoutePaths = new Set(
  bottomNavItems.flatMap((entry) => (entry.kind === 'route' ? [entry.path] : [])),
);

export const moreSheetItems: MenuItem[] = [
  ...primaryMenuItems.filter((item) => !bottomNavRoutePaths.has(item.path)),
  ...moreMenuItems,
];
