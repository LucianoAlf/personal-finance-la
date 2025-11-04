📋 VISÃO GERAL DO PROJETO
Criar um sistema completo de gestão financeira pessoal chamado Personal Finance LA com foco em experiência premium, integração WhatsApp via N8N e coach financeira virtual (Ana Clara). O sistema deve ter visual moderno inspirado no Mobills, com sidebar de navegação, cards interativos, gráficos dinâmicos e responsividade mobile-first.

🛠️ STACK TECNOLÓGICO
Frontend

Framework: React 18+ com TypeScript
Build Tool: Vite
Styling: Tailwind CSS v3.4+
UI Components: shadcn/ui (button, card, input, select, dialog, dropdown-menu, tabs, calendar, popover)
Icons: Lucide React
Charts: Recharts (para gráficos interativos)
Form Management: React Hook Form + Zod
Date Handling: date-fns
State Management: Zustand (leve e simples)
Routing: React Router v6

Backend Integration (Preparar estrutura)

Database: Supabase (PostgreSQL)
Auth: Supabase Auth (Google, Apple)
Storage: Supabase Storage (anexos/comprovantes)
Realtime: Supabase Realtime Subscriptions
Automation: N8N workflows (estrutura preparada para webhooks)


🎨 DESIGN SYSTEM COMPLETO
Paleta de Cores
javascript// Cores Principais
primary: {
  50: '#f5f3ff',
  100: '#ede9fe',
  500: '#8b5cf6',
  600: '#7c3aed',
  700: '#6d28d9',
}

// Cores Funcionais
success: { 500: '#10b981', 600: '#059669' }
danger: { 500: '#ef4444', 600: '#dc2626' }
warning: { 500: '#f59e0b', 600: '#d97706' }
info: { 500: '#3b82f6', 600: '#2563eb' }

// Neutros
gray: { 50: '#f9fafb', 100: '#f3f4f6', 200: '#e5e7eb', 600: '#4b5563', 900: '#111827' }

// Backgrounds
bg-gradient-primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
bg-gradient-success: 'linear-gradient(135deg, #10b981, #059669)'
bg-gradient-danger: 'linear-gradient(135deg, #ef4444, #dc2626)'
Tipografia

Font Family: 'Inter', sans-serif (Google Fonts)
Headings: font-weight: 700-800, letter-spacing: -0.5px
Body: font-weight: 400-500, line-height: 1.6
Tamanhos: h1: 28-36px | h2: 20-24px | h3: 16-18px | body: 14-16px

Espaçamentos

Padding Cards: 20px mobile, 28px desktop
Gap Grid: 16px mobile, 20px desktop
Border Radius: small: 8px | medium: 12px | large: 16-20px

Efeitos e Animações
css/* Hover Cards */
transform: translateY(-8px);
box-shadow: 0 20px 60px rgba(31, 38, 135, 0.5);
transition: all 0.3s ease;

/* Border Top Animation */
::before {
  height: 4px;
  background: gradient;
  transform: scaleX(0) → scaleX(1);
}

/* Icon Rotation */
transform: rotate(5-6deg) scale(1.05);

/* Fade In Animation */
@keyframes fadeIn {
  from: opacity 0, translateY(30px);
  to: opacity 1, translateY(0);
}
```

---

## 📂 ESTRUTURA DE PASTAS
```
src/
├── components/
│   ├── ui/                    # shadcn/ui components
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── MainLayout.tsx
│   ├── dashboard/
│   │   ├── StatCard.tsx
│   │   ├── TransactionItem.tsx
│   │   ├── CreditCardPreview.tsx
│   │   └── AnaClara.tsx
│   ├── transactions/
│   │   ├── TransactionList.tsx
│   │   ├── TransactionFilters.tsx
│   │   └── TransactionForm.tsx
│   ├── charts/
│   │   ├── PieChart.tsx
│   │   ├── BarChart.tsx
│   │   └── LineChart.tsx
│   └── shared/
│       ├── IconBox.tsx
│       ├── Badge.tsx
│       └── QuickActionCard.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Accounts.tsx
│   ├── Transactions.tsx
│   ├── CreditCards.tsx
│   ├── Planning.tsx
│   ├── Goals.tsx
│   ├── Investments.tsx
│   ├── Reports.tsx
│   ├── Education.tsx
│   └── Settings.tsx
├── hooks/
│   ├── useSupabase.ts
│   ├── useTransactions.ts
│   ├── useAccounts.ts
│   └── useWhatsApp.ts
├── store/
│   ├── authStore.ts
│   ├── transactionStore.ts
│   └── uiStore.ts
├── services/
│   ├── supabase.ts
│   ├── n8n.ts
│   └── api.ts
├── types/
│   ├── database.types.ts
│   ├── transaction.types.ts
│   └── account.types.ts
└── utils/
    ├── formatters.ts
    ├── validators.ts
    └── constants.ts

🎯 COMPONENTES GLOBAIS REUTILIZÁVEIS
1. Sidebar Navigation
Arquivo: components/layout/Sidebar.tsx
Estrutura:

Logo no topo (Personal Finance LA)
Botão "Novo" grande e destacado (roxo)
Menu de navegação com ícones Lucide:

🏠 Dashboard (Home)
💰 Contas (Wallet)
📊 Transações (List)
💳 Cartões de Crédito (CreditCard)
📅 Planejamento (Calendar)
🎯 Metas (Target)
💎 Investimentos (TrendingUp)
📈 Relatórios (BarChart3)
🎓 Educação Financeira (GraduationCap)
⚙️ Configurações (Settings)


"Mais opções" com submenu expansível
Ícone Ana Clara (bot flutuante fixo no bottom-right)
Footer com ajuda (HelpCircle)

Comportamento:

Highlight do item ativo (background roxo claro)
Hover: background gray-100, transform subtle
Collapsible em mobile (hamburger menu)
Largura: 240px desktop, full-width mobile overlay

2. Header Global
Arquivo: components/layout/Header.tsx
Elementos:

Breadcrumb da página atual
Seletor de mês (Dropdown)
Botões de ação contextuais por página
Avatar do usuário (dropdown: perfil, sair)
Badge de notificações (contador)

3. Stat Card
Arquivo: components/dashboard/StatCard.tsx
Props:
typescriptinterface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  badge?: { text: string; variant: 'success' | 'warning' | 'danger' | 'info' };
  trend?: { value: string; direction: 'up' | 'down' };
  subtitle?: string;
  gradientColor: 'blue' | 'green' | 'red' | 'orange' | 'purple';
  onClick?: () => void;
}
Estilo:

IconBox com gradiente (56x56px, border-radius: 16px)
Hover: translateY(-8px), border-top 4px animado
Shadow progressiva

4. Transaction Item
Arquivo: components/dashboard/TransactionItem.tsx
Props:
typescriptinterface TransactionItemProps {
  type: 'income' | 'expense' | 'transfer';
  description: string;
  category: string;
  date: Date;
  amount: number;
  account: string;
  icon?: string;
  isPaid?: boolean;
  attachment?: string;
}
```

**Estilo:**
- Border-left 4px (green: receita, red: despesa)
- Hover: translateX(8px)
- Layout: ícone categoria + descrição | data + valor

### 5. Ana Clara Widget
**Arquivo:** `components/dashboard/AnaClara.tsx`

**Dois Modos:**
1. **Inline Card Grande:** Gradiente roxo, mensagens com insights
2. **Floating Button:** Bottom-right fixo, abre modal de chat

**Features:**
- Mensagens com backdrop-filter blur
- Ícones emoji contextuais
- Botões de ação (Ver Detalhes, Entendi)
- Animação de entrada (fadeIn + scale)

### 6. Charts Components
**Arquivo:** `components/charts/`

**PieChart.tsx:**
- Usar Recharts PieChart
- Labels com percentuais
- Cores customizadas por categoria
- Hover: tooltip com valor absoluto
- Legend abaixo do gráfico

**BarChart.tsx:**
- Recharts BarChart horizontal
- Gradientes por categoria
- Labels inline nas barras
- Comparativo de períodos

**LineChart.tsx:**
- Tendência de 6 ou 12 meses
- Múltiplas linhas (receitas vs despesas)
- Grid subtle
- Tooltip com data formatada

---

## 📄 PÁGINAS DETALHADAS

### 1. 🏠 DASHBOARD (/)

**Layout:**
```
[Header: "Olá, {Nome}! 👋" + Botões: Nova Receita, Nova Despesa, Exportar]

[Grid 4 colunas - Stat Cards]
- Saldo Total (azul, ícone Wallet)
- Receitas do Mês (verde, ícone TrendingUp)
- Despesas do Mês (vermelho, ícone TrendingDown)
- Cartões de Crédito (laranja, ícone CreditCard)

[Grid 2 colunas]
- [Coluna 1] Ana Clara Widget Grande (gradiente roxo)
- [Coluna 2] Ações Rápidas (4 cards com dashed border)
  * Lançar via WhatsApp
  * Ver Contas a Pagar
  * Minhas Metas
  * Planejamento

[Grid 2 colunas]
- [Coluna 1] Transações Recentes (lista últimas 5)
- [Coluna 2] Cartões de Crédito (preview 2 principais)

[Grid 4 colunas - Insight Cards]
- Economia no Caminho (verde)
- Atenção aos Cartões (laranja)
- Metas em Progresso (azul)
- Contas a Pagar (roxo)

[Gráficos - Grid 2 colunas]
- Despesas por Categoria (PieChart)
- Receitas vs Despesas (BarChart comparativo)
```

**Interações:**
- Stat Cards clicáveis → navegam para página relacionada
- Transações clicáveis → abre modal de edição
- Botão Ana Clara → abre chat modal

---

### 2. 💰 CONTAS (/contas)

**Header:**
- Título: "Contas"
- Botões: [+ Nova Conta] [Transferência] [Ajustar Saldo]

**Layout:**
```
[Card de Resumo - Grid 3 colunas]
- Saldo Total Geral
- Contas Bancárias (soma)
- Carteiras/Dinheiro (soma)

[Grid responsivo de Cards de Contas]
Cada card contém:
- IconBox com logo do banco (ou ícone padrão)
- Nome da conta
- Tipo (Conta Corrente, Poupança, Carteira, Investimento)
- Saldo Atual (grande e destacado)
- Saldo Previsto (com dica de tooltip)
- Badge de status (Ativa, Arquivada)
- Menu kebab (•••): Editar, Transferir, Ajustar, Arquivar
- Gráfico sparkline de últimos 30 dias (opcional)

[Botão +] Criar Nova Conta (dashed border card)
```

**Modal: Nova Conta**
```
Campos:
- Nome da Conta*
- Tipo* (select: Corrente, Poupança, Carteira, Investimento, Outro)
- Banco (select com logos: Nubank, Itaú, Bradesco, C6, Inter, etc + Outro)
- Saldo Inicial*
- Cor (color picker com paleta pré-definida)
- Ícone (seletor de ícones Lucide)
- Incluir no total geral (toggle)
- Conta compartilhada (modo casal - toggle)

Botões: [Cancelar] [Salvar Conta]
```

---

### 3. 📊 TRANSAÇÕES (/transacoes)

**Header:**
- Título: "Transações"
- Seletor de mês
- Botões: [+ Despesa] [+ Receita] [Importar CSV]

**Filtros Lateral (Collapsible):**
```
📅 Período
- Hoje / Semana / Mês / Personalizado (date range picker)

💰 Tipo
- Todas / Receitas / Despesas / Transferências

💳 Conta
- Multiselect com todas as contas

📂 Categoria
- Multiselect hierárquico (categorias + subcategorias)

✅ Status
- Todas / Pagas / Pendentes / Atrasadas

🔁 Recorrência
- Todas / Recorrentes / Únicas

🔍 Busca textual
- Input de busca por descrição

[Botão] Limpar Filtros | Aplicar
```

**Lista de Transações:**
```
[Resumo do Período Filtrado]
Total: X transações | Receitas: R$ X | Despesas: R$ X | Saldo: R$ X

[Agrupamento por Data]
▼ Hoje (DD/MM/YYYY)
  [Transaction Item 1]
  [Transaction Item 2]
  Saldo do Dia: R$ X

▼ Ontem (DD/MM/YYYY)
  [Transaction Item 3]
  ...

Cada Transaction Item:
- Checkbox (seleção múltipla)
- Ícone da categoria (colorido)
- Descrição (bold) + Categoria (subtitle)
- Conta origem (badge pequeno)
- Valor (verde/vermelho conforme tipo)
- Ícones de status:
  * 📎 (tem anexo)
  * 🔁 (recorrente)
  * 💳 (cartão de crédito)
  * ⏰ (pendente)
- Menu kebab: Editar, Duplicar, Excluir, Marcar Paga, Anexar

[Paginação]
← Anterior | Página 1 de 5 | Próxima →
```

**Modal: Nova Transação**
```
Tabs: [Despesa] [Receita] [Transferência]

Campos Despesa/Receita:
- Descrição*
- Valor*
- Data*
- Conta* (select)
- Categoria* (select hierárquico com ícones)
- Já foi paga? (toggle)
- Recorrente? (toggle)
  → Se sim: Frequência (select: Diária, Semanal, Mensal, Anual)
  → Data de término (date picker ou "Sem fim")
- Anexo (upload de imagem/PDF)
- Observações (textarea)

Campos Transferência:
- Valor*
- Data*
- Conta Origem* (select)
- Conta Destino* (select)
- Descrição
- Observações

Botões: [Cancelar] [Salvar] [Salvar e Criar Nova]
```

---

### 4. 💳 CARTÕES DE CRÉDITO (/cartoes)

**Header:**
- Título: "Cartões de Crédito"
- Botões: [+ Novo Cartão] [Pagar Fatura]

**Tabs:**
- Faturas Abertas | Faturas Fechadas

**Layout:**
```
[Grid de Cartões]
Cada card de cartão:
- Design de cartão de crédito (gradiente por bandeira)
- Logo da bandeira (Visa, Mastercard, Amex, Elo)
- Nome do cartão
- Últimos 4 dígitos
- Valor da fatura (grande)
- Status badge (Aberta, Fechada, Paga, Atrasada)
- Data de fechamento / vencimento
- Progress bar de limite utilizado
- Percentual utilizado
- Limite total

Hover: Efeito de elevation + shadow

Click: Abre modal de detalhes da fatura

[Card +] Adicionar Novo Cartão (dashed border)
```

**Modal: Detalhes da Fatura**
```
[Header]
- Nome do cartão
- Período da fatura (MM/YYYY)
- Total da fatura (destaque)
- Data de vencimento
- Botão: [Pagar Fatura]

[Tabs]
- Compras (lista de transações)
- Parcelamentos (agrupado por compra parcelada)
- Histórico (faturas anteriores)

[Lista de Compras]
Agrupado por data:
- Data da compra
- Estabelecimento/Descrição
- Categoria
- Valor
- Parcela (se parcelado: X/Y)
- Ícones: Editar, Contestar

[Footer]
Total de compras: R$ X
IOF: R$ X
Juros: R$ X (se houver)
Total da fatura: R$ X

Botões: [Fechar] [Exportar PDF] [Pagar Fatura]
```

---

### 5. 📅 PLANEJAMENTO MENSAL (/planejamento)

**Header:**
- Título: "Planejamento Mensal"
- Seletor de mês/ano
- Botões: [Copiar Mês Anterior] [Salvar Planejamento]

**Layout:**
```
[Cards de Resumo - Grid 4 colunas]
- Receitas Planejadas
- Despesas Planejadas
- Saldo Previsto
- Economia Planejada (%)

[Seção: Receitas Planejadas]
📈 Receitas do Mês
[+ Adicionar Receita Planejada]

Lista:
- Salário | R$ 3.500,00 [Editar] [Excluir]
- Freelance | R$ 800,00 [Editar] [Excluir]
Total Receitas: R$ 4.300,00

[Seção: Despesas Planejadas por Categoria]
📉 Orçamento por Categoria

Cada categoria:
┌─────────────────────────────────┐
│ 🏠 Moradia                      │
│ Planejado: R$ 1.500,00          │
│ Realizado: R$ 1.450,00          │
│ ████████████░░ 97%              │
│ Faltam: R$ 50,00                │
└─────────────────────────────────┘

Categorias principais:
- Moradia (aluguel, condomínio, IPTU)
- Alimentação (supermercado, restaurantes)
- Transporte (combustível, transporte público)
- Saúde (plano, farmácia, consultas)
- Educação (cursos, livros)
- Lazer (cinema, viagens, hobbies)
- Outros

[+ Adicionar Categoria]

[Comparativo Mensal]
Gráfico de barras agrupadas:
- Planejado vs Realizado por categoria
```

**Modal: Definir Orçamento da Categoria**
```
Categoria: [Select]
Valor Planejado: [Input R$]
Alertar ao atingir: [75%] [90%] [100%]
Observações: [Textarea]

[Salvar]
```

---

### 6. 🎯 METAS FINANCEIRAS (/metas)

**Header:**
- Título: "Metas Financeiras"
- Botões: [+ Nova Meta]

**Layout:**
```
[Grid de Cards de Metas]
Cada Meta:
┌─────────────────────────────────┐
│ 🏖️ [Ícone da Meta]             │
│ Viagem para Europa              │
│                                 │
│ ████████████████░░░░ 67%       │
│ R$ 20.100 de R$ 30.000         │
│                                 │
│ 📅 Prazo: Dez/2026 (13 meses)  │
│ 💰 Faltam: R$ 9.900            │
│ 📊 Aporte sugerido: R$ 761/mês │
│                                 │
│ [+ Adicionar Valor] [Editar]   │
└─────────────────────────────────┘

Estados visuais:
- < 25%: vermelho
- 25-50%: laranja
- 50-75%: amarelo
- 75-99%: azul
- 100%: verde + animação de confete

[Card +] Criar Nova Meta (dashed border)
```

**Modal: Nova Meta**
```
Campos:
- Nome da Meta*
- Ícone (seletor: 🏖️🚗🏠💰📚🎓🎉)
- Imagem (opcional, upload)
- Valor Alvo* (R$)
- Data Alvo*
- Valor Inicial (quanto já tem)
- Conta Vinculada (opcional)
- Meta Compartilhada (modo casal - toggle)

[Calculadora de Aportes]
Com base no prazo:
- Aporte mensal necessário: R$ X
- Aporte semanal necessário: R$ X

Botões: [Cancelar] [Criar Meta]
```

**Modal: Adicionar Valor à Meta**
```
Meta: [Nome da Meta]
Progresso Atual: X%

Valor a Adicionar: [Input R$]
Data: [Date picker]
Observações: [Textarea]

[Salvar Contribuição]

[Histórico de Contribuições]
Lista das últimas contribuições
```

---

### 7. 💎 INVESTIMENTOS (/investimentos)

**Header:**
- Título: "Investimentos"
- Botões: [+ Novo Investimento] [Atualizar Cotações]

**Cards de Resumo - Grid 4:**
```
- Total Investido
- Valorização (R$ + %)
- Valor Atual
- Rentabilidade vs CDI
```

**Layout:**
```
[Tabs]
- Visão Geral | Renda Fixa | Ações | Fundos | Criptomoedas

[Visão Geral]

[Gráfico: Distribuição por Tipo]
PieChart com:
- Renda Fixa (45%)
- Ações B3 (30%)
- Fundos (15%)
- Criptomoedas (10%)

[Tabela de Investimentos]
Colunas:
- Tipo | Nome/Ticker | Quantidade | Preço Médio | Cotação Atual | Valor Total | Rentabilidade | Ações

Exemplo de linha:
📈 Ação | PETR4 | 100 | R$ 35,20 | R$ 38,50 | R$ 3.850,00 | +9,4% ↑ | [Editar][Vender]

[Integrações de Mercado]
- API B3: cotações de ações
- API Tesouro Direto: títulos públicos
- API Banco Central: câmbio
- API CoinGecko: criptomoedas

Atualização automática a cada 5 minutos
Último update: [timestamp]
```

**Modal: Novo Investimento**
```
Tipo*: [Renda Fixa] [Ação] [Fundo] [Cripto] [Outro]

[Se Ação]
- Ticker*: [Input com autocomplete da B3]
- Quantidade*
- Preço de Compra*
- Data da Compra*
- Corretora
- Observações

[Se Renda Fixa]
- Tipo*: (Tesouro Selic, Tesouro IPCA+, CDB, LCI, LCA)
- Valor Aplicado*
- Taxa (% a.a.)
- Vencimento*
- Instituição

[Se Cripto]
- Moeda*: (BTC, ETH, etc - autocomplete)
- Quantidade*
- Preço de Compra (USD ou BRL)
- Exchange

[Salvar]
```

---

### 8. 📈 RELATÓRIOS (/relatorios)

**Header:**
- Título: "Relatórios"
- Seletor de período (mês, trimestre, semestre, ano, personalizado)
- Botão: [Exportar PDF]

**Tabs:**
```
[Despesas por Categoria] [Tendências] [Balanço Patrimonial] [Fluxo de Caixa] [Meu Desempenho]
```

**Tab 1: Despesas por Categoria**
```
[Período selecionado]
Total Despesas: R$ X

[Gráfico Donut]
- Categorias com % e valor

[Top 5 Categorias]
Lista com barras horizontais:
1. Moradia - R$ 1.500,00 (35%)
2. Alimentação - R$ 850,00 (20%)
...

[Comparativo vs Mês Anterior]
- Aumentaram: [lista categorias ↑]
- Diminuíram: [lista categorias ↓]
```

**Tab 2: Tendências**
```
[Gráfico de Linha - 12 meses]
Linhas:
- Receitas (verde)
- Despesas (vermelho)
- Saldo (azul)

[Insights Automáticos]
📊 Análise de Padrões:
- Mês com maior receita: [Mês]
- Mês com maior despesa: [Mês]
- Média mensal de economia: X%
- Tendência: ↑ Crescente / ↓ Decrescente / → Estável
```

**Tab 3: Balanço Patrimonial**
```
[Cards]
- Ativos Totais (Contas + Investimentos)
- Passivos Totais (Dívidas + Cartões)
- Patrimônio Líquido

[Gráfico de Evolução]
Line chart do patrimônio líquido nos últimos 12 meses

[Detalhamento]
Ativos:
- Conta Corrente Itaú: R$ X
- Investimentos: R$ X
- ...

Passivos:
- Fatura Nubank: R$ X
- Financiamento: R$ X
```

**Tab 4: Fluxo de Caixa**
```
[Previsão de 3/6/12 meses]

[Gráfico de Barras Empilhadas]
Para cada mês futuro:
- Receitas previstas
- Despesas previstas
- Saldo previsto

Considera:
- Receitas recorrentes
- Despesas recorrentes
- Contas a pagar agendadas

[Alertas]
⚠️ Mês com saldo negativo previsto: [Mês]
💡 Sugestão: Revisar despesas de categoria X
```

**Tab 5: Meu Desempenho**
```
[Score Financeiro: 0-100]
Grande card com pontuação e gauge chart

Fatores:
✅ Taxa de economia (30 pts)
✅ Cumprimento de orçamento (20 pts)
✅ Consistência de registros (15 pts)
✅ Patrimônio crescente (15 pts)
✅ Metas alcançadas (10 pts)
✅ Uso consciente de crédito (10 pts)

[Badges Desbloqueados]
Grid de conquistas:
- 🎯 Primeiro Mês Completo
- 💰 Economizou 10%
- 🔥 Streak 30 Dias
...

[Insights da Ana Clara]
Mensagem personalizada sobre o desempenho
```

---

### 9. 🎓 EDUCAÇÃO FINANCEIRA (/educacao)

**Header:**
- Título: "Educação Financeira"

**Layout:**
```
[Hero Section]
"Aprenda a cuidar melhor do seu dinheiro com a Ana Clara!"

[Tabs]
[Trilha de Aprendizado] [Conquistas] [Dicas Diárias] [Glossário]

[Trilha de Aprendizado]
┌─────────────────────────────────┐
│ ✅ Módulo 1: Organização Básica │
│ 5/5 lições completas            │
│ [Revisar]                       │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🔄 Módulo 2: Eliminando Dívidas │
│ 3/5 lições completas (60%)      │
│ [Continuar]                     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🔒 Módulo 3: Começando a Investir│
│ Bloqueado - Complete Módulo 2   │
└─────────────────────────────────┘

[Conquistas]
Grid de badges:
🎯 Primeiro Mês Completo
💰 Economizou 10% da Renda
🔥 30 Dias de Streak
🏆 Meta Alcançada
...

[Dicas Diárias]
Card com dica da Ana Clara:
💡 "Que tal revisar seus gastos com streaming?
    Você pode estar pagando por serviços não usados."

[Ver mais dicas] (carrossel)

[Glossário Financeiro]
Lista alfabética com busca:
- CDI
- IOF
- IPCA
- Renda Fixa
- Taxa Selic
...

Click abre modal com explicação detalhada + exemplo prático
```

---

### 10. ⚙️ CONFIGURAÇÕES (/configuracoes)

**Tabs Laterais:**
```
[Perfil] [Contas e Categorias] [WhatsApp] [Notificações] [Privacidade] [Aparência] [Integrações] [Sobre]
```

**Tab: Perfil**
```
[Avatar]
- Upload de foto
- Nome completo*
- Email* (readonly)
- Telefone
- Modo Casal (toggle)
  → Se ativado: Link de convite para parceiro(a)
- Meta de economia mensal (%)
- Dia de fechamento mensal (1-31)

[Botão] Salvar Alterações
```

**Tab: Contas e Categorias**
```
[Sub-tabs: Categorias | Contas]

Categorias:
Lista hierárquica drag-and-drop:
📂 Moradia
  ├─ Aluguel
  ├─ Condomínio
  └─ IPTU
📂 Alimentação
  ├─ Supermercado
  └─ Restaurantes
...

[+ Nova Categoria]
[+ Nova Subcategoria]

Cada item: [Editar] [Excluir] [Ícone] [Cor]

Contas:
Lista de contas cadastradas
- Reordenar (drag)
- Editar detalhes
- Arquivar
- Excluir
```

**Tab: WhatsApp**
```
[Status da Conexão]
🟢 Conectado | 🔴 Desconectado

[QR Code para Conectar]
(Se desconectado)

[Configurações]
- Enviar resumo diário (toggle) → Horário: [20:00]
- Enviar resumo semanal (toggle) → Dia: [Segunda-feira]
- Lembretes de contas a pagar (toggle)
  → Com quantos dias de antecedência: [1 dia]
- Confirmar transações via WhatsApp (toggle)

[Testar Conexão]
```

**Tab: Notificações**
```
[Push Notifications]
- Contas a vencer (toggle)
- Nova transação registrada (toggle)
- Meta alcançada (toggle)
- Orçamento estourado (toggle)
- Lembretes personalizados (toggle)

[Email]
- Resumo mensal (toggle)
- Alertas importantes (toggle)

[Horários Permitidos]
Das [08:00] até [22:00]
(Não receber notificações fora desse horário)
```

**Tab: Privacidade e Segurança**
```
[Autenticação]
- Senha atual
- Nova senha
- Confirmar senha
[Alterar Senha]

- Habilitar autenticação biométrica (toggle)
- Exigir senha ao abrir app (toggle)

[Dados]
- Exportar meus dados (JSON)
- Excluir minha conta
  → Modal de confirmação com aviso severo
```

**Tab: Aparência**
```
[Tema]
- ○ Claro
- ● Escuro
- ○ Automático (sistema)

[Moeda]
- R$ BRL (padrão)

[Formato de Data]
- DD/MM/YYYY
- MM/DD/YYYY

[Idioma]
- 🇧🇷 Português (BR)
```

**Tab: Integrações**
```
[Status das APIs]
- ✅ B3 (Ações): Conectado
- ✅ Tesouro Direto: Conectado
- ✅ Banco Central: Conectado
- ✅ CoinGecko: Conectado
- ⏱️ Última atualização: há 3 minutos

[Configurar Atualização Automática]
- Intervalo: [5 minutos] [15 min] [30 min] [1 hora]

[Logs de Sincronização]
Últimos 10 logs com timestamps
```

**Tab: Sobre**
```
[Logo Personal Finance LA]

Versão: 1.0.0 (MVP)
Desenvolvido por: LA Music Team

[Links]
- 📚 Documentação
- 🐛 Reportar Bug
- 💡 Sugerir Feature
- 📧 Contato: contato@lamusicltda.com

[Licenças Open Source]
Lista de dependências

🔗 PREPARAÇÃO BACKEND (SUPABASE)
Configuração Supabase
Arquivo: src/services/supabase.ts
typescript// Inicializar cliente Supabase
createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Auth listeners
onAuthStateChange()

// Realtime subscriptions
supabase
  .channel('transactions')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, payload => {
    // Atualizar UI em tempo real
  })
```

### Estrutura de Dados (Referência)
```
Tabelas principais:
- users
- accounts
- transactions
- categories
- credit_cards
- budgets
- goals
- goal_contributions
- investments
- achievements
- whatsapp_settings
- ana_clara_conversations

** Não criar os SQLs, apenas preparar os types TypeScript baseados no schema do PRD **
Hooks Customizados
typescript// useTransactions.ts
const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useTransactions(filters)

// useAccounts.ts
const { accounts, totalBalance, addAccount, updateAccount } = useAccounts()

// useGoals.ts
const { goals, addGoal, addContribution, calculateProgress } = useGoals()

// useAuth.ts
const { user, signIn, signOut, signUp } = useAuth()

🤖 PREPARAÇÃO N8N (WHATSAPP)
Service Layer
Arquivo: src/services/n8n.ts
typescript// Enviar webhook para N8N
const sendToN8N = async (event: string, data: any) => {
  await fetch('https://n8n-instance.com/webhook/personal-finance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, data, userId: currentUser.id })
  })
}

// Eventos disponíveis:
- 'whatsapp_message_received' (processado pelo N8N → retorna transação estruturada)
- 'send_reminder' (N8N envia lembrete de conta)
- 'send_daily_summary' (N8N envia resumo)
- 'send_ana_clara_message' (mensagem da Ana Clara)
```

### WhatsApp Integration Points
```
Frontend → N8N Webhooks:
1. Usuário conecta WhatsApp (exibe QR Code gerado pelo N8N)
2. Usuário envia mensagem via WhatsApp
3. N8N processa (LLM + categorização)
4. N8N envia webhook de volta para Supabase
5. Frontend recebe via Realtime Subscription
6. UI atualiza automaticamente

N8N → Frontend (via Realtime):
1. Lembretes agendados (cron)
2. Resumos diários/semanais
3. Alertas de orçamento
```

---

## 📱 RESPONSIVIDADE

### Breakpoints
```
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
```

### Mobile Behavior
- **Sidebar:** Collapsible com overlay escuro
- **Grid 4 colunas:** vira 1 coluna em mobile
- **Grid 2 colunas:** vira 1 coluna < 768px
- **Botões:** Stack vertical em telas pequenas
- **Tabelas:** Scroll horizontal
- **Charts:** Responsive com height fixo
- **Stat Cards:** Full width mobile, hover disabled

---

## ♿ ACESSIBILIDADE
```
- Aria labels em todos os botões e ícones
- Contrast ratio mínimo 4.5:1
- Foco visível em todos os elementos interativos
- Navegação por teclado (Tab, Enter, Esc)
- Skip links para navegação
- Screen reader friendly
- Texts alternativos em imagens
```

---

## 🚀 FEATURES ESPECIAIS

### Ana Clara - Floating Chat
```
Posição: fixed bottom-right
Animação de entrada: scale + bounce
Click: abre modal fullscreen (mobile) ou sidebar (desktop)

Modal de Chat:
- Header: Avatar Ana Clara + "Ana Clara - Sua Coach Financeira"
- Body: Histórico de mensagens
- Footer: Input de mensagem + Botão Enviar
- Sugestões rápidas: "Ver meu saldo", "Próximas contas", "Dicas do mês"
```

### PWA Support
```
- manifest.json configurado
- Service Worker para offline
- Install prompt para "Adicionar à Tela Inicial"
- Splash screen customizada
- Ícones em múltiplos tamanhos
```

### Keyboard Shortcuts
```
Ctrl/Cmd + N: Nova transação
Ctrl/Cmd + K: Busca global
Ctrl/Cmd + D: Dashboard
Ctrl/Cmd + T: Transações
Ctrl/Cmd + G: Metas
Esc: Fechar modal

🎯 PRÓXIMOS PASSOS

Configurar projeto Vite + React + TypeScript
Instalar dependências (shadcn/ui, Recharts, Zustand, etc)
Configurar Tailwind CSS
Criar estrutura de pastas
Implementar Sidebar + Layout
Criar página Dashboard
Implementar demais páginas sequencialmente
Configurar Supabase client
Criar hooks de integração
Preparar service layer para N8N
Testes de responsividade
Deploy em Vercel/Netlify


📦 DEPENDÊNCIAS OBRIGATÓRIAS
json{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0",
    "@supabase/supabase-js": "^2.39.0",
    "zustand": "^4.5.0",
    "recharts": "^2.12.0",
    "lucide-react": "^0.344.0",
    "date-fns": "^3.3.0",
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-*": "latest",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
}