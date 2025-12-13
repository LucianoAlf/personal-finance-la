# 🧪 Suite de Testes E2E - Contas a Pagar

**Data:** 13 de Dezembro de 2025  
**Versão:** v367  
**Objetivo:** Validar todas as funcionalidades de contas a pagar (WhatsApp + Frontend)

---

## 📋 Instruções de Teste

### WhatsApp
1. Envie cada comando via WhatsApp para a Ana Clara
2. Marque ✅ se funcionou corretamente
3. Marque ❌ se falhou e anote o erro
4. Marque ⚠️ se funcionou parcialmente

### Frontend
1. Acesse http://localhost:5173/contas-pagar
2. Execute cada ação descrita
3. Verifique os resultados esperados

---

## 🔷 PARTE 1: TESTES WHATSAPP - CONTAS A PAGAR

### 1.1 Cadastro de Contas Fixas

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.1.1 | "cadastrar conta de luz 185 dia 10" | Registra conta fixa | ⬜ | |
| 1.1.2 | "nova conta água 95 vence dia 15" | Registra conta fixa | ⬜ | |
| 1.1.3 | "aluguel 1500 todo dia 5" | Registra conta recorrente | ⬜ | |
| 1.1.4 | "internet 120 dia 20" | Registra conta fixa | ⬜ | |

### 1.2 Cadastro de Assinaturas

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.2.1 | "netflix 55 dia 12" | Registra assinatura | ⬜ | |
| 1.2.2 | "spotify 22 dia 8" | Registra assinatura | ⬜ | |
| 1.2.3 | "disney plus 30 dia 15" | Registra assinatura | ⬜ | |
| 1.2.4 | "amazon prime 15 dia 1" | Registra assinatura | ⬜ | |

### 1.3 Cadastro de Fatura de Cartão

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.3.1 | "fatura nubank 2500 dia 10" | Registra fatura | ⬜ | |
| 1.3.2 | "fatura itaú 1800 dia 15" | Registra fatura | ⬜ | |
| 1.3.3 | "fatura do roxinho" | Pergunta valor | ⬜ | |

### 1.4 Listar Contas

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.4.1 | "minhas contas a pagar" | Lista todas as contas | ⬜ | |
| 1.4.2 | "contas do mês" | Lista contas do mês | ⬜ | |
| 1.4.3 | "contas vencendo" | Lista próximas a vencer | ⬜ | |
| 1.4.4 | "contas vencidas" | Lista contas atrasadas | ⬜ | |
| 1.4.5 | "quanto devo esse mês" | Total de contas | ⬜ | |

### 1.5 Marcar Como Pago

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.5.1 | "paguei a luz" | Marca como pago + comparativo | ⬜ | |
| 1.5.2 | "paguei 190 de luz" | Registra valor + comparativo | ⬜ | |
| 1.5.3 | "paguei a netflix" | Marca assinatura como paga | ⬜ | |
| 1.5.4 | "paguei o aluguel" | Marca como pago | ⬜ | |
| 1.5.5 | "luz paga" | Marca como pago | ⬜ | |

### 1.6 Pagamento de Fatura de Cartão

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.6.1 | "paguei a fatura do nubank" | Marca fatura paga (total) | ⬜ | |
| 1.6.2 | "paguei 1500 no nubank" | Pagamento parcial | ⬜ | |
| 1.6.3 | "paguei o mínimo do itaú" | Pagamento mínimo | ⬜ | |

### 1.7 Atualizar Valor de Conta Variável

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.7.1 | "luz veio 195" | Atualiza valor pendente | ⬜ | |
| 1.7.2 | "água deu 85" | Atualiza valor pendente | ⬜ | |
| 1.7.3 | "gás veio 120" | Atualiza valor pendente | ⬜ | |

### 1.8 Histórico de Conta

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.8.1 | "histórico da luz" | Últimos 12 meses + estatísticas | ⬜ | |
| 1.8.2 | "histórico da água" | Últimos 12 meses + estatísticas | ⬜ | |
| 1.8.3 | "histórico do aluguel" | Últimos 12 meses | ⬜ | |

### 1.9 Validação do Template de Pagamento

| # | Verificação | Resultado Esperado | Status | Observações |
|---|-------------|-------------------|--------|-------------|
| 1.9.1 | Confirmação | ✅ Conta paga! | ⬜ | |
| 1.9.2 | Comparativo | Este mês vs anterior | ⬜ | |
| 1.9.3 | Média | Média 6/12 meses | ⬜ | |
| 1.9.4 | Tendência | 📈/➡️/📉 | ⬜ | |
| 1.9.5 | Próxima | Criou próxima ocorrência | ⬜ | |

---

## 🔷 PARTE 2: TESTES FRONTEND - PÁGINA CONTAS A PAGAR

### 2.1 Navegação e Carregamento

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 2.1.1 | Acessar /contas-pagar | Página carrega com lista | ⬜ | |
| 2.1.2 | Verificar cards | Cards mostram nome, valor, vencimento | ⬜ | |
| 2.1.3 | Verificar totais | Total pendente correto | ⬜ | |
| 2.1.4 | Verificar faturas | Faturas de cartão integradas | ⬜ | |

### 2.2 CRUD de Contas

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 2.2.1 | Clicar "Nova Conta" | Abre dialog de criação | ⬜ | |
| 2.2.2 | Preencher descrição + valor + vencimento | Campos validados | ⬜ | |
| 2.2.3 | Selecionar tipo (fixa/variável/assinatura) | Dropdown funciona | ⬜ | |
| 2.2.4 | Marcar como recorrente | Toggle funciona | ⬜ | |
| 2.2.5 | Salvar conta | Conta aparece na lista | ⬜ | |
| 2.2.6 | Editar conta existente | Dialog com dados preenchidos | ⬜ | |
| 2.2.7 | Excluir conta | Confirmação + remoção | ⬜ | |

### 2.3 Marcar Como Pago (Frontend)

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 2.3.1 | Clicar "Pagar" em conta fixa | Abre dialog de pagamento | ⬜ | |
| 2.3.2 | Confirmar pagamento | Status muda para "Pago" | ⬜ | |
| 2.3.3 | Pagar conta variável | Permite editar valor | ⬜ | |
| 2.3.4 | Verificar histórico | Pagamento registrado | ⬜ | |

### 2.4 Filtros e Visualização

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 2.4.1 | Filtrar por status (pendente/pago) | Lista filtrada | ⬜ | |
| 2.4.2 | Filtrar por tipo | Lista filtrada | ⬜ | |
| 2.4.3 | Ordenar por vencimento | Lista ordenada | ⬜ | |
| 2.4.4 | Ver contas vencidas | Destaque visual | ⬜ | |

### 2.5 Faturas de Cartão Integradas

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 2.5.1 | Ver fatura na lista | Card com borda roxa | ⬜ | |
| 2.5.2 | Clicar em fatura | Redireciona para /cartoes | ⬜ | |
| 2.5.3 | Verificar badge | Mostra bandeira do cartão | ⬜ | |

---

## 🔷 PARTE 3: TESTES DE INTEGRAÇÃO

### 3.1 Sincronização WhatsApp ↔ Frontend

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 3.1.1 | Cadastrar conta via WhatsApp | Aparece no Frontend (realtime) | ⬜ | |
| 3.1.2 | Marcar pago via WhatsApp | Status atualiza no Frontend | ⬜ | |
| 3.1.3 | Criar conta no Frontend | Disponível no WhatsApp | ⬜ | |
| 3.1.4 | Pagar no Frontend | Reflete no WhatsApp | ⬜ | |

---

## 🔷 PARTE 4: TESTES DE ERRO

### 4.1 WhatsApp - Erros

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 4.1.1 | "paguei a conta xyz" | Mensagem "conta não encontrada" | ⬜ | |
| 4.1.2 | "luz veio -50" | Validação de valor | ⬜ | |
| 4.1.3 | "paguei a luz" (já paga) | Aviso "já foi paga este mês" | ⬜ | |

### 4.2 Frontend - Erros

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| 4.2.1 | Criar conta sem descrição | Validação de campo | ⬜ | |
| 4.2.2 | Valor negativo | Validação de valor | ⬜ | |
| 4.2.3 | Data inválida | Validação de data | ⬜ | |

---

## 📊 Resumo de Execução

### WhatsApp
| Categoria | Total | ✅ | ❌ | ⚠️ |
|-----------|-------|----|----|-----|
| Cadastro Fixas | 4 | | | |
| Cadastro Assinaturas | 4 | | | |
| Cadastro Fatura | 3 | | | |
| Listar Contas | 5 | | | |
| Marcar Pago | 5 | | | |
| Pagar Fatura | 3 | | | |
| Atualizar Valor | 3 | | | |
| Histórico | 3 | | | |
| Template | 5 | | | |
| **TOTAL WHATSAPP** | **35** | | | |

### Frontend
| Categoria | Total | ✅ | ❌ | ⚠️ |
|-----------|-------|----|----|-----|
| Navegação | 4 | | | |
| CRUD Contas | 7 | | | |
| Marcar Pago | 4 | | | |
| Filtros | 4 | | | |
| Faturas Integradas | 3 | | | |
| **TOTAL FRONTEND** | **22** | | | |

### Integração + Erros
| Categoria | Total | ✅ | ❌ | ⚠️ |
|-----------|-------|----|----|-----|
| Integração | 4 | | | |
| Erros WhatsApp | 3 | | | |
| Erros Frontend | 3 | | | |
| **TOTAL OUTROS** | **10** | | | |

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
