# Product Requirements Document (PRD)
# Personal Finance LA

---

## 📋 Sumário Executivo

**Produto:** Personal Finance LA  
**Versão:** 1.0 (MVP)  
**Data:** Novembro 2025  
**Timeline:** 3 meses para MVP  
**Modelo de Negócio:** Gratuito  

### Visão Geral

Personal Finance LA é um sistema de gestão financeira pessoal que revoluciona o controle de gastos através da integração nativa com WhatsApp, permitindo lançamentos por texto, áudio e imagem. Com a coach virtual Ana Clara, o sistema oferece orientação personalizada, análises preditivas e gamificação para transformar o controle financeiro em um hábito positivo.

### Diferencial Competitivo

O grande diferencial do Personal Finance LA é a experiência híbrida **WhatsApp + Dashboard**, eliminando a fricção de abrir um app para cada lançamento. O usuário registra suas despesas e receitas naturalmente via mensagem, enquanto a IA Ana Clara organiza tudo automaticamente na dashboard web.

---

## 👥 Personas

### Persona 1: Maria - Professora de Música

- **Idade:** 28 anos
- **Ocupação:** Professora de música na LA Music
- **Renda:** R$ 3.500/mês
- **Objetivos:** Começar a investir, criar reserva de emergência, organizar gastos mensais
- **Dores:** Esquece de anotar gastos, não tem tempo para abrir apps, não sabe investir
- **Comportamento:** Usa WhatsApp o dia todo, gosta de incentivos e feedback positivo

### Persona 2: Susan - Psicóloga e Empresária

- **Idade:** 43 anos
- **Ocupação:** Psicóloga com consultório próprio
- **Renda:** R$ 15.000/mês
- **Objetivos:** Diversificar investimentos, planejar aposentadoria, controlar fluxo de caixa
- **Dores:** Tem múltiplas fontes de renda, gastos empresariais misturados com pessoais
- **Comportamento:** Quer análises sofisticadas mas praticidade no dia a dia

---

## 🎯 Objetivos do Produto

### Objetivos de Negócio

1. Criar um sistema financeiro pessoal que sirva como base para futuros produtos LA
2. Testar viabilidade da integração WhatsApp para lançamentos financeiros
3. Validar o conceito de coach financeiro virtual (Ana Clara)
4. Construir base de usuários entre funcionários e clientes da LA Music/Bistro LA

### Objetivos dos Usuários

1. Registrar despesas e receitas de forma rápida e natural via WhatsApp
2. Visualizar saúde financeira de forma clara e intuitiva
3. Receber orientações personalizadas para melhorar gestão financeira
4. Acompanhar metas e objetivos financeiros com feedback constante
5. Planejar o futuro financeiro (aposentadoria, grandes compras)

---

## 🏗️ Arquitetura e Stack Tecnológico

### Frontend

- **Framework:** React 18+ com TypeScript
- **UI Library:** Tailwind CSS + shadcn/ui
- **PWA:** Service Workers para funcionalidade offline
- **Ambiente de Desenvolvimento:** Lovable (prototipação) → Windsurf/Cursor (desenvolvimento final)

### Backend

- **Database:** Supabase (PostgreSQL)
- **Autenticação:** Supabase Auth (Google, Apple)
- **Real-time:** Supabase Realtime Subscriptions
- **Storage:** Supabase Storage (para imagens de comprovantes)

### Integrações e APIs

- **WhatsApp:** UAZAPI para envio/recebimento de mensagens
- **Automação:** N8N para workflows de processamento de mensagens
- **Mercado Financeiro:**
  - B3 API (ações e fundos brasileiros)
  - Tesouro Direto API oficial
  - Banco Central API (cotações de câmbio)
  - CoinGecko/Binance API (criptomoedas)
- **IA/LLM:** OpenAI GPT-4 ou Claude para Ana Clara

### Infraestrutura

- **Hospedagem:** Vercel/Netlify (frontend) + Supabase (backend)
- **N8N:** Self-hosted ou N8N Cloud para automações
- **Monitoramento:** Sentry para error tracking

---

## 🤖 Ana Clara - Coach Financeira Virtual

### Personalidade e Tom de Voz

- **Nome:** Ana Clara
- **Papel:** Coach de Finanças Pessoais
- **Personalidade:** Simpática, positiva, realista e encorajadora
- **Tom:** Amigável mas profissional, usa linguagem acessível sem ser infantil

### Responsabilidades da Ana Clara

#### 1. Categorização Inteligente

- Categoriza automaticamente transações via NLP
- Aprende com correções do usuário
- Identifica recorrências automaticamente

#### 2. Análise Preditiva

- Prevê gastos futuros baseado em histórico
- Alerta sobre possíveis estouros de orçamento
- Sugere ajustes no planejamento mensal

#### 3. Alertas e Lembretes

- **1 dia antes do vencimento:** "Oi! Amanhã vence sua conta de energia (R$ 230,00). Tudo certo para o pagamento?"
- **No dia do vencimento:** "Hoje é dia de pagar a fatura do Nubank (R$ 5.190,09). Já efetuou o pagamento?"
- **Alertas personalizados:** "Percebi que você gastou 80% do seu orçamento de alimentação e ainda faltam 15 dias para o fim do mês 🤔"

#### 4. Orientações e Insights

- **Feedback positivo:** "Parabéns! 🎉 Você economizou 19% dos seus ganhos esse mês. Continue assim!"
- **Dicas contextuais:** "Vi que você gasta R$ 450/mês com streaming. Que tal revisar se está usando todos os serviços?"
- **Educação financeira:** Explica conceitos quando relevante (ex: quando usuário pergunta sobre Tesouro Direto)

#### 5. Resumos Inteligentes

- **Diário:** "Seu dia: 3 gastos (R$ 127,50) • Lembra de lançar o almoço? 😊"
- **Semanal:** "Semana fechada: R$ 847,30 em despesas • Principais: alimentação (45%), transporte (28%)"
- **Mensal:** Relatório completo com comparativos e insights

---

## 📱 Experiência WhatsApp - Core Feature

### Fluxo de Onboarding WhatsApp

1. Usuário se cadastra na plataforma web
2. Recebe QR Code ou link para iniciar conversa com Ana Clara
3. Ana Clara se apresenta e explica como funciona
4. Tutorial interativo com exemplos práticos

### Tipos de Lançamento via WhatsApp

#### 1. Lançamento por Texto

```
Usuário: "Gastei 45 reais no mercado"

Ana Clara: "✅ Registrado! 
🛒 Compras - Supermercado
💰 R$ 45,00
📅 Hoje, 14:32
Carteira: R$ 2.455,00 → R$ 2.410,00"
```

#### 2. Lançamento por Áudio

```
Usuário: [áudio] "Almoço no Bistro LA, foram 38 reais"

Ana Clara: "✅ Entendi! 
🍽️ Alimentação - Restaurante
💰 R$ 38,00
📅 Hoje, 12:45
Está correto? (Sim/Corrigir)"
```

#### 3. Lançamento por Imagem

```
Usuário: [foto da nota fiscal do Pão de Açúcar]

Ana Clara: "📸 Analisando nota...
✅ Registrado! 
🛒 Compras - Supermercado
💰 R$ 234,56
📅 21/11/2025
🏪 Pão de Açúcar
Cartão Nubank: Limite R$ 4.765,44"
```

### Comandos Rápidos WhatsApp

- **"Saldo"** → Retorna saldo atual de todas as contas
- **"Resumo"** → Resumo do dia/semana/mês
- **"Contas"** → Lista contas a vencer
- **"Meta [nome]"** → Status de uma meta específica
- **"Relatório [mês]"** → Envia relatório completo
- **"Ajuda"** → Menu de comandos

---

## 🎨 Interface Web (Dashboard)

### Estrutura de Navegação

```
├── 🏠 Dashboard
├── 💰 Contas
├── 📊 Transações
├── 💳 Cartões de Crédito
├── 📅 Planejamento Mensal
├── 🎯 Metas Financeiras
├── 💎 Investimentos
├── 📈 Relatórios
├── 🎓 Educação Financeira
└── ⚙️ Configurações
```

### Dashboard - Tela Principal

#### Cards Superiores (KPIs)

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│  💵 Saldo Atual │  📈 Receitas    │  📉 Despesas    │  💳 Cartões     │
│  R$ 47.498,31  │  R$ 0,00        │  R$ 19.637,85   │  R$ 6.324,14    │
│  ↑ 12% vs mês  │  🟢 No prazo    │  🔴 -8% do meta │  84% utilizado  │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

#### Ana Clara - Widget Interativo

```
┌───────────────────────────────────────────────────────────────┐
│ 👩‍💼 Ana Clara diz:                                             │
│                                                               │
│ Oi! Seu desempenho esse mês está muito bom! 🎉               │
│ Você economizou 19% dos seus ganhos.                         │
│                                                               │
│ 💡 Dica: Que tal investir esse valor na sua meta             │
│    "Viagem para Europa"? Você está 67% perto do objetivo!    │
│                                                               │
│ [Ver Metas] [Falar com Ana]                                  │
└───────────────────────────────────────────────────────────────┘
```

#### Gráficos e Análises

- **Despesas por Categoria** (donut chart)
- **Receitas por Categoria** (donut chart)
- **Balanço Mensal** (bar chart vertical - receitas vs despesas)
- **Tendência de 6 meses** (line chart)

---

## 💰 Página: Contas

### Cards de Contas

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│ 💵 Carteira                 │  │ 🏦 Itaú - Conta Corrente   │
│                             │  │                             │
│ Saldo Atual:  R$ 0,00      │  │ Saldo Atual:  R$ 47.285,87 │
│ Previsto:     R$ -59.651   │  │ Previsto:     R$ 47.511,91 │
│                             │  │ 🔗 Open Finance             │
│ [Adicionar Despesa]         │  │ [Ver Extrato]               │
└─────────────────────────────┘  └─────────────────────────────┘
```

### Funcionalidades

- Criar nova conta (Carteira, Conta Corrente, Poupança, Investimento)
- Ícones personalizados por instituição
- Saldo previsto (calcula contas a pagar/receber futuras)
- Transferências entre contas

---

## 📊 Página: Transações

### Filtros e Busca

- Período (dia/semana/mês/customizado)
- Tipo (Despesa/Receita/Transferência)
- Categoria
- Conta
- Status (Paga/Pendente)
- Busca textual

### Lista de Transações

```
┌──────────────────────────────────────────────────────────────────────┐
│  Novembro 2025                                          [Filtros] [+] │
├──────────────────────────────────────────────────────────────────────┤
│ ⚠️ 📅 25/11  ANUIDADE DIFERENCI...  💳 Operação bancária  R$ 14,99  │
│ ⚠️ 📅 25/11  NETFLIX.COM           📺 Assinaturas       R$ 59,90   │
│ ⚠️ 📅 25/11  7 Link                🌐 Internet          R$ 99,00   │
│ ⚠️ 📅 25/11  Naturgy               ⚡ Gás Naturgy       R$ 120,00  │
└──────────────────────────────────────────────────────────────────────┘
```

### Ações Rápidas

- Editar transação (inline ou modal)
- Duplicar transação
- Marcar como paga/recebida
- Anexar comprovante
- Categorizar
- Adicionar observações

---

## 💳 Página: Cartões de Crédito

### Cards de Faturas

```
┌────────────────────────────────────────────────────┐
│ 🔴 FREE MASTERCARD ...                [•••]        │
│ Fatura paga                      🔗 Open Finance   │
│                                                    │
│ Valor pago:          R$ 3.551,57                  │
│ Pagamento:           14 de outubro de 2025        │
│                                                    │
│ ██████████████████░░░░░░  84.09%                  │
│ R$ 4.204,63 de R$ 5.000,00                        │
│ Limite Disponível R$ 795,37                       │
│                                                    │
│ [Ver Detalhes]  [Pagar Fatura]                    │
└────────────────────────────────────────────────────┘
```

### Funcionalidades

- Gerenciar múltiplos cartões
- Faturas abertas vs fechadas (tabs)
- Lançar compras no cartão
- Parcelamento automático
- Integração Open Finance (futuro - não no MVP)
- Alertas de vencimento

---

## 📅 Página: Planejamento Mensal

### Configuração de Orçamento

```
┌────────────────────────────────────────────────────────┐
│ 📅 Novembro 2025                                       │
│                                                        │
│ Receitas do mês:      R$ 0,00          [+ Adicionar]  │
│ Gastos planejados:    R$ 0,00                         │
│ Balanço planejado:    R$ 0,00                         │
│ Economia planejada:   0.00%                           │
└────────────────────────────────────────────────────────┘
```

### Categorias do Orçamento

- Moradia (aluguel, condomínio, IPTU)
- Alimentação (supermercado, restaurantes)
- Transporte (combustível, transporte público)
- Saúde (plano de saúde, farmácia, consultas)
- Educação (cursos, livros, material)
- Lazer (cinema, viagens, hobbies)
- Outros

---

## 🎯 Página: Metas Financeiras

### Cards de Metas

```
┌──────────────────────────────────────────────────────┐
│ 🏖️ Viagem para Europa                               │
│                                                      │
│ ████████████████░░░░  67%                           │
│ R$ 20.100,00 de R$ 30.000,00                        │
│                                                      │
│ 📅 Prazo: Dezembro 2026 (13 meses)                  │
│ 💰 Faltam: R$ 9.900,00                              │
│ 📊 Aporte mensal sugerido: R$ 761,54                │
│                                                      │
│ [Ver Detalhes]  [Adicionar Valor]  [Editar]        │
└──────────────────────────────────────────────────────┘
```

### Funcionalidades

- Criar metas (nome, valor alvo, prazo)
- Ícones e imagens personalizadas
- Tracking automático de progresso
- Simulador de aportes
- Histórico de contribuições
- Celebrações ao atingir marcos (25%, 50%, 75%, 100%)

### Gamificação de Metas

- Badges ao completar metas
- Streak de contribuições mensais
- Ranking de progresso (modo casal)

---

## 💎 Página: Investimentos

### Portfólio Overview

```
┌─────────────────────────────────────────────────────────┐
│ 💎 Seu Portfólio de Investimentos                      │
│                                                         │
│ Total Investido:     R$ 125.430,00                     │
│ Valorização:         R$ 8.234,50 (+7,02%)             │
│ Valor Atual:         R$ 133.664,50                     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ 📊 Distribuição por Tipo                               │
│ ██████░░░░  Renda Fixa      45%   R$ 60.149,03        │
│ ████░░░░░░  Ações B3        30%   R$ 40.099,35        │
│ ███░░░░░░░  Fundos          15%   R$ 20.049,68        │
│ ██░░░░░░░░  Criptomoedas    10%   R$ 13.366,45        │
└─────────────────────────────────────────────────────────┘
```

### Integrações de Mercado

#### Renda Fixa (Tesouro Direto API)

- Lista de títulos do Tesouro
- Cotação em tempo real
- Simulador de rentabilidade
- Calculadora de impostos (IR regressivo)

#### Ações e Fundos (B3 API)

- Busca de ações por ticker
- Cotação atual e variação do dia
- Gráfico de performance histórica
- Informações da empresa

#### Criptomoedas (CoinGecko/Binance)

- Top criptos por market cap
- Cotação em BRL
- Gráficos de 24h/7d/30d/1a

#### Câmbio (Banco Central)

- Dólar comercial/turismo
- Euro
- Outras moedas principais

---

## 📈 Página: Relatórios

### Tipos de Relatórios

#### 1. Despesas por Categoria

- Donut chart com % por categoria
- Drill-down para subcategorias
- Comparativo com mês anterior
- Top 5 maiores gastos

#### 2. Tendências

- Line chart de 6 ou 12 meses
- Receitas vs Despesas
- Identificação de padrões sazonais

#### 3. Balanço Patrimonial

- Ativos (contas + investimentos)
- Passivos (dívidas + cartões)
- Patrimônio líquido
- Evolução temporal

#### 4. Fluxo de Caixa

- Previsão de 3/6/12 meses
- Considera recorrências
- Alerta de saldo negativo previsto

#### 5. Meu Desempenho

- Taxa de economia mensal
- Comparativo com metas
- Score financeiro (0-100)
- Insights da Ana Clara

---

## 🎓 Página: Educação Financeira

### Seções

#### 1. Trilha de Aprendizado

```
┌─────────────────────────────────────────────────┐
│ 📚 Sua Jornada Financeira                       │
│                                                 │
│ ✅ Módulo 1: Organização Básica (Completo)     │
│ 🔄 Módulo 2: Eliminando Dívidas (60%)          │
│ 🔒 Módulo 3: Começando a Investir (Bloqueado)  │
│ 🔒 Módulo 4: Planejamento de Longo Prazo       │
└─────────────────────────────────────────────────┘
```

#### 2. Conquistas e Badges

- "Primeiro Mês Completo" 🎯
- "Economizou 10% da Renda" 💰
- "Zerou as Dívidas" 🎉
- "Primeiros R$ 1.000 Investidos" 📈
- "Meta Alcançada" 🏆
- "30 Dias de Streak" 🔥

#### 3. Dicas Contextuais

Ana Clara fornece dicas baseadas no comportamento:

- "Percebi que você tem muitos gastos com delivery. Que tal planejar refeições?"
- "Seu cartão está com 80% do limite usado. Vamos planejar o próximo mês?"
- "Você economizou R$ 500 esse mês! Já pensou em investir esse valor?"

#### 4. Glossário Financeiro

- Termos explicados de forma simples
- Exemplos práticos
- Calculadoras integradas

---

## ⚙️ Página: Configurações

### Seções

#### 1. Perfil

- Nome, foto, email
- Modo individual / casal
- Meta de economia mensal
- Dia do fechamento mensal

#### 2. Contas e Categorias

- Gerenciar contas bancárias
- Criar/editar categorias personalizadas
- Ícones e cores

#### 3. WhatsApp

- Status da conexão
- QR Code para reconexão
- Preferências de notificação
- Horários de resumos automáticos

#### 4. Notificações

- Push notifications
- Lembretes de contas
- Resumos periódicos
- Alertas de orçamento

#### 5. Privacidade e Segurança

- Autenticação biométrica
- Histórico de acessos
- Exportar dados
- Excluir conta

#### 6. Integrações

- Status das APIs de mercado
- Configurar refresh automático
- Logs de sincronização

---

## 🔄 Fluxos de Usuário Principais

### Fluxo 1: Primeiro Acesso

```
1. Landing Page
   ↓
2. [Criar Conta] → Login Social (Google/Apple)
   ↓
3. Onboarding (5 passos)
   - Bem-vindo! Conhecer Ana Clara
   - Adicione suas primeiras contas
   - Defina suas categorias principais
   - Configure seu orçamento mensal
   - Conecte seu WhatsApp (QR Code)
   ↓
4. Tutorial Interativo WhatsApp
   - Ana Clara envia boas-vindas
   - Explica comandos básicos
   - Convida para fazer primeiro lançamento
   ↓
5. Dashboard Principal
```

### Fluxo 2: Lançamento via WhatsApp (Despesa)

```
1. Usuário envia mensagem
   "Gastei 120 no posto de gasolina"
   ↓
2. N8N recebe webhook
   ↓
3. LLM processa e extrai:
   - Valor: R$ 120,00
   - Categoria: Transporte > Combustível
   - Conta: Carteira (padrão)
   ↓
4. Ana Clara responde:
   "✅ Registrado!
    ⛽ Transporte - Combustível
    💰 R$ 120,00
    📅 Hoje, 18:42
    Carteira: R$ 2.410,00 → R$ 2.290,00"
   ↓
5. Insert no Supabase
   ↓
6. Dashboard atualiza em tempo real (Realtime)
```

### Fluxo 3: Definir Meta Financeira

```
1. Dashboard → [Metas Financeiras] → [+ Nova Meta]
   ↓
2. Modal: Criar Meta
   - Nome: "Viagem para Europa"
   - Valor alvo: R$ 30.000,00
   - Prazo: Dezembro 2026
   - Ícone: 🏖️
   - [Criar Meta]
   ↓
3. Sistema calcula:
   - Meses até o prazo: 13
   - Aporte mensal sugerido: R$ 2.307,69
   ↓
4. Meta criada → Card na página de Metas
   ↓
5. Ana Clara via WhatsApp:
   "🎉 Oba! Nova meta criada: Viagem para Europa!
    Vamos juntas conquistar esse objetivo.
    Que tal começar com um aporte agora?"
   ↓
6. Usuário pode adicionar valores:
   - Via WhatsApp: "Adicionar 500 na meta viagem"
   - Via Dashboard: Botão [Adicionar Valor]
```

### Fluxo 4: Modo Casal

```
1. Configurações → [Modo Casal]
   ↓
2. Gera link de convite
   ↓
3. Parceiro(a) recebe link → Cria conta vinculada
   ↓
4. Dashboard passa a ter:
   - Visão "Individual" (só minhas finanças)
   - Visão "Casal" (finanças conjuntas)
   - Visão "Total" (tudo)
   ↓
5. Funcionalidades Casal:
   - Contas compartilhadas
   - Metas conjuntas
   - Planejamento familiar
   - Cada um mantém contas pessoais
```

---

## 🎮 Gamificação e Achievements

### Sistema de Conquistas

#### Nível 1 - Primeiros Passos

- 🎯 **Primeiro Lançamento:** Registrou sua primeira transação
- 📱 **Conectou WhatsApp:** Integrou Personal Finance LA ao WhatsApp
- 💰 **Criou Conta:** Adicionou sua primeira conta bancária
- 📊 **Primeira Categoria:** Personalizou suas categorias

#### Nível 2 - Organização

- 📅 **Mês Completo:** Completou o primeiro mês de registros
- 🗂️ **Organizador(a):** Categorizou 50 transações
- 📸 **Digital:** Anexou 10 comprovantes
- 💳 **Controle Total:** Cadastrou todos os cartões de crédito

#### Nível 3 - Disciplina Financeira

- 🔥 **Streak 7 Dias:** Lançou transações por 7 dias seguidos
- 🔥 **Streak 30 Dias:** Lançou transações por 30 dias seguidos
- 💪 **No Azul:** Fechou o mês sem saldo negativo
- 📉 **Reduziu Gastos:** Gastou menos que o mês anterior

#### Nível 4 - Planejamento

- 📋 **Planejou o Mês:** Criou seu primeiro orçamento mensal
- 🎯 **Primeira Meta:** Definiu sua primeira meta financeira
- 💡 **Seguiu o Plano:** Respeitou o orçamento planejado
- 📈 **Previsível:** 3 meses de planejamento consistente

#### Nível 5 - Economia

- 💰 **Economizou 10%:** Poupou 10% da renda mensal
- 💰 **Economizou 20%:** Poupou 20% da renda mensal
- 🏆 **Meta Alcançada:** Completou sua primeira meta
- 🎉 **Grande Economista:** Economizou R$ 10.000

#### Nível 6 - Investidor

- 📈 **Primeiro Investimento:** Registrou seu primeiro investimento
- 💎 **Carteira Diversificada:** Tem investimentos em 3+ tipos diferentes
- 🚀 **Portfólio R$ 10k:** Acumulou R$ 10.000 em investimentos
- 🌟 **Portfólio R$ 100k:** Acumulou R$ 100.000 em investimentos

#### Nível 7 - Mestre Financeiro

- 🎓 **Educação Completa:** Completou todos os módulos educacionais
- 👨‍👩‍👧 **Planejamento Familiar:** Ativou e usa modo casal
- 📊 **Analista:** Exportou 5+ relatórios
- 🏅 **Mestre das Finanças:** Desbloqueou todas as conquistas anteriores

### Feedback Visual

- Notificação push ao desbloquear conquista
- Animação de celebração no app
- Mensagem da Ana Clara parabenizando
- Badge permanente no perfil

---

## 🔔 Sistema de Notificações

### WhatsApp (Prioridade Alta)

#### Lembretes de Contas

**1 dia antes do vencimento:**

```
📅 Lembrete de Amanhã

Oi! Amanhã vence:
- Fatura Nubank: R$ 5.190,09
- Internet (7 Link): R$ 99,00

Total: R$ 5.289,09

Deseja marcar como paga?
[Sim, já paguei] [Lembrar amanhã]
```

**No dia do vencimento:**

```
⚠️ Conta vence HOJE

Energia (Light): R$ 230,45
Vencimento: Hoje

[Marcar como paga] [Já paguei]
```

#### Resumos Automáticos

**Resumo Diário (20h)**

```
🌙 Seu dia financeiro

💸 Gastos hoje: R$ 127,50
   • Almoço: R$ 38,00
   • Uber: R$ 24,50
   • Supermercado: R$ 65,00

💰 Saldo: R$ 2.290,00 (-5,3%)

🎯 Orçamento do mês: 67% utilizado
   (faltam 12 dias)
```

**Resumo Semanal (Segunda, 9h)**

```
📊 Resumo da Semana

De 18/11 a 24/11:

💸 Despesas: R$ 847,30
   Top categorias:
   🍽️ Alimentação: R$ 380,20 (45%)
   🚗 Transporte: R$ 237,25 (28%)
   🏠 Moradia: R$ 150,00 (18%)

📈 vs Semana anterior: +12%

💡 Dica da Ana: Seus gastos com delivery
   aumentaram. Que tal cozinhar mais?
```

**Resumo Mensal (Dia 1 do mês)**

```
📅 Fechamento de [Mês]

🎉 Mês concluído!

💰 Receitas: R$ 5.500,00
💸 Despesas: R$ 4.235,20
💵 Saldo: +R$ 1.264,80 (23%)

🎯 Meta de economia: 20%
   Status: Superou! 🎉

📊 Maiores gastos:
   1. Aluguel: R$ 1.500,00
   2. Supermercado: R$ 680,50
   3. Transporte: R$ 420,00

[Ver Relatório Completo]
```

#### Alertas Inteligentes

**Estouro de Orçamento**

```
⚠️ Alerta de Orçamento

Categoria Alimentação:
💸 Gasto: R$ 720,00
🎯 Planejado: R$ 600,00
📊 Ultrapassou em 20%

Ainda faltam 8 dias para o fim do mês.
Vamos ajustar os próximos dias? 💪
```

**Saldo Baixo**

```
⚠️ Atenção: Saldo Baixo

Sua Carteira está com R$ 85,00

Você tem estas contas pendentes:
- Internet: R$ 99,00 (vence em 2 dias)
- Academia: R$ 150,00 (vence em 5 dias)

Que tal transferir de outra conta?
```

**Progresso de Meta**

```
🎉 Você alcançou um marco!

Meta: Viagem para Europa
Progresso: 75% ✨

Você está perto! Faltam apenas
R$ 7.500,00 para realizar esse sonho!

Continue firme! 💪
```

### Push Notifications (App/PWA)

- Contas a vencer (mesmo padrão do WhatsApp)
- Transação registrada com sucesso
- Nova conquista desbloqueada
- Atualização de investimentos (variação significativa)
- Lembretes de lançamentos pendentes
- Ana Clara tem uma dica para você

### In-App Notifications

- Centro de notificações com histórico
- Opções de silenciar por categoria
- Configuração de horários permitidos

---

## 🧪 MVP - Features Essenciais (3 meses)

### Sprint 1 (Mês 1) - Fundação

**Objetivo:** Infraestrutura, autenticação e CRUD básico

**Entregas:**

- Setup do projeto (React + TypeScript + Supabase)
- Design system e componentes base (Tailwind + shadcn/ui)
- Autenticação (Google + Apple)
- Database schema completo
- CRUD de Contas
- CRUD de Categorias
- CRUD de Transações (manual)
- Dashboard básico com KPIs

### Sprint 2 (Mês 2) - WhatsApp + Ana Clara

**Objetivo:** Integração WhatsApp e IA

**Entregas:**

- Integração UAZAPI
- N8N workflows:
  - Recebimento de mensagens
  - Processamento de texto
  - Processamento de áudio (Speech-to-Text)
  - Processamento de imagem (OCR)
- Ana Clara (LLM):
  - Categorização automática
  - Extração de dados de mensagens
  - Respostas contextuais
- Envio de mensagens WhatsApp:
  - Confirmação de transações
  - Lembretes de contas
- Comandos rápidos (saldo, resumo, contas)

### Sprint 3 (Mês 3) - Features Avançadas + Polish

**Objetivo:** Completar features essenciais e refinar UX

**Entregas:**

- Cartões de Crédito:
  - Cadastro e gestão
  - Faturas abertas/fechadas
  - Lançamento de compras
- Planejamento Mensal:
  - Definir orçamento por categoria
  - Acompanhamento vs realizado
- Metas Financeiras:
  - Criar e editar metas
  - Adicionar contribuições
  - Tracking de progresso
- Relatórios:
  - Despesas por categoria
  - Balanço mensal
  - Tendências (6 meses)
- Notificações WhatsApp:
  - Resumos diários
  - Resumos semanais
  - Lembretes de vencimento
- Achievements básicos
- Testes de usuário e ajustes
- Deploy em produção

---

## 🚀 Roadmap Pós-MVP (Futuro)

### Fase 2 (Meses 4-6) - Investimentos e Educação

- Integração completa com APIs de mercado (B3, Tesouro, Crypto)
- Portfolio de investimentos com atualização automática
- Módulos de educação financeira estruturados
- Sistema de gamificação completo
- Modo casal com todas as funcionalidades

### Fase 3 (Meses 7-9) - Inteligência e Automação

- Ana Clara com memória de longo prazo
- Análise preditiva avançada (ML)
- Recomendações personalizadas de investimento
- Automação de lançamentos recorrentes
- Integração com foto da fatura (OCR avançado)

### Fase 4 (Meses 10-12) - Open Finance e Expansão

- Integração Open Finance (contas automáticas)
- Sincronização automática de faturas
- Extrato automático via Open Finance
- App nativo (React Native)
- Assistente de voz
- Integração com Siri/Google Assistant

---

## 🎨 Design System

### Cores Primárias

```css
--indigo-600: #6366f1; /* Primary */
--indigo-700: #4f46e5; /* Primary Dark */
--indigo-500: #818cf8; /* Primary Light */

--green-600: #16a34a; /* Success/Receitas */
--red-600: #dc2626; /* Error/Despesas */
--amber-600: #d97706; /* Warning */
--blue-600: #2563eb; /* Info */

--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-600: #4b5563;
--gray-900: #111827;
```

### Tipografia

```css
--font-sans: 'Inter', system-ui, sans-serif;

/* Headings */
--text-4xl: 2.25rem; /* 36px */
--text-3xl: 1.875rem; /* 30px */
--text-2xl: 1.5rem; /* 24px */
--text-xl: 1.25rem; /* 20px */
--text-lg: 1.125rem; /* 18px */

/* Body */
--text-base: 1rem; /* 16px */
--text-sm: 0.875rem; /* 14px */
--text-xs: 0.75rem; /* 12px */
```

### Ícones

- **Biblioteca:** Lucide React
- **Tamanho padrão:** 20px
- **Tamanho em cards:** 24px
- **Tamanho em destaque:** 32px

### Componentes Reutilizáveis

#### Button

- **Variantes:** primary, secondary, outline, ghost, destructive
- **Tamanhos:** sm, md, lg
- **Estados:** default, hover, active, disabled, loading

#### Card

- **Padding:** 1.5rem
- **Border radius:** 0.75rem
- **Shadow:** sm (default), md (hover), lg (destacado)

#### Input

- **Height:** 2.5rem (40px)
- **Border radius:** 0.5rem
- **Estados:** default, focus, error, disabled

#### Toast/Notification

- **Posição:** bottom-right
- **Auto-dismiss:** 5s
- **Variantes:** success, error, warning, info

---

## 🧪 Testes e Qualidade

### Estratégia de Testes

#### Unit Tests (Vitest)

- Funções utilitárias
- Hooks customizados
- Formatação de dados
- Validações

#### Integration Tests (React Testing Library)

- Componentes de formulário
- Fluxos de autenticação
- CRUD operations
- Interações com Supabase

#### E2E Tests (Playwright)

- Fluxo completo de onboarding
- Lançamento via dashboard
- Criação de meta
- Geração de relatório

#### Manual Testing

- Integração WhatsApp
- Workflows N8N
- Ana Clara responses
- UX em dispositivos mobile

### Métricas de Qualidade

- **Code Coverage:** Mínimo 70%
- **Lighthouse Score:** 90+ (Performance, Accessibility, Best Practices, SEO)
- **Bundle Size:** < 500KB (gzipped)
- **First Contentful Paint:** < 1.5s
- **Time to Interactive:** < 3s

---

## 📊 Métricas de Sucesso (KPIs)

### Product Metrics

- **Usuários Ativos Mensais (MAU)**
- **Taxa de Retenção:**
  - Day 1: 60%
  - Day 7: 40%
  - Day 30: 25%
- **Transações por Usuário/Mês:** Média de 50+
- **Uso do WhatsApp:** 80% das transações via WhatsApp
- **Tempo Médio no App:** 5-7 minutos/sessão

### Engagement Metrics

- **Frequência de Uso:** 5+ dias/semana
- **Completude de Perfil:** 90% dos usuários com todos os dados preenchidos
- **Metas Criadas:** 70% dos usuários têm ao menos 1 meta ativa
- **Achievements Desbloqueados:** Média de 8 por usuário

### Business Metrics (Futuro)

- **Custo por Usuário (CPU):** A definir
- **Customer Lifetime Value (LTV):** A definir
- **Churn Rate:** < 10%/mês
- **Net Promoter Score (NPS):** > 50

---

## 🔒 Segurança e Privacidade

### Medidas de Segurança

#### Autenticação

- OAuth 2.0 (Google, Apple)
- Session management via Supabase Auth
- JWT tokens com refresh automático
- Biometria (dispositivos compatíveis)

#### Autorização

- Row Level Security (RLS) no Supabase
- Todas as queries filtradas por user_id
- Validação de ownership em todas as operações

#### Dados Sensíveis

- Senhas nunca armazenadas (OAuth only)
- Dados financeiros criptografados em trânsito (HTTPS)
- Attachments armazenados com URLs signed (Supabase Storage)

#### WhatsApp

- Tokens UAZAPI criptografados
- Validação de origem das mensagens
- Rate limiting para prevenir spam

### LGPD Compliance

#### Consentimento

- Termos de uso e política de privacidade no onboarding
- Opt-in para notificações WhatsApp
- Controle granular de preferências

#### Direitos do Titular

- **Acesso:** Exportação de todos os dados (JSON)
- **Retificação:** Edição de qualquer informação
- **Exclusão:** Botão "Excluir Conta" com confirmação
- **Portabilidade:** Export em formato estruturado

#### Retenção de Dados

- Dados mantidos enquanto conta ativa
- Backup de 30 dias após exclusão (recovery)
- Exclusão permanente após 30 dias

---

## 📝 Documentação

### Documentação Técnica

- **README.md:** Setup, instalação, comandos
- **API Docs:** Endpoints Supabase + Edge Functions
- **Component Library:** Storybook com todos os componentes
- **N8N Workflows:** Diagramas e explicações

### Documentação do Usuário

- **FAQ:** Perguntas frequentes
- **Tutoriais em Vídeo:** Principais fluxos
- **Central de Ajuda:** Artigos detalhados
- **Changelog:** Histórico de atualizações

---

## 👥 Time e Responsabilidades

### Você (Lead Developer)

- Arquitetura geral
- Desenvolvimento frontend (React/TypeScript)
- Integração Supabase
- Code review

### Tarefas Delegáveis/Ferramentas

- **Lovable:** Prototipação rápida de telas
- **Windsurf/Cursor:** Desenvolvimento assistido por IA
- **N8N:** Automações visual (drag-and-drop)
- **Supabase:** Backend as a Service (sem backend custom)

### Possíveis Colaboradores Futuros

- Designer UI/UX (consultor)
- QA/Tester (part-time)
- Copywriter (conteúdo educacional)

---

## 🎯 Conclusão

Este PRD define um sistema de gestão financeira pessoal inovador que combina a praticidade do WhatsApp com uma dashboard web robusta, guiado por uma coach financeira virtual (Ana Clara) que torna o controle financeiro mais humano e acessível.

### Diferenciais Competitivos:

1. **WhatsApp-First:** Lançamentos por mensagem, áudio e foto
2. **Ana Clara:** Coach virtual com personalidade e contexto
3. **Gamificação:** Transforma gestão financeira em hábito positivo
4. **Gratuito:** Sem barreiras de entrada
5. **Mobile-First PWA:** Experiência nativa sem necessidade de app store

### Próximos Passos:

1. Validar e aprovar este PRD
2. Iniciar Sprint 1 (Fundação)
3. Setup de ambiente e ferramentas
4. Primeiros commits! 🚀

---

**Versão:** 1.0  
**Data:** Novembro 2025  
**Autor:** Claude + LA Music Team  
**Status:** Aguardando Aprovação
