# ⏰ ALTERAR HORÁRIO DO INVESTMENT RADAR PARA 09:30

## 📋 INSTRUÇÕES

### **1. Acesse o Supabase Dashboard**
- Database → Cron Jobs

### **2. Localize o Job:**
- **Nome:** Investment Radar
- **Job ID:** 16
- **Schedule atual:** `0 9 * * *` (09:00)

### **3. Edite o Schedule:**

**Clique em "Edit" no Job ID 16**

**Altere o campo "Schedule" de:**
```
0 9 * * *
```

**Para:**
```
30 9 * * *
```

### **4. Salve as alterações**

---

## ✅ RESULTADO

Após a alteração, o Investment Radar rodará:

**Antes:** 09:00 (conflitava com lembretes de contas)  
**Depois:** 09:30 ✅

---

## 📅 CRONOGRAMA DIÁRIO

**09:00** → Lembretes de Contas a Pagar (WhatsApp + Email)  
**09:30** → Investment Radar - Ana Clara (WhatsApp + Email)

---

## 🔍 FORMATO CRON

O formato `30 9 * * *` significa:
- `30` = minuto 30
- `9` = hora 9
- `*` = todos os dias do mês
- `*` = todos os meses
- `*` = todos os dias da semana

**Resultado:** Todos os dias às 09:30

---

## ⚠️ IMPORTANTE

Após salvar, a alteração é **imediata**. O próximo disparo será amanhã às 09:30!
