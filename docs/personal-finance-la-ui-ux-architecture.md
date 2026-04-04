# Personal Finance LA - Arquitetura UI/UX
## Documento de Design System & Experience Guidelines

**Versão:** 1.0.0  
**Data:** Novembro 2025  
**Projeto:** Personal Finance LA MVP  
**Equipe:** LA Music Team  

---

## 📑 Índice

1. [Visão Geral](#1-visão-geral)
2. [Princípios de Design](#2-princípios-de-design)
3. [Design System](#3-design-system)
4. [Arquitetura de Informação](#4-arquitetura-de-informação)
5. [Componentes UI](#5-componentes-ui)
6. [Padrões de Interação](#6-padrões-de-interação)
7. [Fluxos de Usuário](#7-fluxos-de-usuário)
8. [Responsividade](#8-responsividade)
9. [Acessibilidade](#9-acessibilidade)
10. [Ana Clara - Coach Virtual](#10-ana-clara-coach-virtual)
11. [Animações e Microinterações](#11-animações-e-microinterações)
12. [Estados e Feedback](#12-estados-e-feedback)
13. [Diretrizes de Conteúdo](#13-diretrizes-de-conteúdo)

---

## 1. Visão Geral

### 1.1 Propósito do Documento

Este documento define a arquitetura completa de UI/UX do Personal Finance LA, estabelecendo padrões visuais, comportamentais e de experiência que garantem consistência, usabilidade e escalabilidade do produto.

### 1.2 Objetivos de Design

**Primários:**
- Simplificar a gestão financeira pessoal através de interfaces intuitivas
- Criar uma experiência premium que inspire confiança e profissionalismo
- Tornar o controle financeiro um hábito positivo através da gamificação
- Integrar naturalmente o lançamento via WhatsApp no fluxo do usuário

**Secundários:**
- Educar o usuário sobre finanças de forma contextual
- Personalizar a experiência baseado no comportamento do usuário
- Reduzir a fricção em tarefas repetitivas
- Promover transparência total dos dados financeiros

### 1.3 Público-Alvo

**Personas Principais:**

**Maria - 28 anos**
- Professora de música (R$ 3.500/mês)
- Quer começar a investir mas não sabe por onde
- Esquece de anotar gastos diários
- Usa WhatsApp o dia todo
- Precisa de incentivos e feedback positivo

**Susan - 43 anos**
- Psicóloga e empresária (R$ 15.000/mês)
- Tem múltiplas fontes de renda
- Quer análises sofisticadas mas praticidade
- Planeja aposentadoria
- Valoriza privacidade e segurança

### 1.4 Contexto de Uso

**Dispositivos:**
- 70% Mobile (iOS/Android)
- 25% Desktop (Windows/Mac)
- 5% Tablet

**Momentos de Uso:**
- **Manhã (7-9h):** Consultar saldo, ver lembretes
- **Almoço (12-14h):** Lançar despesas via WhatsApp
- **Noite (20-22h):** Revisar dia, planejar semana
- **Fim de mês:** Análises detalhadas, relatórios

**Duração de Sessão:**
- Micro-sessões: 30s - 2min (consultas rápidas)
- Sessões médias: 5-10min (lançamentos)
- Sessões longas: 20-40min (planejamento/análise)

---

## 2. Princípios de Design

### 2.1 Clareza Acima de Tudo

**"O usuário deve entender o que fazer em menos de 3 segundos"**

- Hierarquia visual clara através de tamanho, cor e peso
- Uma ação primária por tela
- Textos concisos e diretos
- Ícones universalmente reconhecidos
- Feedback imediato para toda ação

**Exemplo Prático:**
```
❌ Evitar: "Efetuar o registro de uma nova movimentação financeira"
✅ Preferir: "Nova Despesa"
```

### 2.2 Consistência e Previsibilidade

**"Elementos similares devem se comportar de forma similar"**

- Botões primários sempre no mesmo local
- Cores consistentes para tipos de ação
- Padrões de navegação uniformes
- Linguagem consistente (termos técnicos vs coloquiais)
- Transições e animações coerentes

### 2.3 Redução de Fricção

**"Minimize o número de ações para completar uma tarefa"**

- Auto-preenchimento inteligente
- Valores padrão baseados em histórico
- Lançamento via WhatsApp para máxima conveniência
- Atalhos de teclado para usuários power
- Salvamento automático de rascunhos

**Métricas:**
- Lançar despesa: máximo 3 taps/clicks
- Consultar saldo: 1 tap/click
- Criar meta: máximo 5 campos obrigatórios

### 2.4 Feedback Positivo e Encorajamento

**"Transformar gestão financeira em um hábito positivo"**

- Celebrações visuais para conquistas
- Ana Clara oferece encorajamento constante
- Gamificação não-intrusiva
- Foco em progresso, não em perfeccionismo
- Linguagem humanizada e empática

### 2.5 Transparência Total

**"O usuário deve sempre saber 'onde está seu dinheiro'"**

- Saldos visíveis em todas as páginas
- Histórico completo acessível
- Origem de cada cálculo explicável
- Dados exportáveis a qualquer momento
- Zero lock-in, fácil de sair

### 2.6 Progressive Disclosure

**"Mostrar informações complexas gradualmente"**

- Cards colapsáveis para detalhes
- Dashboards com níveis de profundidade
- Tooltips para explicações adicionais
- Modo iniciante vs avançado
- Ana Clara como guia contextual

---

## 3. Design System

### 3.1 Paleta de Cores

#### 3.1.1 Cores Primárias

**Purple (Identidade da Marca)**
```
primary-50:  #f5f3ff  /* Backgrounds sutis */
primary-100: #ede9fe  /* Hover states leves */
primary-200: #ddd6fe
primary-300: #c4b5fd
primary-400: #a78bfa
primary-500: #8b5cf6  /* Principal - Botões, links */
primary-600: #7c3aed  /* Hover de botões */
primary-700: #6d28d9  /* Active state */
primary-800: #5b21b6
primary-900: #4c1d95
```

**Uso:**
- Botões primários, links, highlights
- Ana Clara (coach virtual)
- Ações principais
- Progress bars de metas

#### 3.1.2 Cores Funcionais

**Green (Receitas, Sucesso, Positivo)**
```
success-50:  #ecfdf5
success-100: #d1fae5
success-500: #10b981  /* Receitas, saldo positivo */
success-600: #059669  /* Hover */
success-700: #047857
```

**Red (Despesas, Perigo, Negativo)**
```
danger-50:  #fef2f2
danger-100: #fee2e2
danger-500: #ef4444   /* Despesas, alertas */
danger-600: #dc2626   /* Hover */
danger-700: #b91c1c
```

**Orange (Avisos, Atenção)**
```
warning-50:  #fffbeb
warning-100: #fef3c7
warning-500: #f59e0b  /* Alertas de orçamento */
warning-600: #d97706  /* Hover */
warning-700: #b45309
```

**Blue (Informações, Neutro Positivo)**
```
info-50:  #eff6ff
info-100: #dbeafe
info-500: #3b82f6   /* Informações, dados neutros */
info-600: #2563eb   /* Hover */
info-700: #1d4ed8
```

**Pink (Feminino - Modo Casal)**
```
pink-500: #ec4899   /* Representação feminina */
pink-600: #db2777
```

#### 3.1.3 Cores Neutras

**Gray Scale**
```
gray-50:  #f9fafb  /* Backgrounds */
gray-100: #f3f4f6  /* Cards alternativos */
gray-200: #e5e7eb  /* Borders, dividers */
gray-300: #d1d5db  /* Disabled states */
gray-400: #9ca3af
gray-500: #6b7280  /* Textos secundários */
gray-600: #4b5563  /* Textos primários */
gray-700: #374151
gray-800: #1f2937
gray-900: #111827  /* Headings */
```

#### 3.1.4 Gradientes

**Background Principal**
```css
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
/* Usado no body/container principal */
```

**Gradientes de Cartões**
```css
/* Sucesso/Receita */
linear-gradient(135deg, #10b981, #059669)

/* Perigo/Despesa */
linear-gradient(135deg, #ef4444, #dc2626)

/* Primary/Ana Clara */
linear-gradient(135deg, #8b5cf6, #7c3aed)

/* Warning/Alerta */
linear-gradient(135deg, #f59e0b, #d97706)

/* Info */
linear-gradient(135deg, #3b82f6, #2563eb)
```

### 3.2 Tipografia

#### 3.2.1 Família de Fontes

**Fonte Principal:** Inter (Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
```

**Rationale:**
- Legibilidade excepcional em tamanhos pequenos
- Design neutro e profissional
- Suporta números tabulares (alinhamento em tabelas)
- Ampla cobertura de pesos
- Otimizada para telas digitais

**Fallback Stack:**
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
```

#### 3.2.2 Escala Tipográfica

**Headings**
```
h1: 28px/36px (mobile/desktop) | font-weight: 800 | letter-spacing: -0.5px
h2: 20px/24px | font-weight: 700 | letter-spacing: -0.3px
h3: 16px/18px | font-weight: 600 | letter-spacing: 0.2px
h4: 14px/16px | font-weight: 600 | letter-spacing: 0.3px
```

**Body Text**
```
large:   16px | font-weight: 500 | line-height: 1.6
regular: 14px | font-weight: 400-500 | line-height: 1.6
small:   13px | font-weight: 500 | line-height: 1.5
tiny:    12px | font-weight: 500 | line-height: 1.4
```

**Display (Valores Financeiros)**
```
xxl: 32px | font-weight: 800 | (Saldo total dashboard)
xl:  28px | font-weight: 800 | (Valores principais cards)
lg:  20px | font-weight: 700 | (Subtotais)
md:  16px | font-weight: 700 | (Valores em listas)
```

#### 3.2.3 Uso e Hierarquia

**Hierarquia de Informação:**
1. **Mais Importante:** Valores monetários (bold, grande, cor destaque)
2. **Secundário:** Descrições/nomes (medium weight, tamanho médio)
3. **Terciário:** Datas, categorias (regular weight, menor, cor subtle)

**Exemplo de Card:**
```
R$ 47.498,31          ← Display XL, weight 800, primary color
Saldo Total           ← Body regular, weight 600, gray-600
↑ +12% vs mês anterior ← Small, weight 500, success-500
```

### 3.3 Espaçamentos e Grid

#### 3.3.1 Sistema de Espaçamento (8pt Grid)

**Base:** 8px (0.5rem)

```
xs:  4px  (0.25rem)  /* Gaps mínimos, padding interno badges */
sm:  8px  (0.5rem)   /* Gaps entre elementos relacionados */
md:  16px (1rem)     /* Padding padrão, gaps entre seções */
lg:  24px (1.5rem)   /* Padding de cards, gaps de grid */
xl:  32px (2rem)     /* Padding de containers grandes */
2xl: 40px (2.5rem)   /* Margins entre seções principais */
3xl: 48px (3rem)     /* Separação de blocos */
```

**Aplicações:**
```
Gap entre itens de lista: 12px (sm + xs)
Padding de cards mobile: 20px
Padding de cards desktop: 28px
Gap de grid mobile: 16px (md)
Gap de grid desktop: 20px (lg)
Margin bottom de seções: 20px
```

#### 3.3.2 Grid System

**Breakpoints:**
```
sm:  640px   (1 coluna → 2 colunas)
md:  768px   (mobile → tablet)
lg:  1024px  (tablet → desktop)
xl:  1280px  (desktop → wide)
2xl: 1536px  (wide → ultra-wide)
```

**Containers:**
```css
.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 10px;  /* mobile */
}

@media (min-width: 768px) {
  .container {
    padding: 20px;
  }
}
```

**Layouts de Grid:**
```css
/* 4 colunas (Stat Cards) */
.grid-4 {
  display: grid;
  grid-template-columns: 1fr;              /* mobile */
  gap: 20px;
}

@media (min-width: 640px) {
  .grid-4 {
    grid-template-columns: repeat(2, 1fr); /* tablet */
  }
}

@media (min-width: 1024px) {
  .grid-4 {
    grid-template-columns: repeat(4, 1fr); /* desktop */
  }
}

/* 2 colunas (Gráficos) */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr;              /* mobile */
  gap: 20px;
}

@media (min-width: 768px) {
  .grid-2 {
    grid-template-columns: repeat(2, 1fr); /* desktop */
  }
}
```

### 3.4 Bordas e Sombras

#### 3.4.1 Border Radius

```
none:   0px
xs:     4px   /* Badges, small buttons */
sm:     8px   /* Inputs, small cards */
md:     12px  /* Botões padrão, dropdowns */
lg:     16px  /* Cards, modais */
xl:     20px  /* Cards principais, containers */
2xl:    24px  /* Hero sections */
full:   9999px /* Pills, avatares */
```

**Uso por Componente:**
```
Botões: 12px
Cards: 20px
Inputs: 8px
Badges: 20px (full)
Stat Cards: 20px
IconBox: 16px
Modais: 20px
```

#### 3.4.2 Box Shadows

**Elevações:**
```css
/* sm - Cards em repouso */
box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);

/* md - Cards hover, dropdowns */
box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
            0 2px 4px -1px rgba(0, 0, 0, 0.06);

/* lg - Modais, cards destacados */
box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1),
            0 4px 6px -2px rgba(0, 0, 0, 0.05);

/* xl - Cards hover premium */
box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
            0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* 2xl - Modais importantes, overlays */
box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

/* Custom - Stat Cards Premium */
box-shadow: 0 10px 40px rgba(31, 38, 135, 0.4);

/* Custom - Stat Cards Hover */
box-shadow: 0 20px 60px rgba(31, 38, 135, 0.5);
```

**Shadows Coloridas (Botões):**
```css
/* Primary Button */
box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
/* Hover */
box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);

/* Success Button */
box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);

/* Danger Button */
box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
```

### 3.5 Iconografia

#### 3.5.1 Biblioteca de Ícones

**Fonte Primária:** Lucide React

**Rationale:**
- Consistência visual perfeita
- Biblioteca completa (1000+ ícones)
- Otimizada para React
- Customizável (stroke-width, color, size)
- Design moderno e minimalista

#### 3.5.2 Tamanhos de Ícones

```
tiny:   16px (1rem)     /* Ícones inline em texto */
small:  20px (1.25rem)  /* Ícones em botões */
base:   24px (1.5rem)   /* Ícones padrão em UI */
large:  28px (1.75rem)  /* Ícones em IconBox */
xl:     32px (2rem)     /* Ícones destacados */
2xl:    40px (2.5rem)   /* Ícones hero */
```

**Stroke Width:**
```
Default: 2px
Emphasis: 2.5px (headings, botões primários)
Subtle: 1.5px (ícones decorativos)
```

#### 3.5.3 Mapeamento de Ícones por Contexto

**Navegação (Sidebar):**
```
Home           → Home
Wallet         → Contas
List           → Transações
CreditCard     → Cartões de Crédito
Calendar       → Planejamento
Target         → Metas
TrendingUp     → Investimentos
BarChart3      → Relatórios
GraduationCap  → Educação
Settings       → Configurações
HelpCircle     → Ajuda
```

**Ações:**
```
Plus           → Adicionar
Minus          → Remover
Edit           → Editar
Trash2         → Excluir
Check          → Confirmar/Marcar como pago
X              → Cancelar/Fechar
Download       → Exportar
Upload         → Importar
Filter         → Filtrar
Search         → Buscar
MoreVertical   → Menu (kebab)
MoreHorizontal → Mais opções
```

**Categorias de Transação:**
```
Home           → Moradia
ShoppingCart   → Compras/Supermercado
Utensils       → Alimentação
Car            → Transporte
Heart          → Saúde
BookOpen       → Educação
Gamepad2       → Lazer
Zap            → Utilidades (luz, água, gás)
Wifi           → Internet
Smartphone     → Telefonia
Film           → Entretenimento
Shirt          → Vestuário
Gift           → Presentes
Plane          → Viagens
```

**Financeiro:**
```
TrendingUp     → Receitas
TrendingDown   → Despesas
ArrowUpCircle  → Entrada
ArrowDownCircle→ Saída
Repeat         → Transferência
CreditCard     → Cartão de Crédito
Wallet         → Carteira/Dinheiro
PiggyBank      → Poupança
LineChart      → Investimentos
DollarSign     → Dinheiro geral
```

**Status:**
```
CheckCircle2   → Sucesso/Pago
AlertCircle    → Atenção/Pendente
XCircle        → Erro/Atrasado
Clock          → Agendado/Futuro
Info           → Informação
AlertTriangle  → Aviso importante
```

**Ana Clara:**
```
MessageCircle  → Chat
Sparkles       → Insight/Dica
Lightbulb      → Ideia/Sugestão
Heart          → Encorajamento
ThumbsUp       → Aprovação
Bot            → Assistente Virtual
```

---

## 4. Arquitetura de Informação

### 4.1 Estrutura de Navegação

#### 4.1.1 Hierarquia de Informação

```
Nível 1: Navegação Principal (Sidebar)
├── 🏠 Dashboard (/)
├── 💰 Contas (/contas)
├── 📊 Transações (/transacoes)
├── 💳 Cartões de Crédito (/cartoes)
├── 📅 Planejamento (/planejamento)
├── 🎯 Metas (/metas)
├── 💎 Investimentos (/investimentos)
├── 📈 Relatórios (/relatorios)
├── 🎓 Educação Financeira (/educacao)
└── ⚙️ Configurações (/configuracoes)

Nível 2: Sub-navegação (Tabs/Filtros)
└── Exemplo: Relatórios
    ├── Despesas por Categoria
    ├── Tendências
    ├── Balanço Patrimonial
    ├── Fluxo de Caixa
    └── Meu Desempenho

Nível 3: Ações Contextuais (Modais/Drawers)
└── Exemplo: Transações → [+ Nova Despesa]
    └── Modal: Formulário de Despesa
```

#### 4.1.2 Breadcrumbs

**Quando usar:**
- Páginas de nível 2 ou mais profundas
- Navegação em configurações
- Detalhes de transações específicas

**Formato:**
```
Home / Transações / Editar Transação #1234
```

**Estilo:**
```
font-size: 13px
color: gray-500
separator: " / "
último item: bold, gray-900
```

### 4.2 Densidade de Informação

#### 4.2.1 Princípio da Escaneabilidade

**Regra 5-7-9:**
- Máximo 5 elementos por grupo visual
- Máximo 7 itens em menus/listas sem scroll
- Máximo 9 campos em formulários

**Exemplo: Stat Cards Dashboard**
```
✅ BOM: 4 cards (Saldo, Receitas, Despesas, Cartões)
❌ RUIM: 8 cards (informação demais, dificulta escaneamento)
```

#### 4.2.2 Hierarquia Visual por Peso

**Peso 1 (Mais Importante):**
- Valores monetários principais
- Ações primárias (botões CTA)
- Alertas críticos

**Peso 2 (Secundário):**
- Descrições de transações
- Nomes de categorias
- Subtotais

**Peso 3 (Terciário):**
- Datas
- Metadados (criado por, atualizado em)
- Hints e tooltips

### 4.3 Fluxo de Informação

#### 4.3.1 Padrão F de Leitura

**Layout Dashboard:**
```
[Header - Linha Horizontal]
Olá, Maria! | [Botões de Ação]

[Primeira Linha - Stat Cards]
💰 | 📈 | 📉 | 💳

[Conteúdo Principal - Coluna Esquerda]
Ana Clara Widget ←--- Atenção aqui
Transações Recentes

[Conteúdo Secundário - Coluna Direita]
Ações Rápidas
Cartões
```

#### 4.3.2 Hierarquia de Ações

**Ações Primárias:**
- Sempre visíveis
- Posicionadas no topo ou bottom-right (floating)
- Cor destacada (primary)
- Texto claro e acionável

**Ações Secundárias:**
- Visíveis mas menos proeminentes
- Cores neutras
- Podem estar em menus de contexto

**Ações Terciárias:**
- Escondidas em menus kebab (•••)
- Acessíveis via atalhos
- Ações destrutivas ou raras

---

## 5. Componentes UI

### 5.1 Botões

#### 5.1.1 Variantes de Botões

**Primary Button**
```
Uso: Ação principal da tela
Cor: primary-600 com gradiente
Hover: primary-700, translateY(-2px), shadow aumentado
Active: scale(0.95)
Disabled: opacity 50%, cursor not-allowed

HTML/JSX:
<button class="btn btn-primary">
  <Icon /> Texto do Botão
</button>

Specs:
- padding: 12px 24px
- border-radius: 12px
- font-weight: 600
- font-size: 14px
- box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3)
```

**Secondary Button**
```
Uso: Ações secundárias, cancelamentos
Cor: white com border gray-200
Hover: background gray-50, border primary-500
```

**Success Button**
```
Uso: Confirmações positivas, adicionar receitas
Cor: success-600 com gradiente
```

**Danger Button**
```
Uso: Ações destrutivas, adicionar despesas
Cor: danger-600 com gradiente
```

**Ghost Button**
```
Uso: Ações terciárias, links de texto
Cor: transparent, text primary-600
Hover: background primary-50
```

**Icon Button**
```
Uso: Ações com apenas ícone (editar, excluir, etc)
Size: 40x40px
Border-radius: 10px
```

#### 5.1.2 Estados de Botões

**Default → Hover → Active → Disabled**

```css
/* Default */
background: linear-gradient(135deg, #8b5cf6, #7c3aed);
transform: none;

/* Hover */
background: linear-gradient(135deg, #7c3aed, #6d28d9);
transform: translateY(-2px);
box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);

/* Active (pressed) */
transform: scale(0.95);

/* Disabled */
opacity: 0.5;
cursor: not-allowed;
pointer-events: none;

/* Loading */
cursor: wait;
opacity: 0.8;
[Icon] spinning animation
```

#### 5.1.3 Botão com Ícone

**Layout:**
```
[Icon 20px] [Gap 10px] [Texto]
```

**Diretrizes:**
- Ícone sempre à esquerda do texto
- Exceção: ícones de arrow podem estar à direita
- Ícone e texto alinhados verticalmente (center)

### 5.2 Cards

#### 5.2.1 Card Base

**Estrutura:**
```html
<div class="card">
  [Conteúdo]
</div>
```

**Specs:**
```css
.card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 20px; /* mobile */
  box-shadow: 0 10px 40px rgba(31, 38, 135, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.3);
  transition: all 0.3s ease;
}

@media (min-width: 768px) {
  .card {
    padding: 28px;
  }
}
```

#### 5.2.2 Stat Card (Card de Estatística)

**Anatomia:**
```
┌────────────────────────────┐
│ [IconBox]         [Badge]  │
│                            │
│ Título (h3)                │
│ Valor Principal (display)  │
│ Subtexto/Trend (small)     │
└────────────────────────────┘
```

**Comportamento:**
```css
.stat-card {
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

/* Border-top animado */
.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

.stat-card:hover::before {
  transform: scaleX(1);
}

.stat-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 60px rgba(31, 38, 135, 0.5);
}
```

**Specs:**
```
IconBox:
- Size: 56x56px
- Border-radius: 16px
- Gradiente por tipo
- Shadow: 0 8px 20px rgba(0,0,0,0.15)

Badge:
- Font-size: 13px
- Font-weight: 700
- Padding: 6px 14px
- Border-radius: 20px

Título:
- Font-size: 15px
- Font-weight: 600
- Color: gray-600
- Margin-bottom: 10px

Valor:
- Font-size: 28-32px
- Font-weight: 800
- Color: gray-900

Subtexto:
- Font-size: 12px
- Font-weight: 600
- Color: variável (success/danger/gray)
```

#### 5.2.3 Transaction Card (Item de Transação)

**Anatomia:**
```
┌──────────────────────────────────────────┐
│ [●] [Icon] Descrição        [R$ Valor]  │
│             Categoria • Data     [Menu]  │
└──────────────────────────────────────────┘
```

**Specs:**
```css
.transaction-item {
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 12px;
  background: white;
  border-left: 4px solid;
  transition: all 0.3s ease;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

/* Verde para receita, vermelho para despesa */
.transaction-income { border-left-color: #10b981; }
.transaction-expense { border-left-color: #ef4444; }

.transaction-item:hover {
  transform: translateX(8px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.1);
}
```

**Estados:**
```
Pago: opacity 1, check icon verde
Pendente: opacity 0.7, clock icon laranja
Atrasado: border-left vermelho escuro, alert icon
```

#### 5.2.4 Credit Card Preview

**Anatomia:**
```
┌─────────────────────────────────────────┐
│ MASTERCARD              [Badge Status]  │
│                                         │
│ R$ 3.551,57                            │
│ de R$ 5.000,00                         │
│                                         │
│ ████████████████░░░░  84%              │
│ Limite Disponível: R$ 795,37           │
│                                         │
│ Vence em: 14/10/2025                   │
└─────────────────────────────────────────┘
```

**Specs:**
```css
.credit-card {
  background: linear-gradient(135deg, [cor-bandeira]);
  border-radius: 16px;
  padding: 20px;
  color: white;
  box-shadow: 0 8px 20px rgba([cor], 0.3);
  transition: all 0.3s ease;
}

.credit-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 12px 30px rgba([cor], 0.4);
}
```

**Progress Bar:**
```css
.progress-bar-container {
  background: rgba(255,255,255,0.2);
  height: 8px;
  border-radius: 8px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: white;
  transition: width 0.5s ease;
}
```

### 5.3 Inputs e Forms

#### 5.3.1 Text Input

**Specs:**
```css
.input {
  width: 100%;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
}

.input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.input.error {
  border-color: #ef4444;
}
```

**Com Label:**
```html
<div class="input-group">
  <label for="desc">Descrição *</label>
  <input id="desc" type="text" class="input" placeholder="Ex: Almoço no restaurante">
</div>
```

**Label Specs:**
```css
label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}
```

#### 5.3.2 Select Dropdown

**Specs:**
```css
select {
  width: 100%;
  padding: 12px 45px 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  background: white;
  font-size: 14px;
  font-weight: 500;
  appearance: none;
  background-image: url([chevron-down-icon]);
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

select:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
}
```

#### 5.3.3 Date Picker

**Usar:** shadcn/ui Calendar + Popover

**Behavior:**
- Click no input → abre popover com calendário
- Navegação por mês/ano
- Highlight do dia atual
- Seleção visual clara
- Fechar com Esc ou click fora

#### 5.3.4 Toggle Switch

**Uso:** On/Off binário (ex: "Já foi paga?", "Recorrente?")

**Specs:**
```css
.toggle {
  width: 44px;
  height: 24px;
  border-radius: 24px;
  background: #d1d5db;
  transition: background 0.3s ease;
  cursor: pointer;
}

.toggle.active {
  background: #8b5cf6;
}

.toggle-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: white;
  transform: translateX(2px);
  transition: transform 0.3s ease;
}

.toggle.active .toggle-thumb {
  transform: translateX(22px);
}
```

#### 5.3.5 Textarea

**Specs:**
```css
textarea {
  min-height: 100px;
  resize: vertical;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
}
```

#### 5.3.6 File Upload

**Visual:**
```
┌─────────────────────────────────┐
│  📎 Arraste ou clique para      │
│     enviar comprovante          │
│                                 │
│  [Escolher Arquivo]             │
│                                 │
│  JPG, PNG ou PDF (máx 5MB)      │
└─────────────────────────────────┘
```

**Com Preview:**
```
[✓] comprovante.pdf (234 KB)  [×]
```

### 5.4 Modais e Dialogs

#### 5.4.1 Modal Estrutura

**Anatomia:**
```
[Overlay escuro backdrop-blur]
  ┌─────────────────────────────────────┐
  │ Header: Título           [× Fechar] │
  ├─────────────────────────────────────┤
  │                                     │
  │ Body: Conteúdo do modal             │
  │ (scrollable se necessário)          │
  │                                     │
  ├─────────────────────────────────────┤
  │ Footer: [Cancelar]    [Ação Primária]│
  └─────────────────────────────────────┘
```

**Specs:**
```css
/* Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease-out;
}

/* Container */
.modal-container {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: scaleIn 0.3s ease-out;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Header */
.modal-header {
  background: linear-gradient(135deg, #667eea, #764ba2);
  padding: 24px 32px;
  border-radius: 20px 20px 0 0;
  color: white;
}

/* Body */
.modal-body {
  padding: 32px;
  overflow-y: auto;
  max-height: calc(90vh - 180px);
}

/* Footer */
.modal-footer {
  padding: 20px 32px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
```

#### 5.4.2 Confirmation Dialog

**Uso:** Ações destrutivas (excluir, arquivar)

**Exemplo:**
```
⚠️ Excluir Transação?

Esta ação não pode ser desfeita.
A transação será removida permanentemente.

[Cancelar]  [Excluir]
```

**Specs:**
- Ícone de alerta no topo
- Texto claro e direto
- Botão destrutivo em vermelho
- Foco padrão no "Cancelar" (segurança)

#### 5.4.3 Toast Notifications

**Uso:** Feedback rápido de ações

**Posição:** Bottom-right (desktop) ou Top-center (mobile)

**Tipos:**
```
Success: ✓ Transação salva com sucesso!
Error:   ✕ Erro ao salvar transação
Warning: ⚠ Atenção: limite de cartão atingindo 90%
Info:    ℹ Ana Clara tem uma dica para você
```

**Specs:**
```css
.toast {
  min-width: 300px;
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 12px;
  animation: slideInRight 0.3s ease-out;
}

.toast-success { background: #ecfdf5; border-left: 4px solid #10b981; }
.toast-error { background: #fef2f2; border-left: 4px solid #ef4444; }
.toast-warning { background: #fffbeb; border-left: 4px solid #f59e0b; }
```

**Auto-dismiss:** 5 segundos (pode ser customizado)

### 5.5 Badges e Labels

#### 5.5.1 Badge Component

**Specs:**
```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.3px;
}

.badge-success { background: #d1fae5; color: #065f46; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-danger { background: #fee2e2; color: #991b1b; }
.badge-info { background: #dbeafe; color: #1e40af; }
```

**Uso:**
- Status de transações (Pago, Pendente, Atrasado)
- Tipo de conta (Corrente, Poupança)
- Categorias (visual quick scan)

#### 5.5.2 Label Tag

**Uso:** Tags filtráveis, categorias múltiplas

**Specs:**
```css
.tag {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  background: #f3f4f6;
  color: #374151;
}

.tag-removable {
  padding-right: 4px;
}

.tag-remove-btn {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #d1d5db;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  cursor: pointer;
}
```

### 5.6 Sidebar Navigation

#### 5.6.1 Estrutura

**Desktop (Largura: 240px):**
```
┌─────────────────────┐
│ [Logo]              │
│ Personal Finance LA │
├─────────────────────┤
│ [+ Novo] (destaque) │
├─────────────────────┤
│ 🏠 Dashboard        │
│ 💰 Contas           │
│ 📊 Transações       │
│ 💳 Cartões          │
│ 📅 Planejamento     │
│ 🎯 Metas            │
│ 💎 Investimentos    │
│ 📈 Relatórios       │
│ 🎓 Educação         │
│ ••• Mais opções     │
├─────────────────────┤
│ ⚙️ Configurações    │
│ ❓ Ajuda            │
└─────────────────────┘
```

**Mobile (Overlay):**
- Hamburger icon no header
- Slide-in da esquerda
- Overlay escuro backdrop
- Mesmo conteúdo do desktop
- Fechar com X ou tap fora

#### 5.6.2 Item de Menu

**Specs:**
```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  color: #6b7280;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
}

.nav-item:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.nav-item.active {
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  color: #6b21a8;
  font-weight: 600;
}

.nav-item.active::before {
  content: '';
  width: 4px;
  height: 100%;
  background: #8b5cf6;
  position: absolute;
  left: 0;
  border-radius: 0 4px 4px 0;
}
```

#### 5.6.3 Botão "Novo"

**Specs:**
```css
.new-button {
  width: calc(100% - 32px);
  margin: 16px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  font-weight: 700;
  font-size: 16px;
  border-radius: 14px;
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.3);
  transition: all 0.3s ease;
}

.new-button:hover {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(139, 92, 246, 0.4);
}
```

---

## 6. Padrões de Interação

### 6.1 Feedback Imediato

**Princípio:** Todo input do usuário deve ter resposta visual em < 100ms

#### 6.1.1 Click/Tap Feedback

```css
/* Botões */
:active {
  transform: scale(0.95);
}

/* Cards clicáveis */
:active {
  transform: scale(0.98);
}
```

#### 6.1.2 Hover States

**Desktop apenas:**
```
Botões: Elevação + cor mais escura
Cards: Elevação + border animado
Links: Underline suave
Icons: Cor de destaque
```

**Não usar hover em:**
- Mobile/Touch devices
- Elementos informativos (não clicáveis)

### 6.2 Estados de Loading

#### 6.2.1 Skeleton Screens

**Uso:** Durante carregamento inicial de conteúdo

**Exemplo: Loading de Stat Cards**
```html
<div class="skeleton-card">
  <div class="skeleton-icon"></div>
  <div class="skeleton-text"></div>
  <div class="skeleton-value"></div>
</div>
```

**Animação:**
```css
@keyframes shimmer {
  0% { background-position: -1000px; }
  100% { background-position: 1000px; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #e0e0e0 50%,
    #f0f0f0 75%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
```

#### 6.2.2 Spinners

**Uso:** Ações assíncronas (salvar, deletar, carregar mais)

**Tipos:**
```
- Circular (padrão): dentro de botões
- Linear (progress bar): uploads, processos demorados
- Dots: carregamento de lista/feed
```

**Specs:**
```css
.spinner {
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 6.3 Drag and Drop

**Uso:** Reordenar categorias, contas, metas

**Estados:**
```
1. Idle: Cursor default
2. Grabbable: Cursor grab (hover)
3. Dragging: Cursor grabbing, opacity 0.7, placeholder visual
4. Drop Target: Background highlight, border dashed
5. Dropped: Animação de "settle" para nova posição
```

**Specs:**
```css
.draggable {
  cursor: grab;
  transition: opacity 0.3s ease;
}

.dragging {
  cursor: grabbing;
  opacity: 0.7;
  transform: rotate(3deg);
}

.drop-target {
  background: rgba(139, 92, 246, 0.1);
  border: 2px dashed #8b5cf6;
}
```

### 6.4 Gestos Mobile

#### 6.4.1 Swipe Actions

**Uso:** Transações, contas a pagar

**Gestos:**
```
Swipe Left → Exibe ações destrutivas (Excluir)
Swipe Right → Exibe ações positivas (Marcar como paga)
```

**Specs:**
```
Threshold: 30% da largura do item
Animação: Ease-out 0.2s
Reset: Snap back se < threshold
```

#### 6.4.2 Pull to Refresh

**Uso:** Listas de transações, dashboard

**Comportamento:**
```
1. Usuário puxa para baixo
2. Ícone de refresh aparece
3. Ao soltar, spinner + feedback
4. Conteúdo atualiza
5. Animação de "snap back"
```

### 6.5 Busca e Filtros

#### 6.5.1 Search Input

**Comportamento:**
```
1. Usuário digita (debounce 300ms)
2. Results aparecem em tempo real
3. Highlight do termo buscado nos resultados
4. "X" para limpar busca
5. Sugestões de busca recente
```

**Specs:**
```css
.search-input {
  padding-left: 40px; /* Espaço para ícone */
  background-image: url([search-icon]);
  background-position: 12px center;
  background-repeat: no-repeat;
}
```

#### 6.5.2 Filtros Sidebar

**Layout:**
```
[Filtros] ← Collapsible
├─ 📅 Período
│   └─ [Date Range Picker]
├─ 💰 Tipo
│   └─ [Checkboxes]
├─ 💳 Conta
│   └─ [Multiselect]
└─ [Limpar] [Aplicar]
```

**Behavior:**
- Filtros persistem durante sessão
- Badge com número de filtros ativos
- Aplicação em tempo real (opcional)
- Botão "Limpar Filtros" sempre visível quando há filtros

### 6.6 Empty States

**Princípio:** Nunca deixar o usuário sem orientação

#### 6.6.1 Empty State Pattern

```
┌─────────────────────────────────┐
│                                 │
│         [Ilustração]            │
│                                 │
│     Nenhuma transação ainda     │
│                                 │
│  Comece registrando sua         │
│  primeira despesa ou receita    │
│                                 │
│    [+ Nova Transação]           │
│                                 │
└─────────────────────────────────┘
```

**Elementos:**
1. Ilustração friendly (não apenas ícone)
2. Título claro
3. Subtexto explicativo
4. CTA direto
5. (Opcional) Tutorial/Help link

**Exemplos:**
```
- Transações vazias: "Organize suas finanças"
- Metas vazias: "Crie sua primeira meta"
- Cartões vazios: "Adicione seus cartões"
- Relatórios sem dados: "Aguardando transações"
```

---

## 7. Fluxos de Usuário

### 7.1 Onboarding Flow

**Objetivo:** Configurar perfil e fazer primeiro lançamento em < 3 minutos

#### 7.1.1 Steps

```
Step 1: Boas-vindas
├─ Tela de splash com logo
├─ "Bem-vindo ao Personal Finance LA"
└─ [Começar]

Step 2: Autenticação
├─ Login com Google
├─ Login com Apple
└─ (Opcional) Email/Senha

Step 3: Perfil Básico
├─ Nome completo*
├─ Meta de economia mensal (%)
└─ [Continuar]

Step 4: Primeira Conta
├─ Criar conta "Carteira"
├─ Saldo inicial
└─ [Criar Conta]

Step 5: Primeira Transação (Tutorial)
├─ Guia interativo
├─ "Vamos lançar sua primeira despesa"
├─ Formulário simplificado
└─ [Salvar]

Step 6: Conhecer Ana Clara
├─ Apresentação da coach
├─ Explicação sobre WhatsApp
└─ [Conectar WhatsApp] [Pular por agora]

Step 7: Tour do Dashboard
├─ Highlight de elementos principais
├─ 5 tooltips sequenciais
└─ [Finalizar Tour]
```

**Progress Indicator:**
```
○ ● ○ ○ ○ ○ ○  (Step 2 de 7)
```

### 7.2 Lançamento de Transação

#### 7.2.1 Via Dashboard (Tradicional)

```
1. Usuário clica [+ Nova Despesa]
2. Modal abre com foco no campo "Descrição"
3. Usuário preenche:
   - Descrição (obrigatório)
   - Valor (obrigatório)
   - Data (padrão: hoje)
   - Conta (padrão: última usada)
   - Categoria (sugestão por NLP se possível)
4. Usuário clica [Salvar]
5. Loading spinner no botão (0.5s)
6. Modal fecha com animação
7. Toast de sucesso aparece
8. Dashboard atualiza em tempo real
9. Ana Clara pode dar feedback positivo
```

**Atalhos:**
- Ctrl/Cmd + N → Abre modal
- Tab → Navega entre campos
- Enter → Salva (se form válido)
- Esc → Fecha modal

#### 7.2.2 Via WhatsApp (Mágico)

```
1. Usuário envia mensagem no WhatsApp
   Ex: "Gastei 45 reais no mercado"

2. N8N recebe webhook

3. LLM processa e estrutura:
   {
     type: "expense",
     amount: 45.00,
     category: "Supermercado",
     description: "Compras no mercado",
     date: "2025-11-25"
   }

4. N8N envia de volta para Supabase

5. Supabase Realtime notifica frontend

6. Dashboard atualiza automaticamente

7. Ana Clara confirma via WhatsApp:
   "✅ Registrado!
   🛒 Compras - Supermercado
   💰 R$ 45,00
   Carteira: R$ 2.290,00"
```

### 7.3 Planejamento Mensal

**Objetivo:** Criar orçamento em < 5 minutos

```
1. Navegar para /planejamento

2. Se primeiro acesso:
   ├─ Empty state
   ├─ [Definir Novo Planejamento]
   └─ [Copiar do Mês Anterior] (se existe histórico)

3. Se Novo Planejamento:
   ├─ Modal: "Planejar [Mês/Ano]"
   ├─ Receitas Esperadas
   │   └─ [+ Adicionar Receita]
   ├─ Orçamento por Categoria
   │   └─ Lista de categorias com inputs R$
   └─ [Salvar Planejamento]

4. Se Copiar:
   ├─ Carrega dados do mês anterior
   ├─ Permite edições
   └─ [Salvar]

5. Durante o mês:
   ├─ Página mostra: Planejado vs Realizado
   ├─ Progress bars por categoria
   ├─ Alertas quando atingir 75%, 90%, 100%
   └─ Ana Clara dá dicas contextuais
```

### 7.4 Criação de Meta

```
1. Navegar para /metas

2. Clicar [+ Nova Meta]

3. Modal abre:
   ├─ Nome da Meta* (Ex: "Viagem Europa")
   ├─ Ícone (seletor visual com emojis)
   ├─ Valor Alvo* (R$ 30.000,00)
   ├─ Data Alvo* (Dez/2026)
   ├─ Valor Inicial (R$ 0,00)
   ├─ [Calculadora de Aportes]
   │   └─ "Com base no prazo, você precisa de R$ 2.307/mês"
   └─ [Criar Meta]

4. Validação:
   ├─ Todos campos obrigatórios preenchidos?
   └─ Data alvo é futura?

5. Salvar:
   ├─ Animação de confete 🎉
   ├─ Modal fecha
   ├─ Card da meta aparece na lista
   └─ Ana Clara parabeniza e incentiva

6. Tracking:
   ├─ Botão [+ Adicionar Valor] sempre visível
   ├─ Progress bar atualiza em tempo real
   ├─ Notificações em marcos (25%, 50%, 75%, 100%)
   └─ Histórico de contribuições
```

### 7.5 Visualização de Relatórios

```
1. Navegar para /relatorios

2. Selecionar período:
   ├─ Dropdown: Mês / Trimestre / Semestre / Ano / Personalizado
   └─ Date Range Picker (se Personalizado)

3. Tabs:
   ├─ [Despesas por Categoria] ← Default
   ├─ [Tendências]
   ├─ [Balanço Patrimonial]
   ├─ [Fluxo de Caixa]
   └─ [Meu Desempenho]

4. Cada tab carrega:
   ├─ Skeleton screens durante loading
   ├─ Gráficos interativos
   ├─ Insights da Ana Clara
   └─ Botão [Exportar PDF] no topo

5. Interação com gráficos:
   ├─ Hover: Tooltip com detalhes
   ├─ Click em categoria: Drill-down
   ├─ Legend: Toggle de séries
   └─ Zoom/Pan em gráficos de linha

6. Exportar:
   ├─ Modal: "Exportar Relatório de [Período]"
   ├─ Opções: PDF / Excel / CSV
   ├─ Incluir gráficos? (toggle)
   └─ [Gerar e Baixar]
```

---

## 8. Responsividade

### 8.1 Breakpoints Strategy

```
Mobile First Approach:
1. Design para 375px (iPhone SE)
2. Expandir para 768px (iPad)
3. Expandir para 1024px (Desktop)
4. Otimizar para 1440px+ (Wide Desktop)
```

### 8.2 Component Adaptations

#### 8.2.1 Sidebar

```
Mobile (<768px):
- Escondida por padrão
- Hamburger menu no header
- Overlay escuro quando aberta
- Slide-in animation da esquerda
- Full-width

Tablet/Desktop (≥768px):
- Sempre visível
- Fixa à esquerda
- Largura: 240px
- Não colapsável
```

#### 8.2.2 Grid Layouts

```
Grid 4 Colunas (Stat Cards):
Mobile:  1 coluna
Tablet:  2 colunas (≥640px)
Desktop: 4 colunas (≥1024px)

Grid 2 Colunas (Gráficos):
Mobile:  1 coluna
Desktop: 2 colunas (≥768px)

Grid 3 Colunas (Raros):
Mobile:  1 coluna
Tablet:  2 colunas (≥768px)
Desktop: 3 colunas (≥1024px)
```

#### 8.2.3 Typography Scale

```
Mobile:
h1: 28px
h2: 20px
body: 14px
Display: 28px

Desktop:
h1: 36px
h2: 24px
body: 14-16px
Display: 32px
```

#### 8.2.4 Spacing Adjustments

```
Mobile:
Card padding: 20px
Grid gap: 16px
Header padding: 16px

Desktop:
Card padding: 28px
Grid gap: 20px
Header padding: 24px
```

### 8.3 Touch Targets

**Mínimo:** 44x44px (iOS HIG / Material Design)

```
Botões mobile: min 44px altura
Icons tappable: 44x44px touch area
List items: min 48px altura
Checkboxes: 24x24px visual, 44x44px touch
```

### 8.4 Mobile-Specific Patterns

#### 8.4.1 Bottom Navigation (Alternativa)

**Se precisar de acesso rápido:**
```
[Dashboard] [Transações] [+ Novo] [Metas] [Mais]
```

#### 8.4.2 Sticky Headers

```css
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
```

#### 8.4.3 Floating Action Button

**Mobile:**
```
Position: fixed bottom-right
Size: 56x56px
Shadow: Elevated
Action: Abrir menu de [Nova Despesa/Receita]
```

---

## 9. Acessibilidade

### 9.1 WCAG 2.1 Level AA Compliance

#### 9.1.1 Contrast Ratios

**Mínimos:**
```
Texto normal (< 18px): 4.5:1
Texto grande (≥ 18px): 3:1
UI Components: 3:1
```

**Verificação:**
```
gray-900 (#111827) em white → 16.5:1 ✓
primary-600 (#7c3aed) em white → 5.2:1 ✓
gray-600 (#4b5563) em white → 7.5:1 ✓
success-600 (#059669) em white → 3.8:1 ✓
```

#### 9.1.2 Keyboard Navigation

**Ordem de Foco:**
```
1. Sidebar navigation
2. Header actions
3. Main content (top to bottom, left to right)
4. Modals (trap focus dentro)
5. Footers
```

**Visible Focus:**
```css
*:focus-visible {
  outline: 2px solid #8b5cf6;
  outline-offset: 2px;
}

/* Exceção: Inputs já têm border focus */
input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #8b5cf6;
  box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
}
```

**Atalhos de Teclado:**
```
Tab: Próximo elemento
Shift+Tab: Elemento anterior
Enter: Ativar botão/link
Space: Toggle checkbox/switch
Esc: Fechar modal/dropdown
↑↓: Navegar em listas/selects
```

#### 9.1.3 ARIA Labels

**Botões com apenas ícone:**
```html
<button aria-label="Editar transação">
  <EditIcon />
</button>
```

**Status dinâmicos:**
```html
<div role="status" aria-live="polite">
  Transação salva com sucesso
</div>
```

**Modais:**
```html
<div role="dialog" aria-labelledby="modal-title" aria-modal="true">
  <h2 id="modal-title">Nova Despesa</h2>
  ...
</div>
```

**Form Labels:**
```html
<label for="amount">Valor *</label>
<input id="amount" type="text" aria-required="true">
```

#### 9.1.4 Screen Reader Support

**Landmarks:**
```html
<header role="banner">...</header>
<nav role="navigation" aria-label="Principal">...</nav>
<main role="main">...</main>
<aside role="complementary">...</aside>
<footer role="contentinfo">...</footer>
```

**Lista de Transações:**
```html
<ul role="list" aria-label="Transações de novembro">
  <li role="listitem">
    <span class="sr-only">Despesa de</span>
    R$ 45,00
    <span class="sr-only">em</span>
    Supermercado
    <span class="sr-only">em</span>
    25 de novembro
  </li>
</ul>
```

### 9.2 Reduced Motion

**Respeitar preferência do usuário:**
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 9.3 Color Blindness

**Nunca usar apenas cor para comunicar:**
```
❌ Evitar: Texto vermelho para erro (só cor)
✅ Preferir: Ícone ✕ + Texto vermelho + Border vermelho

❌ Evitar: Progress bar só por cor
✅ Preferir: Progress bar + Percentual textual + Ícone de status
```

**Paleta acessível:**
- Verde e Vermelho têm suficiente contraste entre si
- Ícones sempre acompanham cores de status
- Patterns adicionais em gráficos (não só cores)

### 9.4 Text Scaling

**Suportar zoom até 200%:**
```css
/* Usar rem para fontes */
font-size: 0.875rem; /* 14px base */

/* Evitar height fixo em containers de texto */
min-height: 2.5rem; /* Ao invés de height */

/* Permitir wrap em textos */
white-space: normal;
word-wrap: break-word;
```

---

## 10. Ana Clara - Coach Virtual

### 10.1 Personalidade e Tom

**Persona:**
- Nome: Ana Clara
- Idade: ~30 anos
- Profissão: Coach de Finanças Pessoais
- Personalidade: Simpática, positiva, realista, empática

**Tom de Voz:**
```
✅ Fazer:
- Usar linguagem acessível e direta
- Celebrar pequenas vitórias
- Oferecer encorajamento constante
- Dar dicas práticas e acionáveis
- Usar emojis moderadamente (1-2 por mensagem)
- Ser empática com dificuldades

❌ Evitar:
- Ser condescendente ou infantilizar
- Julgar escolhas financeiras
- Usar jargões sem explicar
- Ser excessivamente otimista
- Pressionar ou causar ansiedade
- Emojis excessivos
```

**Exemplos de Mensagens:**

```
Positivo:
"🎉 Parabéns! Você economizou 19% esse mês. Continue assim!"

Alerta Suave:
"💡 Percebi que seu cartão está com 84% do limite usado. Que tal revisar alguns gastos?"

Encorajamento:
"Sua meta 'Viagem Europa' está em 67%! Você está quase lá. Que tal fazer um aporte extra esse mês?"

Educacional:
"📚 Você sabia? Investir no Tesouro Selic é uma ótima opção para sua reserva de emergência por ter liquidez diária."

Insights:
"Vi que você gastou R$ 450 com streaming esse mês. Todos os serviços estão sendo usados? 🤔"
```

### 10.2 Widgets e Interfaces

#### 10.2.1 Inline Card (Dashboard)

**Layout:**
```
┌─────────────────────────────────────────┐
│ 👩‍💼 Ana Clara diz:                       │
│ Sua coach financeira virtual            │
├─────────────────────────────────────────┤
│                                         │
│ [Mensagem Principal com backdrop blur] │
│ 🎉 Parabéns! Você está no caminho...   │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│ [Dica Secundária com backdrop blur]    │
│ 💡 Dica do dia: ...                     │
│ [Ver Detalhes]                          │
│                                         │
└─────────────────────────────────────────┘
```

**Specs:**
```css
.ana-clara-card {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  border: none;
}

.message-box {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
}
```

#### 10.2.2 Floating Button

**Posição:** Fixed bottom-right (30px margin)

**Specs:**
```css
.ana-clara-floating {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  box-shadow: 0 8px 30px rgba(139, 92, 246, 0.4);
  border: 4px solid white;
  transition: all 0.3s ease;
  z-index: 999;
}

.ana-clara-floating:hover {
  transform: scale(1.1) rotate(5deg);
  box-shadow: 0 12px 40px rgba(139, 92, 246, 0.5);
}

/* Pulse animation */
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.ana-clara-floating.has-notification {
  animation: pulse 2s infinite;
}
```

**Badge de Notificação:**
```css
.notification-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: #ef4444;
  border-radius: 50%;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}
```

#### 10.2.3 Chat Modal

**Layout:**
```
┌─────────────────────────────────────────┐
│ 👩‍💼 Ana Clara  •  Online      [× Fechar] │
├─────────────────────────────────────────┤
│ [Histórico de Mensagens - Scrollable]   │
│                                         │
│ ┌─────────────────┐                    │
│ │ Olá! Como posso │ ← Ana Clara         │
│ │ te ajudar?      │                    │
│ └─────────────────┘                    │
│                                         │
│                    ┌─────────────────┐ │
│         Usuário →  │ Qual meu saldo? │ │
│                    └─────────────────┘ │
│                                         │
│ ┌─────────────────┐                    │
│ │ Seu saldo é... │                    │
│ └─────────────────┘                    │
│                                         │
├─────────────────────────────────────────┤
│ [Sugestões Rápidas]                     │
│ • Ver meu saldo                         │
│ • Próximas contas                       │
│ • Dicas do mês                          │
├─────────────────────────────────────────┤
│ [Input] Digite sua mensagem...    [🔊]  │
└─────────────────────────────────────────┘
```

**Specs:**
```
Desktop: 400px width, 600px height, bottom-right
Mobile: Fullscreen modal

Mensagem Ana Clara:
- Align left
- Background: primary-100
- Color: primary-900
- Avatar à esquerda

Mensagem Usuário:
- Align right
- Background: gray-100
- Color: gray-900
- Sem avatar

Timestamp:
- Font-size: 11px
- Color: gray-500
- Abaixo de cada mensagem
```

### 10.3 Gatilhos de Interação

**Quando Ana Clara aparece:**

1. **Onboarding:** Apresentação inicial
2. **Conquistas:** Celebração de marcos
3. **Alertas:** Orçamento, vencimentos, limites
4. **Insights:** Padrões identificados
5. **Educação:** Dicas contextuais
6. **Encorajamento:** Períodos de inatividade

**Frequência:**
- Máximo 3 mensagens proativas por dia
- Sempre responde quando usuário inicia conversa
- Notificações podem ser configuradas nas Settings

### 10.4 Personalização

**Ana Clara aprende:**
- Padrões de gastos do usuário
- Horários preferidos de uso
- Categorias mais usadas
- Metas e objetivos pessoais
- Tom de resposta (formal vs casual baseado no input do usuário)

**Dados que alimentam IA:**
```
- Histórico de transações
- Orçamentos vs realizado
- Metas e progresso
- Interações anteriores com Ana Clara
- Configurações de preferências
```

---

## 11. Animações e Microinterações

### 11.1 Timing Functions

```css
/* Material Design inspired */
ease-standard: cubic-bezier(0.4, 0.0, 0.2, 1)
ease-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1)
ease-accelerate: cubic-bezier(0.4, 0.0, 1, 1)

/* Uso */
transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
```

### 11.2 Duração de Animações

```
Micro (hover, focus): 100-150ms
Curta (transitions): 200-300ms
Média (modais, slides): 300-500ms
Longa (page transitions): 500-700ms
```

### 11.3 Animações Específicas

#### 11.3.1 Fade In (Cards, Page Load)

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.6s ease-out;
}
```

#### 11.3.2 Scale In (Modais)

```css
@keyframes scaleIn {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
```

#### 11.3.3 Slide In (Sidebar Mobile)

```css
@keyframes slideInLeft {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}
```

#### 11.3.4 Bounce (Success Feedback)

```css
@keyframes bounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

#### 11.3.5 Shimmer (Loading Skeleton)

```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
```

#### 11.3.6 Pulse (Notificações)

```css
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

#### 11.3.7 Spin (Loading)

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### 11.4 Microinterações por Componente

#### 11.4.1 Botões

```
Hover:
- Transform: translateY(-2px)
- Shadow: Aumentar
- Color: Escurecer 10%
- Duration: 200ms

Active:
- Transform: scale(0.95)
- Duration: 100ms

Loading:
- Spinner animation
- Opacity: 0.8
- Cursor: wait
```

#### 11.4.2 Cards

```
Hover:
- Transform: translateY(-8px)
- Shadow: Aumentar dramaticamente
- Border-top: Scale X de 0 para 1
- Duration: 300ms
- Icon: Rotate 5-6deg

Click:
- Transform: scale(0.98)
- Duration: 100ms
```

#### 11.4.3 Inputs

```
Focus:
- Border color: Transition 200ms
- Shadow: Fade in 200ms
- Label: Color transition

Type:
- Character appear: Immediate
- Auto-complete: Fade in 150ms
```

#### 11.4.4 Checkboxes/Toggles

```
Check:
- Checkmark: Draw animation (SVG path)
- Background: Color transition 200ms
- Scale: Slight bounce

Toggle:
- Thumb: Slide animation 300ms ease
- Background: Color transition 300ms
```

#### 11.4.5 Transações

```
Add:
- Fade in + Slide down from top
- Duration: 400ms

Remove:
- Slide out to right + Fade out
- Duration: 300ms
- Remaining items: Slide up to fill gap

Update:
- Highlight flash (yellow → white)
- Duration: 600ms
```

---

## 12. Estados e Feedback

### 12.1 Estados de Componentes

#### 12.1.1 Botões

```
1. Default
   - Cores padrão
   - Cursor: pointer

2. Hover
   - Elevação
   - Cor escurecida

3. Active (pressed)
   - Scale(0.95)

4. Focus
   - Outline visível

5. Loading
   - Spinner
   - Opacity reduzida
   - Cursor: wait
   - Disabled

6. Disabled
   - Opacity: 50%
   - Cursor: not-allowed
   - Sem hover effects

7. Success (temporário após ação)
   - ✓ Icon
   - Green background
   - Auto-revert após 2s
```

#### 12.1.2 Inputs

```
1. Empty
   - Border: neutral
   - Placeholder visível

2. Filled
   - Placeholder escondido

3. Focus
   - Border: primary
   - Shadow: glow
   - Label: primary color

4. Valid
   - Border: success
   - ✓ Icon à direita

5. Invalid
   - Border: danger
   - ✕ Icon à direita
   - Error message abaixo

6. Disabled
   - Background: gray-100
   - Cursor: not-allowed
```

#### 12.1.3 Cards de Transação

```
1. Default
   - Border-left colorido
   - Background: white

2. Hover
   - TranslateX(8px)
   - Shadow aumentado

3. Selected
   - Background: primary-50
   - Checkbox checked

4. Editing
   - Inline form
   - Save/Cancel buttons

5. Paga
   - Opacity: 1
   - ✓ Icon verde

6. Pendente
   - Opacity: 0.7
   - ⏰ Icon laranja

7. Atrasada
   - Border-left: danger-700
   - ⚠ Icon vermelho
```

### 12.2 Feedback Visual

#### 12.2.1 Sucesso

**Toast Notification:**
```
Background: success-50
Border-left: success-500
Icon: ✓ CheckCircle2
Text: "Transação salva com sucesso!"
Duration: 5s
Position: bottom-right
```

**Inline Feedback:**
```
✅ Salvo automaticamente
```

**Confete Animation:**
```
Uso: Ao completar meta 100%
Library: canvas-confetti
Duration: 3s
```

#### 12.2.2 Erro

**Toast Notification:**
```
Background: danger-50
Border-left: danger-500
Icon: ✕ XCircle
Text: "Erro ao salvar. Tente novamente."
Duration: 7s (mais tempo)
Action: [Tentar Novamente]
```

**Inline Feedback:**
```
⚠️ Erro ao carregar dados
[Tentar Novamente]
```

**Form Errors:**
```
<input class="error" />
<span class="error-message">
  ✕ Campo obrigatório
</span>
```

#### 12.2.3 Aviso

**Toast:**
```
Background: warning-50
Border-left: warning-500
Icon: ⚠ AlertTriangle
Text: "Você atingiu 90% do orçamento de Alimentação"
```

**Banner (topo da página):**
```
┌─────────────────────────────────────────┐
│ ⚠ Atenção: 3 contas vencendo hoje      │
│                            [Ver Contas] │
└─────────────────────────────────────────┘
```

#### 12.2.4 Info

**Toast:**
```
Background: info-50
Border-left: info-500
Icon: ℹ Info
Text: "Ana Clara tem uma dica para você"
Action: [Ver Dica]
```

### 12.3 Loading States

#### 12.3.1 Skeleton Screens

**Quando usar:**
- Carregamento inicial de página
- Dados ainda não disponíveis
- Melhora percepção de performance

**Onde usar:**
- Dashboard (loading stat cards)
- Lista de transações
- Gráficos
- Cards de cartões

#### 12.3.2 Spinners

**Quando usar:**
- Ações assíncronas (salvar, deletar)
- Carregar mais itens (infinite scroll)
- Refresh manual

**Tipos:**
```
Circular: Dentro de botões, inline
Linear: Progress bars, uploads
Dots: Carregamento de listas
```

#### 12.3.3 Progress Bars

**Quando usar:**
- Uploads de arquivos
- Processos demorados (>3s)
- Importação de dados

**Specs:**
```css
.progress-bar {
  height: 4px;
  background: gray-200;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #7c3aed);
  transition: width 0.3s ease;
}
```

### 12.4 Empty States

**Componentes:**
1. Ilustração/Ícone grande (não genérico)
2. Título claro
3. Subtexto explicativo
4. CTA primário
5. (Opcional) CTA secundário ou help link

**Exemplo:**
```
     [Ilustração de meta]

  Nenhuma meta criada ainda

 Defina seus objetivos financeiros
 e acompanhe seu progresso

    [+ Criar Primeira Meta]

     [Ver exemplos de metas]
```

---

## 13. Diretrizes de Conteúdo

### 13.1 Voz e Tom

#### 13.1.1 Voz da Marca

**Personal Finance LA é:**
- Acessível (não intimidante)
- Profissional (mas não corporativo)
- Empoderador (não paternalista)
- Positivo (mas realista)
- Educador (não didático)

**Personal Finance LA NÃO é:**
- Informal demais
- Técnico em excesso
- Condescendente
- Alarmista
- Vendedor

#### 13.1.2 Tom por Contexto

**Onboarding:**
```
Voz: Acolhedora, entusiasmada
Tom: "Bem-vindo! Vamos organizar suas finanças juntos?"
```

**Transações Diárias:**
```
Voz: Direta, prática
Tom: "Despesa de R$ 45,00 registrada"
```

**Alertas:**
```
Voz: Cuidadosa, não alarmante
Tom: "Seu cartão está com 84% do limite usado. Vamos revisar?"
```

**Celebrações:**
```
Voz: Entusiasmada, encorajadora
Tom: "🎉 Parabéns! Você alcançou sua meta!"
```

**Erros:**
```
Voz: Compreensiva, solucionadora
Tom: "Ops! Algo deu errado. Vamos tentar novamente?"
```

### 13.2 Escrita de Microcopy

#### 13.2.1 Botões

```
✅ BOM:
- Nova Despesa
- Salvar Transação
- Criar Meta
- Exportar Relatório

❌ EVITAR:
- Registrar Nova Movimentação Financeira
- Submeter Formulário
- OK
- Clique Aqui
```

**Princípios:**
- Iniciar com verbo de ação
- Ser específico sobre o resultado
- Usar no máximo 3 palavras
- Evitar jargões

#### 13.2.2 Labels de Formulário

```
✅ BOM:
- Descrição da despesa
- Valor (R$)
- Data do pagamento
- Conta de origem

❌ EVITAR:
- Input de descrição
- Digite o valor
- Selecione
- Campo obrigatório (redundante com *)
```

**Princípios:**
- Ser descritivo sem ser verboso
- Usar linguagem natural
- Indicar formato esperado
- Usar * para obrigatório

#### 13.2.3 Mensagens de Erro

```
✅ BOM:
- "Campo obrigatório"
- "Valor deve ser maior que zero"
- "Data não pode ser futura"
- "Erro ao salvar. Tente novamente."

❌ EVITAR:
- "Erro: NULL value in field"
- "Invalid input"
- "Erro 404"
- "Algo deu errado" (sem orientação)
```

**Princípios:**
- Explicar o que está errado
- Sugerir como corrigir
- Ser específico
- Evitar jargões técnicos
- Oferecer ação de recuperação

#### 13.2.4 Empty States

```
✅ BOM:
Título: "Nenhuma transação ainda"
Texto: "Comece registrando sua primeira despesa ou receita"
CTA: "+ Nova Transação"

❌ EVITAR:
Título: "Não há dados"
Texto: "0 results found"
CTA: "Add"
```

#### 13.2.5 Tooltips e Hints

```
✅ BOM:
"Saldo previsto considera contas a pagar e receber futuras"
"Clique para ver detalhes da transação"
"Este valor é atualizado em tempo real"

❌ EVITAR:
"Predicted balance"
"More info"
"Real-time value"
```

### 13.3 Formatação de Valores

#### 13.3.1 Valores Monetários

**Formato Padrão:**
```
R$ 1.234,56
R$ 0,00
R$ 47.498,31
```

**Regras:**
- Sempre incluir R$
- Separador de milhares: . (ponto)
- Separador decimal: , (vírgula)
- Sempre 2 casas decimais
- Espaço entre R$ e valor

**Contextos:**
```
Display grande: R$ 47.498,31
Lista: R$ 1.234,56
Inline texto: aproximadamente R$ 1.200
```

#### 13.3.2 Datas

**Formato Padrão:**
```
DD/MM/YYYY → 25/11/2025
DD/MM → 25/11 (mesmo ano)
Hoje
Ontem
Amanhã
```

**Contextos:**
```
Transação recente: "Hoje, 14:32"
Transação antiga: "25/11/2025"
Relatórios: "Novembro 2025"
Range: "01/11 - 30/11/2025"
```

#### 13.3.3 Porcentagens

**Formato:**
```
84%
+12%
-8%
```

**Regras:**
- Sem espaço entre número e %
- Incluir sinal + ou - para variações
- Cor conforme contexto (verde +, vermelho -)

#### 13.3.4 Números Grandes

**Abreviações (opcional):**
```
1.000 → 1K
1.000.000 → 1M
1.000.000.000 → 1B
```

**Uso:**
- Gráficos com espaço limitado
- Labels de eixos
- Cards de overview
- SEMPRE mostrar valor completo em tooltip

---

## 14. Conclusão

Este documento estabelece a fundação completa para a experiência de usuário do Personal Finance LA. Todos os padrões, componentes e diretrizes aqui definidos devem ser seguidos consistentemente em todo o produto para garantir:

- **Coerência Visual:** Experiência unificada em todas as telas
- **Usabilidade:** Interfaces intuitivas que reduzem fricção
- **Acessibilidade:** Inclusão de todos os usuários
- **Escalabilidade:** Base sólida para futuras expansões
- **Profissionalismo:** Confiança através de design refinado

### Próximos Passos

1. **Implementação Gradual:** Priorizar componentes core primeiro
2. **Testes de Usabilidade:** Validar padrões com usuários reais
3. **Iteração Constante:** Refinar baseado em feedback
4. **Documentação Viva:** Atualizar este documento conforme evolução

---

**Documento mantido por:** LA Music Team  
**Última atualização:** Novembro 2025  
**Versão:** 1.0.0