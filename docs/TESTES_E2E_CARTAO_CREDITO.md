# 🧪 Suite de Testes E2E - Cartão de Crédito

**Data:** 13 de Dezembro de 2025  
**Versão:** v367  
**Objetivo:** Validar todas as funcionalidades de cartão de crédito (WhatsApp + Frontend)

---

## 📋 Instruções de Teste

### WhatsApp
1. Envie cada comando via WhatsApp para a Ana Clara
2. Marque ✅ se funcionou corretamente
3. Marque ❌ se falhou e anote o erro
4. Marque ⚠️ se funcionou parcialmente

### Frontend
1. Acesse http://localhost:5173/cartoes
2. Execute cada ação descrita
3. Verifique os resultados esperados

---

## 🔷 PARTE 1: TESTES WHATSAPP - CARTÃO DE CRÉDITO

### 1.1 Cadastro de Compras no Cartão

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.1.1 | "comprei 100 no cartão nubank" | Registra compra R$ 100 no Nubank | ⬜ | |
| 1.1.2 | "gastei 250 no cartão itaú" | Registra compra R$ 250 no Itaú | ⬜ | |
| 1.1.3 | "compra de 80 reais no nubank" | Registra compra R$ 80 no Nubank | ⬜ | |
| 1.1.4 | "50 reais no cartão" | Pergunta qual cartão | ⬜ | |
| 1.1.5 | "gastei 35 no roxinho" | Registra no Nubank (apelido) | ⬜ | |

### 1.2 Compras Parceladas

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.2.1 | "comprei 600 em 3x no nubank" | Registra 3 parcelas de R$ 200 | ⬜ | |
| 1.2.2 | "parcelei 1200 em 6x no itaú" | Registra 6 parcelas de R$ 200 | ⬜ | |
| 1.2.3 | "comprei tv 2500 em 10x nubank" | Registra 10 parcelas de R$ 250 | ⬜ | |
| 1.2.4 | "gastei 900 em 3 vezes no cartão" | Pergunta qual cartão | ⬜ | |

### 1.3 Consulta de Compras (Listagem)

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.3.1 | "quanto gastei no cartão nubank" | Lista compras do mês + total | ⬜ | |
| 1.3.2 | "compras do itaú" | Lista compras do Itaú | ⬜ | |
| 1.3.3 | "gastos no cartão" | Lista de todos os cartões | ⬜ | |
| 1.3.4 | "quanto gastei essa semana no nubank" | Lista da semana + comparativo | ⬜ | |
| 1.3.5 | "gastos do cartão itaú essa semana" | Lista da semana + comparativo | ⬜ | |
| 1.3.6 | "compras de hoje no nubank" | Lista de hoje | ⬜ | |

### 1.4 Consulta de Fatura

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.4.1 | "fatura do nubank" | Mostra fatura detalhada | ⬜ | |
| 1.4.2 | "fatura itaú" | Mostra fatura do Itaú | ⬜ | |
| 1.4.3 | "quanto devo no cartão" | Mostra faturas de todos | ⬜ | |
| 1.4.4 | "fatura do roxinho" | Mostra fatura Nubank (apelido) | ⬜ | |
| 1.4.5 | "quanto estou devendo no nubank" | Mostra fatura Nubank | ⬜ | |

### 1.5 Comparação de Meses

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.5.1 | "comparar meses nubank" | Compara últimos 3 meses | ⬜ | |
| 1.5.2 | "evolução do itaú" | Mostra evolução de gastos | ⬜ | |

### 1.6 Consulta de Gasto Específico

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.6.1 | "quanto gastei no ifood no nubank" | Gastos iFood no Nubank | ⬜ | |
| 1.6.2 | "gastos com uber no itaú" | Gastos Uber no Itaú | ⬜ | |
| 1.6.3 | "quanto gastei em alimentação no cartão" | Gastos categoria Alimentação | ⬜ | |
| 1.6.4 | "gastos com mercado no nubank" | Gastos mercado no Nubank | ⬜ | |

### 1.7 Listagem de Cartões

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.7.1 | "meus cartões" | Lista todos os cartões | ⬜ | |
| 1.7.2 | "quais cartões tenho" | Lista todos os cartões | ⬜ | |
| 1.7.3 | "cartões" | Lista todos os cartões | ⬜ | |

### 1.8 Validação do Template (Verificar Visualmente)

| # | Verificação | Resultado Esperado | Status | Observações |
|---|-------------|-------------------|--------|-------------|
| 1.8.1 | Cabeçalho | Emoji + Nome do cartão + Período | ⬜ | |
| 1.8.2 | Dia da semana | Data com dia da semana (ex: "08/12 (Segunda)") | ⬜ | |
| 1.8.3 | Top Categorias | 🥇🥈🥉 com valores e % | ⬜ | |
| 1.8.4 | Comparativo | Semana/mês atual vs anterior | ⬜ | |
| 1.8.5 | Total e Média | Valores corretos | ⬜ | |
| 1.8.6 | Dica final | Link para fatura | ⬜ | |

---

## 🔷 PARTE 2: TESTES FRONTEND - PÁGINA CARTÕES

### 2.1 Navegação e Carregamento

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 2.1.1 | Acessar /cartoes | Página carrega com lista de cartões | ⬜ | |
| 2.1.2 | Verificar cards | Cards mostram nome, bandeira, limite | ⬜ | |
| 2.1.3 | Verificar totais | Total de faturas correto | ⬜ | |

### 2.2 CRUD de Cartões

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 2.2.1 | Clicar "Novo Cartão" | Abre dialog de criação | ⬜ | |
| 2.2.2 | Preencher nome + limite + vencimento | Campos validados | ⬜ | |
| 2.2.3 | Salvar cartão | Cartão aparece na lista | ⬜ | |
| 2.2.4 | Editar cartão existente | Dialog com dados preenchidos | ⬜ | |
| 2.2.5 | Alterar limite | Limite atualizado | ⬜ | |
| 2.2.6 | Excluir cartão | Confirmação + remoção | ⬜ | |

### 2.3 Visualização de Transações

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 2.3.1 | Clicar em um cartão | Abre detalhes/transações | ⬜ | |
| 2.3.2 | Verificar lista de compras | Compras do mês atual | ⬜ | |
| 2.3.3 | Verificar parcelas | Parcelas agrupadas corretamente | ⬜ | |
| 2.3.4 | Filtrar por mês | Muda lista de transações | ⬜ | |

### 2.4 Adicionar Compra (Frontend)

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 2.4.1 | Clicar "Nova Compra" | Abre dialog | ⬜ | |
| 2.4.2 | Preencher valor + descrição | Campos validados | ⬜ | |
| 2.4.3 | Selecionar categoria | Dropdown funciona | ⬜ | |
| 2.4.4 | Marcar parcelado | Mostra campo de parcelas | ⬜ | |
| 2.4.5 | Salvar compra | Compra aparece na lista | ⬜ | |

### 2.5 Fatura

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 2.5.1 | Ver fatura do mês | Mostra total + compras | ⬜ | |
| 2.5.2 | Navegar entre meses | Muda fatura exibida | ⬜ | |
| 2.5.3 | Verificar limite disponível | Cálculo correto | ⬜ | |

### 2.6 Análises/Gráficos

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 2.6.1 | Ver gráfico de gastos | Gráfico por categoria | ⬜ | |
| 2.6.2 | Ver evolução mensal | Gráfico de linha | ⬜ | |
| 2.6.3 | Top categorias | Lista ordenada | ⬜ | |

---

## 🔷 PARTE 3: TESTES DE INTEGRAÇÃO (WhatsApp ↔ Frontend)

### 3.1 Sincronização de Dados

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 3.1.1 | Registrar compra via WhatsApp | Aparece no Frontend (realtime) | ⬜ | |
| 3.1.2 | Adicionar compra no Frontend | Aparece na consulta WhatsApp | ⬜ | |
| 3.1.3 | Criar cartão no Frontend | Disponível para uso no WhatsApp | ⬜ | |

---

## 🔷 PARTE 4: TESTES DE ERRO (Casos Negativos)

### 4.1 WhatsApp - Erros

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 4.1.1 | "compras do cartão xyz" | Mensagem "cartão não encontrado" | ⬜ | |
| 4.1.2 | "fatura do bradesco" | Mensagem "cartão não encontrado" | ⬜ | |
| 4.1.3 | "gastei -100 no nubank" | Validação de valor | ⬜ | |
| 4.1.4 | "parcelei 100 em 0x" | Validação de parcelas | ⬜ | |

### 4.2 Frontend - Erros

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 4.2.1 | Criar cartão sem nome | Validação de campo obrigatório | ⬜ | |
| 4.2.2 | Limite negativo | Validação de valor | ⬜ | |
| 4.2.3 | Compra sem valor | Validação de campo obrigatório | ⬜ | |

---

## 📊 Resumo de Execução

### WhatsApp
| Categoria | Total | ✅ | ❌ | ⚠️ |
|-----------|-------|----|----|-----|
| Cadastro de Compras | 5 | | | |
| Compras Parceladas | 4 | | | |
| Consulta de Compras | 6 | | | |
| Consulta de Fatura | 5 | | | |
| Comparação de Meses | 2 | | | |
| Gasto Específico | 4 | | | |
| Listagem de Cartões | 3 | | | |
| Validação Template | 6 | | | |
| **TOTAL WHATSAPP** | **35** | | | |

### Frontend
| Categoria | Total | ✅ | ❌ | ⚠️ |
|-----------|-------|----|----|-----|
| Navegação | 3 | | | |
| CRUD Cartões | 6 | | | |
| Visualização | 4 | | | |
| Adicionar Compra | 5 | | | |
| Fatura | 3 | | | |
| Análises | 3 | | | |
| **TOTAL FRONTEND** | **24** | | | |

### Integração + Erros
| Categoria | Total | ✅ | ❌ | ⚠️ |
|-----------|-------|----|----|-----|
| Integração | 3 | | | |
| Erros WhatsApp | 4 | | | |
| Erros Frontend | 3 | | | |
| **TOTAL OUTROS** | **10** | | | |

---

## 📝 Dados de Teste Disponíveis

### Cartões Cadastrados
| Cartão | Limite | Vencimento |
|--------|--------|------------|
| Nubank | R$ 5.000 | Dia 10 |
| Itaú | R$ 3.000 | Dia 15 |

### Transações de Teste (Semana Atual 07-13/12)
| Cartão | Data | Descrição | Valor |
|--------|------|-----------|-------|
| Nubank | 11/12 | TV (3/10) | R$ 250 |
| Nubank | 11/12 | Geladeira | R$ 300 |
| Nubank | 08/12 | Mercado | R$ 80 |
| Nubank | 08/12 | Uber | R$ 35 |
| Nubank | 07/12 | Farmácia | R$ 100 |
| Itaú | 08/12 | Uber | R$ 30 |

### Transações Semana Anterior (01-06/12)
| Cartão | Data | Descrição | Valor |
|--------|------|-----------|-------|
| Itaú | 01-06/12 | Diversos | R$ 48 |
| Nubank | - | Sem dados | - |

---

## 🏁 Checklist Final

- [ ] Todos os testes WhatsApp executados
- [ ] Todos os testes Frontend executados
- [ ] Testes de integração executados
- [ ] Testes de erro executados
- [ ] Bugs reportados documentados
- [ ] Taxa de sucesso calculada

**Taxa de Sucesso Mínima Esperada:** 90%

---

## 📝 Notas de Bugs Encontrados

| # | Descrição | Severidade | Status |
|---|-----------|------------|--------|
| | | | |

---

**Documento gerado em 13/12/2025**
