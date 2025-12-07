# 🧪 ROTEIRO DE TESTES END-TO-END - Ana Clara

**Data:** 15/11/2025  
**Objetivo:** Validar 100% do sistema integrado (WhatsApp + Backend + Frontend)  
**Duração estimada:** 30-45 minutos

---

## 📋 PRÉ-REQUISITOS

Antes de começar os testes, verifique:

### **1. Ambiente Preparado**
- [ ] Frontend rodando: `npm run dev` (http://localhost:3000)
- [ ] Edge Functions deployadas (analytics-query, process-whatsapp-message)
- [ ] WhatsApp conectado e ativo
- [ ] Banco de dados acessível (Supabase Dashboard)

### **2. Ferramentas de Validação**
- [ ] WhatsApp aberto no celular
- [ ] Navegador com frontend aberto
- [ ] Supabase Dashboard aberto (aba "Table Editor")
- [ ] Bloco de notas para anotar resultados

### **3. Dados Iniciais**
- [ ] Pelo menos 1 conta ativa no banco (`accounts`)
- [ ] Algumas transações existentes (para queries analíticas)
- [ ] Usuário autenticado no sistema

---

## 🎯 FASE 1: VALIDAÇÃO DO BANCO DE DADOS

**Objetivo:** Confirmar que TUDO que é enviado ao WhatsApp é salvo no banco.

---

### **TESTE 1.1: Criar Transação Simples**

#### **Ação no WhatsApp:**
```
Gastei R$45 no Uber
```

#### **Validação:**

**1. Resposta da Ana Clara (WhatsApp):**
- [ ] Confirma a criação da transação
- [ ] Mostra valor: R$ 45,00
- [ ] Mostra descrição: "Uber" ou similar
- [ ] Mostra categoria detectada (ex: "Transporte")
- [ ] Mostra conta usada
- [ ] Tempo de resposta: < 5 segundos

**2. Banco de Dados (Supabase → Table Editor → `transactions`):**
```sql
SELECT * FROM transactions 
WHERE description ILIKE '%uber%' 
ORDER BY created_at DESC 
LIMIT 1;
```

Verificar:
- [ ] `amount` = 45.00
- [ ] `description` contém "uber"
- [ ] `type` = 'expense'
- [ ] `category_id` está preenchido (não NULL)
- [ ] `account_id` está preenchido (não NULL)
- [ ] `user_id` é o seu
- [ ] `transaction_date` = hoje
- [ ] `created_at` é recente (< 1 minuto)

**3. Frontend (http://localhost:3000):**
- [ ] Atualizar a página
- [ ] Nova transação aparece na lista
- [ ] Valor correto: R$ 45,00
- [ ] Descrição: "Uber"
- [ ] Data: hoje
- [ ] Categoria correta
- [ ] Conta correta

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 1.2: Transação com Conta Específica**

#### **Ação no WhatsApp:**
```
Paguei R$120 no iFood no cartão Nubank
```

#### **Validação:**

**1. Resposta da Ana Clara:**
- [ ] Detectou conta: "Nubank"
- [ ] Valor: R$ 120,00
- [ ] Descrição: "iFood"
- [ ] Categoria: "Alimentação" ou similar

**2. Banco de Dados:**
```sql
SELECT t.*, a.name as account_name, c.name as category_name
FROM transactions t
JOIN accounts a ON t.account_id = a.id
JOIN categories c ON t.category_id = c.id
WHERE t.description ILIKE '%ifood%'
ORDER BY t.created_at DESC
LIMIT 1;
```

Verificar:
- [ ] `amount` = 120.00
- [ ] `account_name` = nome da conta Nubank
- [ ] `category_name` = categoria correta
- [ ] `type` = 'expense'

**3. Frontend:**
- [ ] Transação aparece
- [ ] Conta = Nubank
- [ ] Categoria correta

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 1.3: Transação SEM Conta Detectada (Fluxo de Seleção)**

#### **Ação no WhatsApp:**
```
Gastei R$80 na farmácia
```

#### **Validação:**

**1. Resposta da Ana Clara:**
- [ ] Não detectou conta automaticamente
- [ ] Pergunta: "Em qual conta foi esse gasto?"
- [ ] Lista suas contas ativas:
  ```
  1. Nubank
  2. Itaú
  3. Conta Corrente
  ```

**2. Responder com número:**
```
1
```

**3. Resposta da Ana Clara:**
- [ ] Confirma seleção: "Ok, registrei no Nubank"
- [ ] Mostra resumo da transação

**4. Banco de Dados:**
```sql
SELECT t.*, a.name as account_name
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE t.description ILIKE '%farmacia%'
ORDER BY t.created_at DESC
LIMIT 1;
```

Verificar:
- [ ] `amount` = 80.00
- [ ] `account_name` = "Nubank" (ou conta selecionada)
- [ ] Transação criada com sucesso

**5. Frontend:**
- [ ] Transação aparece
- [ ] Conta = a selecionada

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 1.4: Editar Transação**

#### **Ação no WhatsApp:**
```
Alterar valor da última transação para R$85
```

#### **Validação:**

**1. Resposta da Ana Clara:**
- [ ] Identifica qual transação editar (última)
- [ ] Confirma: "Valor alterado para R$ 85,00"

**2. Banco de Dados:**
```sql
SELECT * FROM transactions 
WHERE description ILIKE '%farmacia%'
ORDER BY created_at DESC 
LIMIT 1;
```

Verificar:
- [ ] `amount` = 85.00 (foi atualizado!)
- [ ] `updated_at` é recente

**3. Frontend:**
- [ ] Atualizar página
- [ ] Valor mudou para R$ 85,00

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 1.5: Deletar Transação**

#### **Ação no WhatsApp:**
```
Deletar a última transação
```

#### **Validação:**

**1. Resposta da Ana Clara:**
- [ ] Confirma: "Transação deletada com sucesso"

**2. Banco de Dados:**
```sql
SELECT * FROM transactions 
WHERE description ILIKE '%farmacia%'
AND deleted_at IS NULL
ORDER BY created_at DESC 
LIMIT 1;
```

Verificar:
- [ ] Transação NÃO aparece (soft delete) OU
- [ ] `deleted_at` está preenchido (se usar soft delete)

**3. Frontend:**
- [ ] Atualizar página
- [ ] Transação removida da lista

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

## 🎯 FASE 2: VALIDAÇÃO DE QUERIES ANALÍTICAS (FASE 2.1)

**Objetivo:** Confirmar que queries analíticas retornam dados REAIS (sem alucinação).

---

### **TESTE 2.1: Saldo de Conta**

#### **Ação no WhatsApp:**
```
Qual meu saldo no Nubank?
```

#### **Validação:**

**1. Resposta da Ana Clara:**
- [ ] Responde com emoji 💰
- [ ] Mostra nome da conta: "Saldo Nubank"
- [ ] Mostra valor formatado: "R$ X.XXX,XX"
- [ ] Tempo de resposta: < 3 segundos

**2. Verificar se é REAL:**
```sql
SELECT name, current_balance 
FROM accounts 
WHERE name ILIKE '%nubank%' 
AND is_active = true
LIMIT 1;
```

Comparar:
- [ ] Valor do WhatsApp = `current_balance` do banco
- [ ] Se diferentes, FALHOU (alucinação!)

**3. Frontend:**
- [ ] Ir para "Contas"
- [ ] Saldo do Nubank no frontend = saldo informado pela Ana

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 2.2: Gastos por Estabelecimento**

#### **Ação no WhatsApp:**
```
Quanto gastei no iFood esse mês?
```

#### **Validação:**

**1. Resposta da Ana Clara:**
- [ ] Responde com emoji 📊
- [ ] Mostra: "Gastos no ifood"
- [ ] Valor formatado: "R$ XXX,XX"
- [ ] Quantidade de transações: "X transações"
- [ ] Período: "esse mês"

**2. Verificar se é REAL:**
```sql
SELECT SUM(amount) as total, COUNT(*) as count
FROM transactions
WHERE description ILIKE '%ifood%'
AND type = 'expense'
AND transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
AND transaction_date <= CURRENT_DATE;
```

Comparar:
- [ ] Total do WhatsApp = `total` do banco
- [ ] Contagem do WhatsApp = `count` do banco
- [ ] Se diferentes, FALHOU (alucinação!)

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 2.3: Gastos por Categoria**

#### **Ação no WhatsApp:**
```
Quanto gastei em alimentação esse mês?
```

#### **Validação:**

**1. Resposta da Ana Clara:**
- [ ] Mostra: "Gastos em alimentação"
- [ ] Valor total
- [ ] Quantidade de transações
- [ ] Período

**2. Verificar se é REAL:**
```sql
SELECT SUM(t.amount) as total, COUNT(*) as count
FROM transactions t
JOIN categories c ON t.category_id = c.id
WHERE c.name ILIKE '%alimenta%'
AND t.type = 'expense'
AND t.transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
AND t.transaction_date <= CURRENT_DATE;
```

Comparar:
- [ ] Valores batem exatamente

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 2.4: Gastos por Tipo de Conta**

#### **Ação no WhatsApp:**
```
Quanto gastei de cartão de crédito esse mês?
```

#### **Validação:**

**1. Resposta da Ana Clara:**
- [ ] Mostra: "Gastos no cartão"
- [ ] Valor total
- [ ] Breakdown por conta (se tiver múltiplos cartões):
  ```
  *Por conta:*
  • Nubank: R$ X.XXX,XX
  • Itaú: R$ X.XXX,XX
  ```

**2. Verificar se é REAL:**
```sql
SELECT 
  a.name,
  SUM(t.amount) as total
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE a.type = 'credit_card'
AND t.type = 'expense'
AND t.transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
AND t.transaction_date <= CURRENT_DATE
GROUP BY a.name;
```

Comparar:
- [ ] Total geral bate
- [ ] Breakdown por conta bate

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 2.5: Query Combinada (Conta + Estabelecimento)**

#### **Ação no WhatsApp:**
```
Quanto gastei no iFood no cartão Nubank esse mês?
```

#### **Validação:**

**1. Resposta da Ana Clara:**
- [ ] Mostra: "ifood no Nubank"
- [ ] Valor específico dessa combinação

**2. Verificar se é REAL:**
```sql
SELECT SUM(t.amount) as total, COUNT(*) as count
FROM transactions t
JOIN accounts a ON t.account_id = a.id
WHERE t.description ILIKE '%ifood%'
AND a.name ILIKE '%nubank%'
AND t.type = 'expense'
AND t.transaction_date >= DATE_TRUNC('month', CURRENT_DATE)
AND t.transaction_date <= CURRENT_DATE;
```

Comparar:
- [ ] Valores batem exatamente

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 2.6: Períodos Diferentes**

#### **Ação no WhatsApp:**
```
Quanto gastei no Uber semana passada?
```

#### **Validação:**

**1. Resposta da Ana Clara:**
- [ ] Período: "semana passada"
- [ ] Valor correto para aquele período

**2. Calcular período "semana passada":**
- Início: domingo da semana passada
- Fim: sábado da semana passada

**3. Verificar banco:**
```sql
SELECT SUM(amount) as total
FROM transactions
WHERE description ILIKE '%uber%'
AND type = 'expense'
AND transaction_date BETWEEN '[inicio]' AND '[fim]';
```

Comparar:
- [ ] Valores batem

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 2.7: Query Sem Resultados**

#### **Ação no WhatsApp:**
```
Quanto gastei no Magazine Luiza esse mês?
```

#### **Validação:**

**1. Resposta da Ana Clara:**
- [ ] Responde: "Você não teve gastos no *Magazine Luiza* esse mês."
- [ ] NÃO inventa um valor!

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

## 🎯 FASE 3: VALIDAÇÃO DO FRONTEND

**Objetivo:** Confirmar que dados aparecem corretamente no sistema web.

---

### **TESTE 3.1: Dashboard Atualiza Automaticamente**

#### **Preparação:**
- [ ] Abrir frontend: http://localhost:3000
- [ ] Anotar saldo total atual: R$ _______

#### **Ação no WhatsApp:**
```
Gastei R$50 no mercado
```

#### **Validação:**

**1. Aguardar resposta da Ana Clara**
- [ ] Transação criada com sucesso

**2. Frontend (atualizar página):**
- [ ] Saldo total mudou: R$ _______ (deve ser R$ 50 a menos)
- [ ] Nova transação aparece na lista
- [ ] Gráficos atualizados (se houver)

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 3.2: Filtros e Buscas**

#### **Ação no Frontend:**
- [ ] Buscar por "mercado"
- [ ] Filtrar por data (hoje)
- [ ] Filtrar por categoria

#### **Validação:**
- [ ] Transação "mercado" aparece nos resultados
- [ ] Filtros funcionam corretamente
- [ ] Valores somam corretamente

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 3.3: Detalhes da Transação**

#### **Ação no Frontend:**
- [ ] Clicar na transação "mercado"

#### **Validação:**
- [ ] Modal/página de detalhes abre
- [ ] Todos os dados estão corretos:
  - [ ] Valor: R$ 50,00
  - [ ] Descrição: "mercado"
  - [ ] Categoria
  - [ ] Conta
  - [ ] Data
  - [ ] Hora de criação

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 3.4: Contas e Saldos**

#### **Ação no Frontend:**
- [ ] Ir para página "Contas" (ou equivalente)

#### **Validação:**
- [ ] Todas as contas aparecem
- [ ] Saldos corretos (comparar com banco)
- [ ] Tipos corretos (crédito, débito, corrente)

**Query de validação:**
```sql
SELECT name, type, current_balance 
FROM accounts 
WHERE is_active = true
ORDER BY name;
```

Comparar:
- [ ] Cada conta no frontend tem saldo = `current_balance` do banco

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

## 🎯 FASE 4: VALIDAÇÃO DE FLUXO CONVERSACIONAL

**Objetivo:** Confirmar que a Ana Clara é inteligente e fluida na conversa.

---

### **TESTE 4.1: Contexto de Conversa**

#### **Sequência no WhatsApp:**

**Mensagem 1:**
```
Gastei R$30 no Uber
```

**Aguardar resposta da Ana**

**Mensagem 2 (logo em seguida):**
```
Alterar para R$35
```

#### **Validação:**
- [ ] Ana entende que "alterar" refere-se à última transação
- [ ] Atualiza para R$ 35,00
- [ ] Confirma a alteração

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 4.2: Linguagem Natural**

#### **Teste diferentes formas de falar:**

**Forma 1:**
```
Gastei 40 reais no ifood
```

**Forma 2:**
```
40 no ifood
```

**Forma 3:**
```
ifood 40
```

#### **Validação:**
- [ ] Todas as 3 formas criam transação corretamente
- [ ] Valor = R$ 40,00
- [ ] Descrição contém "ifood"

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 4.3: Mensagens de Erro Claras**

#### **Ação no WhatsApp:**
```
Oi Ana
```

#### **Validação:**
- [ ] Responde de forma amigável
- [ ] Explica o que ela pode fazer
- [ ] NÃO tenta criar transação

**Ação 2:**
```
akjshdkajshd
```

#### **Validação:**
- [ ] Responde: "Não entendi, pode reformular?"
- [ ] Sugere exemplos

**Status:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

### **TESTE 4.4: Performance**

#### **Validação de Tempo de Resposta:**

| Ação | Tempo Esperado | Tempo Real | Status |
|------|----------------|------------|--------|
| Criar transação simples | < 5s | ___s | ⬜ |
| Query analítica (saldo) | < 3s | ___s | ⬜ |
| Query analítica (gastos) | < 3s | ___s | ⬜ |
| Editar transação | < 3s | ___s | ⬜ |

**Status Geral:** ⬜ PASSOU | ⬜ FALHOU  
**Se falhou, anotar:** _______________

---

## 🎯 FASE 5: VALIDAÇÃO DE EDGE CASES

**Objetivo:** Testar cenários extremos e validar robustez.

---

### **TESTE 5.1: Valores Grandes**

#### **Ação no WhatsApp:**
```
Comprei um carro por R$85.000
```

#### **Validação:**
- [ ] Ana aceita o valor
- [ ] Banco salva: 85000.00
- [ ] Frontend mostra: R$ 85.000,00

**Status:** ⬜ PASSOU | ⬜ FALHOU

---

### **TESTE 5.2: Valores Pequenos**

#### **Ação no WhatsApp:**
```
Gastei R$0,50 no chiclete
```

#### **Validação:**
- [ ] Ana aceita o valor
- [ ] Banco salva: 0.50
- [ ] Frontend mostra: R$ 0,50

**Status:** ⬜ PASSOU | ⬜ FALHOU

---

### **TESTE 5.3: Caracteres Especiais**

#### **Ação no WhatsApp:**
```
Gastei R$25 no Bob's (lanche & bebida)
```

#### **Validação:**
- [ ] Ana processa corretamente
- [ ] Descrição salva com apóstrofo e parênteses
- [ ] Frontend exibe corretamente

**Status:** ⬜ PASSOU | ⬜ FALHOU

---

### **TESTE 5.4: Múltiplas Contas com Mesmo Nome**

#### **Se você tiver 2 contas "Nubank" (improvável, mas validar):**

**Ação:**
```
Gastei R$100 no Nubank
```

#### **Validação:**
- [ ] Ana pede para esclarecer qual conta
- [ ] Oferece opções numeradas

**Status:** ⬜ PASSOU | ⬜ FALHOU

---

### **TESTE 5.5: Query Muito Complexa**

#### **Ação no WhatsApp:**
```
Quanto gastei de cartão de crédito em alimentação no iFood no mês de outubro?
```

#### **Validação:**
- [ ] Ana consegue processar OU
- [ ] Ana pede para simplificar a query

**Status:** ⬜ PASSOU | ⬜ FALHOU

---

## 📊 CHECKLIST FINAL DE FUNCIONALIDADES

### **✅ FASE 2.1 - Analytics (Implementado)**

| Funcionalidade | Status | Observações |
|----------------|--------|-------------|
| Saldo de conta | ⬜ OK ⬜ FALHA | ___________ |
| Gastos por categoria | ⬜ OK ⬜ FALHA | ___________ |
| Gastos por estabelecimento | ⬜ OK ⬜ FALHA | ___________ |
| Gastos por tipo de conta | ⬜ OK ⬜ FALHA | ___________ |
| Gastos combinados | ⬜ OK ⬜ FALHA | ___________ |
| Parser de períodos | ⬜ OK ⬜ FALHA | ___________ |
| Cache de intents | ⬜ OK ⬜ FALHA | ___________ |
| Fallback regex (70%) | ⬜ OK ⬜ FALHA | ___________ |
| gpt-4o-mini (economia) | ⬜ OK ⬜ FALHA | ___________ |

### **✅ FASE 2 - Conversacional (Implementado)**

| Funcionalidade | Status | Observações |
|----------------|--------|-------------|
| Criar transação simples | ⬜ OK ⬜ FALHA | ___________ |
| Criar com conta específica | ⬜ OK ⬜ FALHA | ___________ |
| Detecção automática de conta | ⬜ OK ⬜ FALHA | ___________ |
| Seleção manual de conta | ⬜ OK ⬜ FALHA | ___________ |
| Editar valor | ⬜ OK ⬜ FALHA | ___________ |
| Editar categoria | ⬜ OK ⬜ FALHA | ___________ |
| Deletar transação | ⬜ OK ⬜ FALHA | ___________ |
| Contexto de conversa | ⬜ OK ⬜ FALHA | ___________ |

### **✅ Integração WhatsApp ↔ Banco**

| Funcionalidade | Status | Observações |
|----------------|--------|-------------|
| Transações salvas no BD | ⬜ OK ⬜ FALHA | ___________ |
| Edições refletidas no BD | ⬜ OK ⬜ FALHA | ___________ |
| Deleções refletidas no BD | ⬜ OK ⬜ FALHA | ___________ |
| Contas detectadas corretamente | ⬜ OK ⬜ FALHA | ___________ |
| Categorias detectadas corretamente | ⬜ OK ⬜ FALHA | ___________ |

### **✅ Integração Banco ↔ Frontend**

| Funcionalidade | Status | Observações |
|----------------|--------|-------------|
| Transações aparecem no frontend | ⬜ OK ⬜ FALHA | ___________ |
| Saldos corretos | ⬜ OK ⬜ FALHA | ___________ |
| Filtros funcionam | ⬜ OK ⬜ FALHA | ___________ |
| Buscas funcionam | ⬜ OK ⬜ FALHA | ___________ |
| Detalhes completos | ⬜ OK ⬜ FALHA | ___________ |

---

## 🎯 RESULTADO FINAL

### **Estatísticas dos Testes:**

- **Total de testes:** _____ / 35
- **Passou:** _____ testes
- **Falhou:** _____ testes
- **Taxa de sucesso:** _____%

### **Criticidade:**

**🔴 BLOQUEADORES (impedem uso):**
- [ ] Nenhum

**🟡 IMPORTANTES (afetam experiência):**
- [ ] Nenhum

**🟢 OPCIONAIS (melhorias futuras):**
- [ ] Nenhum

---

## ✅ CRITÉRIO DE APROVAÇÃO

Para considerar o sistema **PRONTO PARA PRODUÇÃO**:

- [ ] **Mínimo 90% dos testes passaram** (32/35)
- [ ] **Zero bloqueadores** (🔴)
- [ ] **Máximo 2 importantes** (🟡)
- [ ] **Integração WhatsApp ↔ Banco ↔ Frontend funcionando 100%**
- [ ] **Queries analíticas retornam dados REAIS (zero alucinação)**
- [ ] **Performance aceitável (< 5s por operação)**

---

## 📝 RELATÓRIO DE BUGS/MELHORIAS

**Se encontrou problemas, documente aqui:**

### **BUG #1:**
- **Teste:** __________
- **Descrição:** __________
- **Severidade:** ⬜ Bloqueador ⬜ Importante ⬜ Menor
- **Reproduzir:** __________

### **BUG #2:**
- **Teste:** __________
- **Descrição:** __________
- **Severidade:** ⬜ Bloqueador ⬜ Importante ⬜ Menor
- **Reproduzir:** __________

### **MELHORIA #1:**
- **Descrição:** __________
- **Prioridade:** ⬜ Alta ⬜ Média ⬜ Baixa

---

## 🚀 PRÓXIMOS PASSOS

**Após validação completa:**

1. ✅ **Se passou >= 90%:**
   - [ ] Marcar FASE 2.1 como VALIDADA
   - [ ] Partir para FASE 2.2 (Múltiplas Contas + PIX + Transferências)

2. ⚠️ **Se passou 70-89%:**
   - [ ] Corrigir bugs importantes
   - [ ] Re-testar itens que falharam
   - [ ] Validar novamente

3. ❌ **Se passou < 70%:**
   - [ ] Investigar problemas estruturais
   - [ ] Revisar implementação
   - [ ] Consultar logs (Supabase + Edge Functions)

---

**🎯 BOA SORTE NOS TESTES!**

**Tempo estimado:** 30-45 minutos  
**Recomendação:** Fazer com calma, validar cada passo, anotar tudo.

**Se precisar de ajuda durante os testes, me chame!** 🚀
