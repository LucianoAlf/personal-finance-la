# 📋 CHECKLIST DE TESTES - WHATSAPP (Ana Clara)

**Data:** 16/12/2025  
**Objetivo:** Validar que todos os fluxos principais estão funcionando

---

## 🔴 TESTES CRÍTICOS (Fazer Primeiro)

### 1. Transações Básicas

| # | Mensagem para Enviar | Resposta Esperada | ✅/❌ |
|---|---------------------|-------------------|------|
| 1.1 | `Gastei 50 no mercado` | Despesa registrada R$ 50,00 | ☐ |
| 1.2 | `Recebi 5000 de salário` | Receita registrada R$ 5.000,00 | ☐ |
| 1.3 | `Transferi 500 do Nubank pro Itaú` | Transferência registrada | ☐ |

### 2. Consultas de Saldo

| # | Mensagem para Enviar | Resposta Esperada | ✅/❌ |
|---|---------------------|-------------------|------|
| 2.1 | `Qual meu saldo?` | Lista de saldos por conta | ☐ |
| 2.2 | `Saldo do Nubank` | Saldo específico do Nubank | ☐ |
| 2.3 | `Quanto tenho no Itaú?` | Saldo específico do Itaú | ☐ |

### 3. Cartão de Crédito

| # | Mensagem para Enviar | Resposta Esperada | ✅/❌ |
|---|---------------------|-------------------|------|
| 3.1 | `Gastei 200 no cartão Nubank` | Compra no cartão registrada | ☐ |
| 3.2 | `Comprei TV em 10x de 500` | Compra parcelada registrada | ☐ |
| 3.3 | `Fatura do Nubank` | Mostra valor da fatura | ☐ |
| 3.4 | `Limite do cartão` | Mostra limite disponível | ☐ |

### 4. Contas a Pagar

| # | Mensagem para Enviar | Resposta Esperada | ✅/❌ |
|---|---------------------|-------------------|------|
| 4.1 | `Netflix 55 dia 17` | Conta cadastrada | ☐ |
| 4.2 | `Minhas contas a pagar` | Lista de contas | ☐ |
| 4.3 | `Paguei a luz` | Pergunta valor ou marca paga | ☐ |
| 4.4 | `Contas vencendo essa semana` | Lista próximos vencimentos | ☐ |

---

## 🟡 TESTES DE AMBIGUIDADE (Bugs Corrigidos)

### 5. Banco vs Cartão (BUG #13, #16)

| # | Mensagem para Enviar | Resposta Esperada | ✅/❌ |
|---|---------------------|-------------------|------|
| 5.1 | `Paguei 50 no Itaú` | Pergunta: débito ou crédito? | ☐ |
| 5.2 | (responder) `débito` | Registra como débito no Itaú | ☐ |
| 5.3 | `Gastei 100 no pix` | Registra direto (não pergunta) | ☐ |
| 5.4 | `Gastei 80 no débito do Nubank` | Registra direto (não pergunta) | ☐ |

### 6. Contexto Preservado (BUG #14, #18)

| # | Mensagem para Enviar | Resposta Esperada | ✅/❌ |
|---|---------------------|-------------------|------|
| 6.1 | `Gastei 150 no Bradesco` | Pergunta método | ☐ |
| 6.2 | (responder) `crédito` | Registra no cartão Bradesco (não perde banco) | ☐ |
| 6.3 | `Comprei lanche e paguei no pix` | Registra como nova transação (não confunde com contexto) | ☐ |

---

## 🟢 TESTES DE EDIÇÃO E EXCLUSÃO

### 7. Editar Transação

| # | Mensagem para Enviar | Resposta Esperada | ✅/❌ |
|---|---------------------|-------------------|------|
| 7.1 | (após registrar) `Era 95` | Corrige valor para R$ 95,00 | ☐ |
| 7.2 | `Muda pra Nubank` | Muda conta para Nubank | ☐ |
| 7.3 | `Era alimentação` | Muda categoria | ☐ |

### 8. Excluir Transação

| # | Mensagem para Enviar | Resposta Esperada | ✅/❌ |
|---|---------------------|-------------------|------|
| 8.1 | (após registrar) `Exclui essa` | Exclui última transação | ☐ |
| 8.2 | `Cancela` | Cancela operação em andamento | ☐ |

---

## 🔵 TESTES DE RELATÓRIOS

### 9. Consultas e Relatórios

| # | Mensagem para Enviar | Resposta Esperada | ✅/❌ |
|---|---------------------|-------------------|------|
| 9.1 | `Quanto gastei esse mês?` | Total de gastos do mês | ☐ |
| 9.2 | `Extrato do Nubank` | Últimas transações do Nubank | ☐ |
| 9.3 | `Resumo do mês` | Relatório mensal | ☐ |
| 9.4 | `Gastos por categoria` | Gastos agrupados | ☐ |

---

## ⚪ TESTES SOCIAIS

### 10. Saudações e Ajuda

| # | Mensagem para Enviar | Resposta Esperada | ✅/❌ |
|---|---------------------|-------------------|------|
| 10.1 | `Oi Ana` | Saudação personalizada | ☐ |
| 10.2 | `Me ajuda` | Lista de comandos | ☐ |
| 10.3 | `Obrigado` | Resposta de agradecimento | ☐ |
| 10.4 | `Qual a capital do Brasil?` | Resposta educada fora do escopo | ☐ |

---

## 📊 RESULTADO DOS TESTES

| Categoria | Total | Passou | Falhou |
|-----------|-------|--------|--------|
| Transações Básicas | 3 | ☐ | ☐ |
| Consultas de Saldo | 3 | ☐ | ☐ |
| Cartão de Crédito | 4 | ☐ | ☐ |
| Contas a Pagar | 4 | ☐ | ☐ |
| Ambiguidade | 4 | ☐ | ☐ |
| Contexto | 3 | ☐ | ☐ |
| Edição | 3 | ☐ | ☐ |
| Exclusão | 2 | ☐ | ☐ |
| Relatórios | 4 | ☐ | ☐ |
| Social | 4 | ☐ | ☐ |
| **TOTAL** | **34** | ☐ | ☐ |

---

## 🐛 BUGS ENCONTRADOS

| # | Mensagem | Comportamento Esperado | Comportamento Real | Prioridade |
|---|----------|------------------------|-------------------|------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## ✅ CRITÉRIOS DE APROVAÇÃO

- **Mínimo para produção:** 90% dos testes críticos (seções 1-4) passando
- **Ideal:** 100% dos testes passando
- **Bloqueador:** Qualquer falha nas seções 5-6 (bugs já corrigidos)

---

*Checklist gerado em 16/12/2025 - Auditoria Parte 5*
