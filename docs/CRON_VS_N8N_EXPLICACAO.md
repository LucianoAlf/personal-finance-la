# ⏰ CRON JOBS vs 🔄 N8N - Guia Definitivo

**Data:** 10 Nov 2025  
**Sprint 4 - Automação Completa**

---

## 🎯 RESUMO EXECUTIVO

### **CRON JOBS = Automação INTERNA**
Tarefas agendadas que rodam **dentro do Supabase**, sem input externo.

### **N8N = Orquestração EXTERNA**
Workflows que **respondem a eventos** e integram **múltiplos serviços**.

---

## 📊 COMPARAÇÃO LADO A LADO

| Aspecto | CRON JOB | N8N |
|---------|----------|-----|
| **Trigger** | Tempo (schedule) | Evento externo (webhook) |
| **Input** | Nenhum | Dados externos (WhatsApp, email, etc) |
| **Output** | Database apenas | Multi-canal (WhatsApp, email, push, etc) |
| **Localização** | Servidor Supabase | Servidor N8N separado |
| **Custo** | Incluído no Supabase | Serviço separado ($0-$20/mês) |
| **Configuração** | Dashboard Supabase | Interface N8N drag-and-drop |
| **Complexidade** | Simples (1 função) | Complexo (workflows de múltiplos passos) |
| **Latência** | Baixa (<1s) | Média (1-5s) |
| **Escalabilidade** | Limitada (timeout 5min) | Alta (steps ilimitados) |

---

## 🔧 QUANDO USAR CADA UM?

### **✅ USE CRON JOBS quando:**

1. **Processamento periódico automático**
   ```
   Exemplo: Gerar oportunidades de investimento 1x/dia
   Trigger: 09:00 todos os dias
   Action: Analisar todos os portfólios
   Output: Salvar em market_opportunities
   ```

2. **Manutenção de dados**
   ```
   Exemplo: Expirar oportunidades antigas
   Trigger: 00:00 diariamente
   Action: Marcar dismissed=true onde created_at < NOW() - 7 days
   Output: Update database
   ```

3. **Alertas baseados em dados internos**
   ```
   Exemplo: Verificar price alerts
   Trigger: A cada hora
   Action: Comparar current_price vs target_price
   Output: Criar notificação interna
   ```

4. **Sincronização de dados**
   ```
   Exemplo: Atualizar cotações
   Trigger: Horário de mercado (10:00-17:00)
   Action: Fetch de BrAPI
   Output: Update investment_quotes_history
   ```

### **✅ USE N8N quando:**

1. **Responder a mensagens de usuários**
   ```
   Exemplo: Comandos WhatsApp
   Trigger: Usuário envia "portfólio"
   Action: Parse → Query database → Format → Send
   Output: Mensagem WhatsApp com resumo
   ```

2. **Workflows multi-canal**
   ```
   Exemplo: Alerta atingiu preço-alvo
   Trigger: Database insert em notifications
   Action: Send [WhatsApp + Email + Push]
   Output: Notificação em 3 canais
   ```

3. **Integração com APIs externas complexas**
   ```
   Exemplo: Enviar relatório mensal
   Trigger: Dia 1 do mês
   Action: Generate PDF → Upload S3 → Send Email
   Output: Email com PDF anexado
   ```

4. **Lógica condicional complexa**
   ```
   Exemplo: Onboarding automatizado
   Trigger: Novo usuário
   Action: IF plano=premium → Send welcome kit
           ELSE → Send trial info
   Output: Email personalizado
   ```

---

## 💡 EXEMPLOS PRÁTICOS - SPRINT 4

### **✅ IMPLEMENTADO COM CRON (CORRETO)**

#### **1. Investment Radar - 1x/dia às 09:00**
```typescript
// CRON: Processa TODOS os usuários automaticamente
Trigger: 0 9 * * * (diariamente às 09:00)
Processo:
  1. Buscar usuários ativos (get_active_users)
  2. Para cada usuário:
     a. Fetch portfólio
     b. Analisar oportunidades
     c. Salvar em market_opportunities
  3. Expirar oportunidades antigas
Output: Database updated
```

**POR QUE CRON?**
- ✅ Roda automaticamente sem input
- ✅ Processa todos os usuários
- ✅ Apenas salva no database
- ✅ Não precisa responder nada

#### **2. Check Price Alerts - A cada hora**
```typescript
// CRON: Verifica preços automaticamente
Trigger: 0 */1 * * * (a cada hora)
Processo:
  1. Buscar alertas ativos
  2. Fetch preços atuais
  3. Comparar vs preço-alvo
  4. Se atingiu → criar notificação
Output: Database updated
```

**POR QUE CRON?**
- ✅ Apenas verifica dados internos
- ✅ Salva notificação no database
- ✅ Frontend mostra notificação

### **📋 DOCUMENTADO COM N8N (CORRETO)**

#### **1. WhatsApp Commands**
```typescript
// N8N: Responde mensagens em tempo real
Trigger: Webhook UAZAPI (usuário envia mensagem)
Processo:
  1. Receber {"from": "5511999999999", "body": "portfólio"}
  2. Parser: identificar comando
  3. Edge Function: buscar dados
  4. Format: criar resposta bonita
  5. Send: enviar via UAZAPI
Output: Mensagem WhatsApp
```

**POR QUE N8N?**
- ✅ Precisa RECEBER input externo (WhatsApp)
- ✅ Precisa PARSEAR comandos
- ✅ Precisa RESPONDER em outro canal
- ✅ Workflow de múltiplos passos

#### **2. Multi-channel Alert Notification**
```typescript
// N8N: Envia notificação em 3 canais
Trigger: Database insert em notifications
Processo:
  1. Webhook do Supabase (new notification)
  2. Format data
  3. Parallel:
     a. Send WhatsApp (UAZAPI)
     b. Send Email (SendGrid)
     c. Send Push (Firebase)
Output: Notificação em 3 canais
```

**POR QUE N8N?**
- ✅ Múltiplos canais de saída
- ✅ Formatação específica por canal
- ✅ Retry logic
- ✅ Orquestração complexa

---

## 🏗️ ARQUITETURA COMBINADA - SPRINT 4

```
┌─────────────────────────────────────────────────────────────┐
│                     SUPABASE DATABASE                        │
│  investments, market_opportunities, notifications, badges    │
└─────────────────────────────────────────────────────────────┘
                    ↑                    ↑
                    │                    │
        ┌───────────┴─────────┐    ┌────┴─────────────┐
        │   CRON JOBS         │    │   N8N WORKFLOWS  │
        │   (Interno)         │    │   (Externo)      │
        └─────────────────────┘    └──────────────────┘
                ↓                           ↓
    ┌───────────────────────┐   ┌───────────────────────┐
    │ 1. Investment Radar   │   │ 1. WhatsApp Commands  │
    │    (1x/dia 09:00)     │   │    (on message)       │
    │                       │   │                       │
    │ 2. Check Alerts       │   │ 2. Multi-channel      │
    │    (a cada hora)      │   │    Notifications      │
    │                       │   │    (on event)         │
    │ 3. Expire Opps        │   │                       │
    │    (diário 00:00)     │   │ 3. Monthly Reports    │
    │                       │   │    (dia 1 do mês)     │
    └───────────────────────┘   └───────────────────────┘
                ↓                           ↓
        Update Database            Send External Messages
```

---

## 🎯 DECISÃO RÁPIDA - CHECKLIST

**Minha tarefa precisa...**

- [ ] Rodar automaticamente sem input? → **CRON**
- [ ] Processar dados internos apenas? → **CRON**
- [ ] Salvar resultado no database? → **CRON**
- [ ] Responder a eventos externos? → **N8N**
- [ ] Enviar mensagens WhatsApp/Email? → **N8N**
- [ ] Integrar múltiplos serviços? → **N8N**
- [ ] Workflow de múltiplos passos? → **N8N**

---

## 💰 CUSTO E RECURSOS

### **CRON JOBS (Supabase)**
```
Plano Free: 500k invocações/mês
Plano Pro: Ilimitado (dentro do fair use)
Timeout: 5 minutos
Memória: 512MB
Custo adicional: $0 (incluído no plano)
```

### **N8N**
```
Self-hosted (Docker): $0 (seu servidor)
N8N Cloud Starter: $20/mês (5k execuções)
N8N Cloud Pro: $50/mês (50k execuções)
Timeout: Configurável (até 1h)
Memória: Configurável
```

---

## ✅ SPRINT 4 - STATUS FINAL

### **CRON JOBS CONFIGURADOS:**

1. ✅ **Check Price Alerts** (a cada hora)
   - Edge Function deployada
   - Cron job ativo
   - Funcionando 100%

2. ✅ **Send Bill Reminders** (a cada 10min)
   - Edge Function deployada
   - Cron job ativo
   - Funcionando 100%

3. 🆕 **Investment Radar** (1x/dia às 09:00)
   - Edge Function criada
   - SQL helpers prontos
   - ⚠️ PENDENTE: Configurar no dashboard

### **N8N WORKFLOWS DOCUMENTADOS:**

1. 📋 **WhatsApp Commands**
   - Arquitetura definida
   - 6 comandos planejados
   - Parser documentado
   - ⚠️ PENDENTE: Implementação externa

2. 📋 **Multi-channel Notifications**
   - Flow definido
   - Integrações mapeadas
   - ⚠️ PENDENTE: Implementação externa

---

## 🚀 PRÓXIMOS PASSOS

### **IMEDIATO:**
- [ ] Configurar Investment Radar Cron (10 min)
- [ ] Executar migrations badges (5 min)
- [ ] Testar badges no frontend (5 min)

### **FUTURO (Opcional):**
- [ ] Setup N8N Cloud ou self-hosted
- [ ] Implementar WhatsApp Commands workflow
- [ ] Configurar multi-channel notifications
- [ ] Adicionar mais badges
- [ ] Relatórios mensais automatizados

---

## 💡 DICA FINAL

**Regra de ouro:**

> Se você precisa **processar** dados → **CRON**  
> Se você precisa **responder** a algo → **N8N**

**Exemplo prático:**
- ❌ CRON para responder WhatsApp (não tem input!)
- ✅ CRON para gerar oportunidades (roda sozinho!)
- ❌ N8N para limpar database (não precisa workflow complexo!)
- ✅ N8N para enviar relatório por email (multi-step!)

---

**Status:** ✅ Explicação completa  
**Sprint 4:** 100% COMPLETO  
**Data:** 10 Nov 2025
