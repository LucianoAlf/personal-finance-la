# 🧪 Suíte de Testes E2E - Personal Finance Ana Clara

**Data:** 08 de Dezembro de 2025  
**Versão:** v187  
**Objetivo:** Validar todas as funcionalidades das Fases 1 e 2

---

## 📋 Instruções de Teste

1. Envie cada comando via WhatsApp para o número da Ana Clara
2. Marque ✅ se funcionou corretamente
3. Marque ❌ se falhou e anote o erro
4. Marque ⚠️ se funcionou parcialmente

---

## 🔷 FASE 1 - TESTES BÁSICOS

### 1.1 Registro de Despesas

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.1.1 | "gastei 50 reais no almoço" | Registra despesa de R$ 50 em Alimentação | ⬜ | |
| 1.1.2 | "paguei 150 de luz" | Registra despesa de R$ 150 em Moradia/Contas | ⬜ | |
| 1.1.3 | "comprei gasolina 200 reais" | Registra despesa de R$ 200 em Transporte | ⬜ | |
| 1.1.4 | "gastei 80 no mercado nubank" | Registra R$ 80 na conta Nubank | ⬜ | |
| 1.1.5 | "paguei 35 no uber itaú" | Registra R$ 35 na conta Itaú | ⬜ | |
| 1.1.6 | "gastei 25 no roxinho" | Registra R$ 25 na conta Nubank (apelido) | ⬜ | |

### 1.2 Registro de Receitas

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.2.1 | "recebi 5000 de salário" | Registra receita de R$ 5.000 em Salário | ⬜ | |
| 1.2.2 | "entrou 500 de freelance" | Registra receita de R$ 500 | ⬜ | |
| 1.2.3 | "ganhei 200 de presente" | Registra receita de R$ 200 | ⬜ | |
| 1.2.4 | "recebi 1000 no nubank" | Registra receita na conta Nubank | ⬜ | |

### 1.3 Consulta de Saldo

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.3.1 | "qual meu saldo" | Mostra saldo de todas as contas | ⬜ | |
| 1.3.2 | "quanto tenho" | Mostra saldo de todas as contas | ⬜ | |
| 1.3.3 | "saldo" | Mostra saldo de todas as contas | ⬜ | |

### 1.4 Listagens

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.4.1 | "minhas contas" | Lista todas as contas do usuário | ⬜ | |
| 1.4.2 | "quais contas tenho" | Lista todas as contas | ⬜ | |
| 1.4.3 | "categorias" | Lista categorias disponíveis | ⬜ | |
| 1.4.4 | "meus cartões" | Lista cartões de crédito | ⬜ | |

### 1.5 Cartão de Crédito

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.5.1 | "comprei 100 no cartão nubank" | Registra compra no cartão Nubank | ⬜ | |
| 1.5.2 | "gastei 500 no cartão de crédito itaú" | Registra compra no cartão Itaú | ⬜ | |
| 1.5.3 | "comprei 1200 em 3x no cartão" | Registra compra parcelada | ⬜ | |
| 1.5.4 | "parcelei 600 em 6x nubank" | Registra compra parcelada Nubank | ⬜ | |
| 1.5.5 | "fatura do nubank" | Mostra fatura do cartão Nubank | ⬜ | |
| 1.5.6 | "quanto devo no cartão" | Mostra faturas de todos os cartões | ⬜ | |

### 1.6 Edições

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.6.1 | (Após registrar) "era 95" | Corrige valor para R$ 95 | ⬜ | |
| 1.6.2 | (Após registrar) "na verdade foi 120" | Corrige valor para R$ 120 | ⬜ | |
| 1.6.3 | (Após registrar) "muda pra nubank" | Muda conta para Nubank | ⬜ | |
| 1.6.4 | (Após registrar) "era no itaú" | Muda conta para Itaú | ⬜ | |
| 1.6.5 | (Após registrar) "categoria errada, era transporte" | Muda categoria | ⬜ | |
| 1.6.6 | (Após registrar) "exclui essa" | Exclui última transação | ⬜ | |
| 1.6.7 | (Após registrar) "apaga" | Exclui última transação | ⬜ | |

### 1.7 Relatórios Básicos

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 1.7.1 | "resumo" | Mostra resumo financeiro do mês | ⬜ | |
| 1.7.2 | "como estou" | Mostra resumo financeiro | ⬜ | |

---

## 🔷 FASE 2 - TESTES AVANÇADOS

### 2.1 Consultas por Período

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 2.1.1 | "quanto gastei hoje" | Gastos de hoje | ⬜ | |
| 2.1.2 | "gastos de ontem" | Gastos de ontem | ⬜ | |
| 2.1.3 | "quanto gastei essa semana" | Gastos da semana atual | ⬜ | |
| 2.1.4 | "gastos da semana passada" | Gastos da semana anterior | ⬜ | |
| 2.1.5 | "quanto gastei esse mês" | Gastos do mês atual | ⬜ | |
| 2.1.6 | "gastos do mês passado" | Gastos do mês anterior | ⬜ | |
| 2.1.7 | "gastos dos últimos 7 dias" | Gastos dos últimos 7 dias | ⬜ | |
| 2.1.8 | "gastos dos últimos 30 dias" | Gastos dos últimos 30 dias | ⬜ | |
| 2.1.9 | "gastos de novembro" | Gastos de novembro/2025 | ⬜ | |
| 2.1.10 | "gastos de outubro" | Gastos de outubro/2025 | ⬜ | |

### 2.2 Consultas por Conta/Banco

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 2.2.1 | "quanto gastei no nubank" | Gastos do Nubank (mês atual) | ⬜ | |
| 2.2.2 | "gastos do itaú" | Gastos do Itaú (mês atual) | ⬜ | |
| 2.2.3 | "gastos no roxinho" | Gastos do Nubank (apelido) | ⬜ | |
| 2.2.4 | "gastos do nubank essa semana" | Gastos Nubank na semana | ⬜ | |
| 2.2.5 | "gastos do itaú ontem" | Gastos Itaú ontem | ⬜ | |
| 2.2.6 | "gastos do nubank em novembro" | Gastos Nubank em novembro | ⬜ | |

### 2.3 Consultas por Método de Pagamento

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 2.3.1 | "quanto gastei no pix" | Gastos via PIX | ⬜ | |
| 2.3.2 | "gastos no débito" | Gastos no débito | ⬜ | |
| 2.3.3 | "gastos no crédito" | Gastos no crédito | ⬜ | |
| 2.3.4 | "boletos pagos" | Gastos em boleto | ⬜ | |
| 2.3.5 | "gastos em dinheiro" | Gastos em dinheiro/espécie | ⬜ | |
| 2.3.6 | "transferências que fiz" | Transferências enviadas | ⬜ | |

### 2.4 Consultas Combinadas (Método + Conta + Período)

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 2.4.1 | "pix do nubank essa semana" | PIX do Nubank na semana | ⬜ | |
| 2.4.2 | "débito do itaú ontem" | Débito do Itaú ontem | ⬜ | |
| 2.4.3 | "transferências do nubank esse mês" | Transferências Nubank no mês | ⬜ | |
| 2.4.4 | "pix do nubank nos últimos 7 dias" | PIX Nubank últimos 7 dias | ⬜ | |
| 2.4.5 | "boletos do mês passado" | Boletos do mês passado | ⬜ | |

### 2.5 Consultas com Agrupamento

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 2.5.1 | "gastos por categoria" | Agrupa por categoria | ⬜ | |
| 2.5.2 | "gastos por método de pagamento" | Agrupa por PIX/débito/etc | ⬜ | |
| 2.5.3 | "quanto gastei em cada conta" | Agrupa por conta | ⬜ | |
| 2.5.4 | "gastos por cartão" | Agrupa por cartão de crédito | ⬜ | |
| 2.5.5 | "gastos por dia" | Agrupa por dia | ⬜ | |
| 2.5.6 | "resumo de cada conta esse mês" | Agrupa por conta no mês | ⬜ | |
| 2.5.7 | "gastos por método nos últimos 30 dias" | Agrupa por método (30 dias) | ⬜ | |

### 2.6 Modo Detalhado

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 2.6.1 | "gastos detalhados" | Lista cada transação | ⬜ | |
| 2.6.2 | "gastos do nubank detalhado" | Lista transações Nubank | ⬜ | |
| 2.6.3 | "pix detalhado essa semana" | Lista PIX da semana | ⬜ | |
| 2.6.4 | "todos os gastos de ontem" | Lista todos de ontem | ⬜ | |

### 2.7 Consultas de Receitas

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 2.7.1 | "quanto recebi" | Receitas do mês | ⬜ | |
| 2.7.2 | "minhas receitas" | Receitas do mês | ⬜ | |
| 2.7.3 | "quanto recebi no nubank" | Receitas do Nubank | ⬜ | |
| 2.7.4 | "receitas do itaú" | Receitas do Itaú | ⬜ | |
| 2.7.5 | "quanto recebi esse mês" | Receitas do mês atual | ⬜ | |
| 2.7.6 | "receitas do mês passado" | Receitas do mês passado | ⬜ | |
| 2.7.7 | "quanto ganhei em novembro" | Receitas de novembro | ⬜ | |
| 2.7.8 | "receitas de pix" | PIX recebidos | ⬜ | |
| 2.7.9 | "transferências recebidas" | Transferências recebidas | ⬜ | |
| 2.7.10 | "receitas por conta" | Agrupa receitas por conta | ⬜ | |

### 2.8 Consultas Complexas (Stress Test)

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| 2.8.1 | "quanto gastei no pix do nubank nos últimos 7 dias" | PIX Nubank 7 dias | ⬜ | |
| 2.8.2 | "todas as transferências que fiz esse mês detalhado" | Lista transferências | ⬜ | |
| 2.8.3 | "gastos por método de pagamento na semana passada" | Agrupa por método | ⬜ | |
| 2.8.4 | "quanto recebi de pix em novembro" | PIX recebidos novembro | ⬜ | |
| 2.8.5 | "débito do itaú nos últimos 3 dias detalhado" | Lista débito Itaú | ⬜ | |

---

## 🔷 TESTES DE ÁUDIO

| # | Ação | Resultado Esperado | Status | Observações |
|---|------|-------------------|--------|-------------|
| A.1 | Enviar áudio "gastei 50 reais no almoço" | Transcreve e registra despesa | ⬜ | |
| A.2 | Enviar áudio "quanto gastei esse mês" | Transcreve e mostra gastos | ⬜ | |
| A.3 | Enviar áudio "recebi 1000 de salário" | Transcreve e registra receita | ⬜ | |

---

## 🔷 TESTES DE ERRO (Casos Negativos)

| # | Comando | Resultado Esperado | Status | Observações |
|---|---------|-------------------|--------|-------------|
| E.1 | "gastos do banco xyz" | Mensagem de conta não encontrada | ⬜ | |
| E.2 | "gastei no cartão abc" | Mensagem de cartão não encontrado | ⬜ | |
| E.3 | "olá" | Resposta conversacional | ⬜ | |
| E.4 | "bom dia" | Resposta conversacional | ⬜ | |

---

## 📊 Resumo de Execução

### Fase 1
| Categoria | Total | ✅ | ❌ | ⚠️ |
|-----------|-------|----|----|-----|
| Registro de Despesas | 6 | | | |
| Registro de Receitas | 4 | | | |
| Consulta de Saldo | 3 | | | |
| Listagens | 4 | | | |
| Cartão de Crédito | 6 | | | |
| Edições | 7 | | | |
| Relatórios Básicos | 2 | | | |
| **TOTAL FASE 1** | **32** | | | |

### Fase 2
| Categoria | Total | ✅ | ❌ | ⚠️ |
|-----------|-------|----|----|-----|
| Consultas por Período | 10 | | | |
| Consultas por Conta | 6 | | | |
| Consultas por Método | 6 | | | |
| Consultas Combinadas | 5 | | | |
| Consultas com Agrupamento | 7 | | | |
| Modo Detalhado | 4 | | | |
| Consultas de Receitas | 10 | | | |
| Consultas Complexas | 5 | | | |
| **TOTAL FASE 2** | **53** | | | |

### Outros
| Categoria | Total | ✅ | ❌ | ⚠️ |
|-----------|-------|----|----|-----|
| Testes de Áudio | 3 | | | |
| Testes de Erro | 4 | | | |
| **TOTAL OUTROS** | **7** | | | |

---

## 📝 Notas de Teste

### Pré-requisitos
1. Usuário deve ter pelo menos 2 contas cadastradas (ex: Nubank, Itaú)
2. Usuário deve ter pelo menos 1 cartão de crédito cadastrado
3. Usuário deve ter algumas transações registradas para testes de consulta

### Dados de Teste Recomendados
Antes de iniciar os testes, registre:
- 5 despesas em diferentes categorias
- 2 receitas
- 3 compras no cartão de crédito
- 1 compra parcelada

### Como Reportar Bugs
Para cada teste que falhar, anote:
1. Comando exato enviado
2. Resposta recebida
3. Resposta esperada
4. Screenshot se possível

---

## 🏁 Checklist Final

- [ ] Todos os testes da Fase 1 executados
- [ ] Todos os testes da Fase 2 executados
- [ ] Testes de áudio executados
- [ ] Testes de erro executados
- [ ] Bugs reportados documentados
- [ ] Taxa de sucesso calculada

**Taxa de Sucesso Mínima Esperada:** 90%

---

**Documento gerado em 08/12/2025**
