# 📱 Plano Completo: Lembretes via WhatsApp pela Ana Clara

**Versão:** 1.0 | **Data:** Novembro 2025 | **Projeto:** Personal Finance LA

---

## 🎯 Resumo Executivo

### Objetivo
Implementar sistema de **2 lembretes automáticos** via WhatsApp para contas a pagar:
- **1º:** 1 dia antes do vencimento às 9:00h
- **2º:** No dia do vencimento às 9:00h

### Escopo
✅ **Incluído:**
- Configuração simplificada (1 checkbox no modal)
- Agendamento automático via SQL function
- Envio via UAZAPI pela Ana Clara
- Tracking de status e retry automático
- Visualização de lembretes enviados

❌ **Não Incluído** (futuro):
- Personalização de horários
- Mais de 2 lembretes
- Push/Email notifications

---

## 🔍 Análise do Sistema Atual

### ✅ O que JÁ existe:
```
Frontend:
  - RemindersList.tsx (visualização)
  - Types e helpers de validação

Backend:
  - Tabela bill_reminders
  - Function schedule_bill_reminders (genérica)
  - Estrutura de status tracking

Infra:
  - UAZAPI configurado
  - N8N rodando
```

### ⚠️ O que PRECISA criar:
```
Frontend:
  - Switch "Lembretes WhatsApp" no BillDialog
  - Integração com SQL function simplificada

Backend:
  - SQL function schedule_simple_bill_reminders()
  - Índices de performance

N8N:
  - Workflow: Send Bill Reminders (Schedule 09:00)
  - Workflow: Retry Failed Reminders (30min)
  
Templates:
  - Mensagem WhatsApp personalizada
```

---

## 🏗️ Arquitetura Simplificada

```
[BillDialog] → Checkbox marcado
     ↓
[SQL Function] → Insere 2 registros em bill_reminders
     ↓
[N8N Schedule 09:00] → Busca pending reminders
     ↓
[N8N Loop] → Para cada:
     ├─ Formata mensagem
     ├─ Envia UAZAPI
     └─ Atualiza status
     ↓
[WhatsApp Usuário] → Recebe lembrete
```

---

## 📝 Requisitos Funcionais

### RF01: UI Simplificada
```tsx
// No BillDialog, aba "Opções"
<Switch 
  label="🔔 Lembretes via WhatsApp"
  description="1 dia antes (09:00) + no dia (09:00)"
  checked={enableReminders}
  onChange={setEnableReminders}
/>
```

### RF02: Agendamento Automático
```sql
-- Ao salvar conta, chamar:
SELECT schedule_simple_bill_reminders(
  bill_id,
  user_id,
  due_date,
  enable_reminders
);

-- Cria 2 registros:
-- 1. reminder_date = due_date - 1, time = 09:00, days_before = 1
-- 2. reminder_date = due_date, time = 09:00, days_before = 0
```

### RF03: Template WhatsApp
```
━━━━━━━━━━━━━━━━━━━
🔔 *Lembrete Ana Clara*

Olá {nome}! 👋

{contexto} você tem uma conta a pagar:

📄 *{descrição}*
💰 Valor: R$ {valor}
📅 Vencimento: {data}
🏢 Fornecedor: {fornecedor}

{urgência}

━━━━━━━━━━━━━━━━━━━
💡 Responda "pago" para marcar
━━━━━━━━━━━━━━━━━━━

Variáveis:
- contexto: "Amanhã (DD/MM)" ou "HOJE"
- urgência: "⏰ Não esqueça!" ou "⚠️ Vence hoje!"
```

### RF04: Retry Automático
```
Se envio falhar:
  1. status = 'failed'
  2. retry_count++
  3. Se retry_count < 3:
       → Workflow retry tenta após 30min
  4. Se retry_count >= 3:
       → Marca como definitivamente falho
```

---

## 🚀 ROADMAP EM FASES

### **FASE 1: Database** (1-2 dias)
```
✓ Verificar tabela bill_reminders
✓ Criar índices de performance
✓ Criar schedule_simple_bill_reminders()
✓ Testar com seeds
```

**SQL Function:**
```sql
CREATE OR REPLACE FUNCTION schedule_simple_bill_reminders(
  p_bill_id uuid,
  p_user_id uuid,
  p_due_date date,
  p_enable boolean
) RETURNS integer AS $$
BEGIN
  -- Deletar pendentes anteriores
  DELETE FROM bill_reminders
  WHERE bill_id = p_bill_id AND status = 'pending';
  
  IF NOT p_enable THEN RETURN 0; END IF;
  
  -- Inserir 2 lembretes
  INSERT INTO bill_reminders (
    bill_id, user_id, reminder_date, reminder_time, 
    days_before, channel, status
  ) VALUES
    (p_bill_id, p_user_id, p_due_date - 1, '09:00', 1, 'whatsapp', 'pending'),
    (p_bill_id, p_user_id, p_due_date, '09:00', 0, 'whatsapp', 'pending');
  
  RETURN 2;
END;
$$ LANGUAGE plpgsql;
```

---

### **FASE 2: N8N Workflows** (2-3 dias)

**Workflow 1: Send Bill Reminders**
```
Nodes:
  1. Schedule Trigger (cron: 0 9 * * *)
  2. Supabase Query (SELECT reminders WHERE date=TODAY AND time=09:00)
  3. IF (tem reminders?)
  4. Loop cada reminder:
     - Buscar bill + user data
     - Formatar mensagem
     - POST UAZAPI /messages/send
     - UPDATE status (sent/failed)
```

**Workflow 2: Retry Failed**
```
Nodes:
  1. Schedule Trigger (cron: */30 * * * *)
  2. Supabase Query (SELECT WHERE status=failed AND retry < 3)
  3. Loop retry (mesma lógica)
```

**UAZAPI Integration:**
```javascript
// HTTP Node config
{
  method: 'POST',
  url: `${UAZAPI_URL}/v1/instance/${INSTANCE_ID}/messages/send`,
  headers: { apiKey: UAZAPI_API_KEY },
  body: {
    phone: '5511999999999',
    message: messageText,
    isGroup: false
  },
  timeout: 10000
}
```

---

### **FASE 3: Frontend React** (2 dias)

**3.1 Modificar BillDialog**
```tsx
// src/components/payable-bills/BillDialog.tsx

// 1. Adicionar ao schema
const billSchema = z.object({
  // ... campos existentes
  enable_reminders: z.boolean().optional()
});

// 2. Na aba "Opções", adicionar:
<FormField
  control={form.control}
  name="enable_reminders"
  render={({ field }) => (
    <FormItem className="flex items-center justify-between border rounded-lg p-4">
      <div>
        <FormLabel className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Lembretes via WhatsApp
        </FormLabel>
        <FormDescription className="text-xs">
          Ana Clara te avisará: 1 dia antes (09:00) + no dia do vencimento (09:00)
        </FormDescription>
      </div>
      <Switch 
        checked={field.value ?? false} 
        onCheckedChange={field.onChange} 
      />
    </FormItem>
  )}
/>

// 3. No handleSubmit:
const { error } = await supabase.rpc('schedule_simple_bill_reminders', {
  p_bill_id: savedBill.id,
  p_user_id: user.id,
  p_due_date: savedBill.due_date,
  p_enable: data.enable_reminders ?? false
});

if (!error) {
  toast.success('Lembretes agendados!', {
    description: data.enable_reminders 
      ? 'Você receberá 2 lembretes via WhatsApp'
      : 'Lembretes desativados'
  });
}
```

**3.2 Badge no BillCard**
```tsx
// src/components/payable-bills/BillCard.tsx

// Adicionar indicador visual
{bill.enable_reminders && (
  <Badge variant="outline" className="gap-1">
    <Bell className="h-3 w-3" />
    Lembretes ativos
  </Badge>
)}
```

---

### **FASE 4: Testes e Deploy** (1-2 dias)

**Checklist de Testes:**
```
E2E:
  ☐ Criar conta com lembretes ON → verifica 2 registros em bill_reminders
  ☐ Criar conta com lembretes OFF → verifica 0 registros
  ☐ Editar conta ON→OFF → deleta lembretes pendentes
  ☐ Workflow N8N executa às 09:00 → envia mensagens
  ☐ Recebimento no WhatsApp → mensagem formatada correta
  ☐ Falha de envio → status=failed + retry funciona
  ☐ Marca como paga → não envia lembretes futuros

Performance:
  ☐ 100 contas simultâneas → processa em < 2min
  ☐ Queries otimizadas com índices
  ☐ Rate limit UAZAPI respeitado (100 msg/min)

Segurança:
  ☐ RLS policies impedem acesso cross-user
  ☐ Logs não expõem dados sensíveis
  ☐ API keys em variáveis de ambiente
```

---

##📊 Estimativas

### Tempo Total: **7-10 dias**
- Fase 1 (Database): 1-2 dias
- Fase 2 (N8N): 2-3 dias
- Fase 3 (Frontend): 2 dias
- Fase 4 (Testes): 1-2 dias
- Buffer: 1 dia

### Recursos Necessários
- 1 Dev Fullstack (React + SQL + N8N)
- Acesso UAZAPI (R$ 50/mês + R$ 0,05/msg)
- N8N Cloud ou self-hosted
- Supabase (plano Free ou Pro)

### Custos Operacionais (mensal)
```
Usuários: 100 ativos
Contas/mês: 300 (média 3 por usuário)
Lembretes: 600 (2 por conta)
Custo WhatsApp: 600 × R$ 0,05 = R$ 30,00/mês
Total: ~R$ 80/mês (infra + msgs)
```

---

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| UAZAPI instabilidade | Alto | Média | Sistema de retry + logs |
| Rate limit excedido | Médio | Baixa | Batch processing + throttling |
| Timezone issues | Baixo | Média | Usar America/Sao_Paulo em tudo |
| Custo > previsto | Médio | Baixa | Limitar 2 lembretes/conta |
| Spam complaints | Alto | Baixa | Opt-in explícito + fácil desabilitar |

---

## ✅ Critérios de Sucesso

**Técnicos:**
- ✓ 95% de entregas bem-sucedidas
- ✓ < 5min entre agendamento e envio
- ✓ 0 duplicações de mensagens
- ✓ Logs completos para auditoria

**Negócio:**
- ✓ 60% de adesão (usuários ativam lembretes)
- ✓ Redução de 30% em atrasos de pagamento
- ✓ NPS > 8 na feature
- ✓ < 2% de opt-outs

**UX:**
- ✓ Configuração em < 5 segundos
- ✓ Mensagens claras e objetivas
- ✓ Status visível e compreensível

---

## 📚 Próximos Passos

1. **Aprovação do Plano** → Validar com stakeholders
2. **Setup Ambiente** → Configurar UAZAPI + N8N
3. **Início FASE 1** → Começar pelo database
4. **Reuniões Diárias** → Acompanhar progresso
5. **MVP em 1 semana** → Testar com 5 usuários beta
6. **Launch em 2 semanas** → Rollout gradual

---

**Responsável:** Equipe de Desenvolvimento  
**Aprovação:** Pendente  
**Início:** A definir
