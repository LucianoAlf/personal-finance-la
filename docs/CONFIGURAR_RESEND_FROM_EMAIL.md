# ⚙️ CONFIGURAR RESEND_FROM_EMAIL NO SUPABASE

## 📋 AÇÃO NECESSÁRIA

Você precisa adicionar uma nova variável no **Supabase Vault**:

### **1. Acesse o Supabase Dashboard:**
- Project Settings → Vault → Secrets

### **2. Adicione a nova secret:**

**Name:**
```
RESEND_FROM_EMAIL
```

**Value:**
```
Ana Clara <noreply@mypersonalfinance.com.br>
```

### **3. Clique em "Add new secret"**

---

## ✅ APÓS ADICIONAR

Execute o teste novamente para validar o email com o domínio correto!

**Comando SQL:**
```sql
DELETE FROM market_opportunities WHERE created_at >= CURRENT_DATE;

SELECT net.http_post(
  url := 'https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/investment-radar',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODg2NTgsImV4cCI6MjA3Nzc2NDY1OH0.IxhNnR85udF-0_WJshDCzV9w3KIe1gfpEJ6LWvdm_eU'
  ),
  body := '{}'::jsonb
) as request_id;
```

---

## 📧 VERIFICAR

Após executar, verifique seu email: **lucianoalf.la@gmail.com**

O remetente deve aparecer como: **Ana Clara <noreply@mypersonalfinance.com.br>**
