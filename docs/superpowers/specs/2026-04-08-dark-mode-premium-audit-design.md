# Dark Mode Premium Audit Design

## Goal
Levar o dark mode do Finance LA para um estado consistente, sofisticado e confiável em todo o sistema, cobrindo correção de inconsistências visuais e evolução da linguagem visual para um padrão premium em desktop e mobile.

## Scope
Esta auditoria cobre:

- foundation visual do dark mode
- shell global do app
- primitives compartilhados
- páginas autenticadas principais
- páginas auxiliares
- modais, overlays, toasts, dropdowns e FABs
- gráficos e componentes de data viz
- comportamento desktop e mobile

Esta etapa inclui auditoria e desenho de execução para:

- `Dashboard`
- `Contas`
- `Transações`
- `Cartões`
- `Contas a Pagar`
- `Metas`
- `Investimentos`
- `Relatórios`
- `Educação`
- `LessonViewer`
- `Configurações`
- `Perfil`
- `Login`
- `Tags`
- `Categorias`
- páginas auxiliares ainda existentes no código (`Accounts`, `Transactions`, `Planning`, `TestEmail`, `TestePage`)

## Explicit Non-Goals
Esta etapa não:

- redesenha a arquitetura inteira do produto
- converte o app para mobile-first de forma estrutural
- muda a identidade visual principal da marca
- reescreve todos os componentes de uma vez
- transforma a auditoria em refactor sem prioridade

O objetivo é preservar o que já funciona, corrigir o que quebra o dark mode e elevar o acabamento visual para um padrão premium.

## Visual North Star

### Product feeling
O dark mode do Finance LA deve transmitir:

- profundidade
- clareza
- controle
- confiança
- acabamento premium

Ele não deve parecer:

- template dark genérico
- tema “gamer neon”
- light mode apenas invertido
- mistura de superfícies claras e escuras sem regra

### Approved direction
A direção visual validada para esta auditoria é `luxury/refined`, inspirada nas referências fornecidas pelo usuário:

- base `navy` profunda
- contraste alto em tipografia e métricas
- cards bem recortados e com contorno sutil
- pouco brilho, mas brilho intencional
- roxo como assinatura, não como cor dominante de tudo
- acentos controlados em tabs, indicadores, foco e highlights
- visual clean, mas não frio ou sem personalidade

### Design principles for this dark mode
1. `Surface first`
   O protagonista do dark mode é a qualidade das superfícies, não o gradiente.

2. `Accent with restraint`
   O roxo da marca aparece como assinatura em foco, estado ativo, detalhes de destaque e alguns headers estratégicos, sem tingir toda a interface.

3. `Data must lead`
   Em produto financeiro, números, gráficos e estados precisam ser mais fortes do que decoração.

4. `One darkness system`
   Fundo global, cards, painéis, modais, menus, tabelas e gráficos precisam parecer parte do mesmo sistema.

5. `Premium means controlled contrast`
   Não basta escurecer o fundo. É preciso controlar bem texto primário, secundário, borda, superfície elevada, hover, active e estados semânticos.

## Inspiration Signals From The References
As referências enviadas sugerem sinais visuais claros que devem orientar o Finance LA:

- fundo muito escuro com leve nuance azulada
- headers e sidebars com separação limpa
- tabs e filtros com brilho de acento pontual
- cards com pouca borda, mas borda suficiente para leitura
- grande clareza em métricas numéricas
- linhas, barras e badges sem excesso de saturação
- uso de cor funcional com significado claro

Tradução para o Finance LA:

- manter estrutura escura refinada semelhante à sensação das referências
- substituir o acento ciano/azul dominante por roxo de marca mais controlado
- preservar leitura forte em widgets, gráficos e cards de resumo
- elevar a sofisticação do shell e dos painéis densos

## Current Reality From Audit

### Foundation already in place
Existe uma base de tokens e tema em:

- `src/index.css`
- `src/contexts/ThemeContext.tsx`
- diversos primitives em `src/components/ui/*`

Esses arquivos já indicam a intenção correta: uso de tokens como `background`, `card`, `foreground`, `border`, `input`, `muted`.

### Confirmed structural inconsistencies
Há mistura entre a base tokenizada e superfícies hardcoded em muitos pontos do app.

Problemas confirmados:

1. `Shell com fundo claro fixo`
   - `src/components/layout/MainLayout.tsx` usa `bg-gray-50` no container principal.

2. `Header e Sidebar parcialmente tematizados, mas ainda hardcoded`
   - `src/components/layout/Header.tsx`
   - `src/components/layout/Sidebar.tsx`

3. `Páginas core ainda com canvas de light mode`
   Exemplos claros:
   - `src/pages/Contas.tsx`
   - `src/pages/Transacoes.tsx`
   - `src/pages/Investments.tsx`
   - `src/pages/Reports.tsx`
   - `src/pages/CreditCards.tsx`
   - `src/pages/Education.tsx`
   - `src/pages/Tags.tsx`

4. `Mistura de cards corretos com cards pintados à mão`
   Algumas telas usam `Card` baseado em tokens, mas logo em seguida sobrescrevem com `bg-white`, `border-gray-200`, `text-gray-900`, `bg-purple-600`, etc.

5. `Semântica de cor inconsistente`
   O mesmo tipo de estado às vezes usa:
   - cor sólida
   - gradient
   - background claro
   - badge clara em página escura
   sem regra global clara.

6. `Charts e analytics com linguagem visual heterogênea`
   Há páginas com bons blocos escuros e outras com charts ou wrappers ainda ancorados em superfícies claras ou sem contraste refinado.

7. `Mobile behavior não é ainda um sistema`
   O app é majoritariamente desktop-first. A auditoria precisa validar mobile real sem tentar reescrever toda a arquitetura agora.

### Visual symptoms confirmed by screenshots
Os screenshots enviados mostram padrões recorrentes:

- fundo claro vazando em páginas dark
- páginas com boa base dark, mas com seções ou modais fora do padrão
- diferença de qualidade entre shell, cards, modais e gráficos
- widgets premium convivendo com componentes genéricos
- inconsistência entre densidade desktop e adaptação mobile

## Architecture Decision
Usar uma abordagem `híbrida em 2 camadas`.

### Layer 1: Foundation audit
Primeiro, auditar e definir o dark mode premium no nível estrutural:

- tokens
- shell
- primitives
- estados
- overlays
- charts
- responsividade base

### Layer 2: Page-by-page audit
Depois, auditar cada página com scorecard padronizado, já separando:

- o que é problema estrutural
- o que é problema local
- o que é oportunidade de polimento premium

## Foundation Premium Contract

### 1. Canvas and surfaces
O sistema deve operar com pelo menos quatro camadas visuais distintas:

- `app canvas`
- `base surface`
- `elevated surface`
- `overlay surface`

Cada uma precisa ser perceptível no dark mode sem depender de borda agressiva.

### 2. Typography hierarchy
O dark mode premium precisa distinguir claramente:

- título principal
- valor financeiro
- subtítulo
- label
- texto auxiliar
- placeholder
- legenda de gráfico

Valores financeiros e números-chave devem ser visualmente mais fortes que textos decorativos ou ícones.

### 3. Accent rules
O roxo da marca deve ser usado prioritariamente em:

- estado ativo
- foco
- destaque de seção
- assinatura em headers especiais
- FAB da Ana
- destaques pontuais em gráficos ou chips quando fizer sentido

O roxo não deve ser o preenchimento padrão de todos os botões e painéis.

### 4. Semantic color rules
Estados funcionais precisam ter consistência visual em dark mode:

- sucesso
- alerta
- erro
- informativo
- selecionado
- pendente

Cada estado deve combinar:

- cor de texto
- intensidade de fundo
- intensidade de borda
- comportamento em badge
- comportamento em card

### 5. Border and separation rules
As bordas devem ser:

- suficientes para estruturar a leitura
- discretas
- coerentes entre cards, tabelas, tabs, inputs e dialogs

Separação premium no dark mode depende mais de:

- diferença de superfície
- borda sutil
- sombra contida
- respiro

do que de linhas claras agressivas.

### 6. Overlay contract
Modais, menus e painéis flutuantes precisam:

- destacar-se do fundo
- ter profundidade consistente
- evitar aparência lavada
- manter contraste de conteúdo e foco

### 7. Data visualization contract
Charts no dark mode devem padronizar:

- cor de gridline
- cor de legenda
- tooltip
- contraste entre série principal e secundária
- uso de cor semântica
- contraste entre área de plot e card

### 8. Responsive dark mode contract
Em mobile, a validação deve garantir:

- leitura de cards densos
- tabs e filtros utilizáveis
- dialogs não esmagados
- side menu coerente
- FAB e botões sem sobrepor conteúdo crítico
- listas e tabelas com fallback usável

## Audit Method

### Status scale
- `Aprovado`
- `Ajuste leve`
- `Ajuste moderado`
- `Crítico`

### Severity scale
- `P0` quebra visual grave, contraste perigoso ou usabilidade comprometida
- `P1` inconsistência muito visível em tela relevante
- `P2` polimento relevante
- `P3` acabamento fino

### Classification of findings
- `Foundation`
- `Shell`
- `Component`
- `Page`
- `Responsive`
- `Premium polish`

## Standard Scorecard Per Page
Cada página deve ser auditada com os seguintes critérios:

1. `Superfície`
2. `Contraste`
3. `Hierarquia`
4. `Semântica de cor`
5. `Componentes interativos`
6. `Estados`
7. `Data viz`
8. `Desktop`
9. `Mobile`
10. `Acabamento premium`

Cada página na spec de execução deve registrar:

- status desktop
- status mobile
- dependências da foundation
- achados P0/P1/P2/P3
- correções obrigatórias
- polimentos premium
- checklist de validação

## Inventory To Audit

### Block 0: Foundation and shell
- `src/index.css`
- `src/contexts/ThemeContext.tsx`
- `src/components/layout/MainLayout.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/Sidebar.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/dialog.tsx`
- dropdowns, toasts, badges, switch, table and related primitives

### Block 1: Core daily-use pages
- `src/pages/Dashboard.tsx`
- `src/pages/Contas.tsx`
- `src/pages/Transacoes.tsx`
- `src/pages/CreditCards.tsx`
- `src/pages/Settings.tsx`

### Block 2: Analytical and planning pages
- `src/pages/PayableBills.tsx`
- `src/pages/Goals.tsx`
- `src/pages/Investments.tsx`
- `src/pages/Reports.tsx`
- `src/pages/Education.tsx`
- `src/pages/LessonViewer.tsx`

### Block 3: Auxiliary and support pages
- `src/pages/Profile.tsx`
- `src/pages/Login.tsx`
- `src/pages/Tags.tsx`
- `src/pages/Categories.tsx`

### Block 4: Non-core but still covered
- `src/pages/Accounts.tsx`
- `src/pages/Transactions.tsx`
- `src/pages/Planning.tsx`
- `src/pages/TestEmail.tsx`
- `src/pages/TestePage.tsx`

### Cross-cutting component families
- dashboard widgets
- account and transaction modals
- credit card and invoice dialogs
- reports and analytics panels
- payable bills panels
- goals dialogs and summary widgets
- investment analytics widgets
- settings cards and forms
- education cards and lesson surfaces

## Execution Order

### Phase 1: Foundation premium dark mode
Outcome:
- definir o contrato visual do dark mode
- remover vazamentos mais evidentes de light mode
- estabilizar superfícies, bordas, contraste e estados base

Primary surfaces:
- tokens
- main layout
- header
- sidebar
- shared primitives

### Phase 2: Global shell and navigation polish
Outcome:
- navegação coerente em dark mode
- avatar menu, FAB, dropdowns, tabs e overlays integrados à linguagem premium

### Phase 3: Dashboard
Outcome:
- dashboard vira a página modelo do dark mode premium
- widgets, gráficos, cards de resumo e painéis densos passam a servir de referência para o resto do produto

### Phase 4: Accounts, transactions and cards
Outcome:
- `Contas`, `Transações` e `Cartões` ficam consistentes com a foundation
- formulários e modais entram no padrão premium

### Phase 5: Bills, goals, investments and reports
Outcome:
- as páginas mais densas e analíticas ganham consistência em charts, tabelas, badges e painéis

### Phase 6: Settings, profile and login
Outcome:
- formulários, tabs e áreas de configuração entram no padrão premium
- o dark mode deixa de ser “forte no dashboard, fraco no resto”

### Phase 7: Education and auxiliary pages
Outcome:
- educação, lesson viewer, tags, categorias e telas auxiliares deixam de parecer domínios separados

### Phase 8: Desktop/mobile regression pass
Outcome:
- fechamento do ciclo com validação real desktop e mobile
- saneamento de overflow, densidade, tabs, modais, FABs e listas

## Recommended Priority Hotspots
Estes pontos já aparecem como hotspots claros e devem receber atenção cedo:

1. `MainLayout` com canvas hardcoded
2. `Header` e `Sidebar` com mistura de tokens e classes fixas
3. `Contas` com vários blocos ainda ancorados em `bg-gray-50`, `bg-white` e `bg-purple-600`
4. `Transacoes` com forte uso de superfícies claras, badges claras e estados heterogêneos
5. `Investments` e `Reports` com risco alto em charts, tabelas e painéis analíticos
6. `Dashboard` como página-modelo para consolidar a linguagem final

## Acceptance Criteria
Esta auditoria estará pronta para virar execução somente quando:

- a direção visual do dark mode premium estiver explícita e validada
- a foundation estiver separada dos ajustes locais
- todas as páginas do sistema estiverem inventariadas
- o scorecard de auditoria estiver definido
- a ordem de execução minimizar retrabalho
- desktop e mobile estiverem incluídos como critério obrigatório

## Delivery Recommendation
Converter esta spec em plano de implementação por etapas e tasks, mantendo a mesma divisão:

1. foundation
2. shell
3. páginas core
4. páginas densas/analíticas
5. páginas auxiliares
6. regressão desktop/mobile

Isso permite avançar página por página, com validação controlada, sem perder a coerência sistêmica do dark mode premium.
