# 🔐 VARIÁVEIS DE AMBIENTE PARA VERCEL

**Alf, você precisa adicionar essas variáveis de ambiente na Vercel:**

## 📍 Como Adicionar:

1. Acesse: https://vercel.com/luciano-alfs-projects/personal-finance-la/settings/environment-variables
2. Adicione cada variável abaixo
3. Marque: **Production**, **Preview** e **Development**
4. Clique em **Save**

---

## 🔑 VARIÁVEIS OBRIGATÓRIAS:

### **VITE_SUPABASE_URL**
```
https://sbnpmhmvcspwcyjhftlw.supabase.co
```

### **VITE_SUPABASE_ANON_KEY**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODg2NTgsImV4cCI6MjA3Nzc2NDY1OH0.Fy9xPU0YXqWQPPOQHgpNHjmFEYhPCXJLfFPbPBCdUYk
```

### **VITE_VAPID_PUBLIC_KEY**
```
BJU7xxWFkbG0MA40XdcoJCd5uRFXs34Q6vpLXyB430itLQf5BMvXD0AYbp7YJAtk8HIOWyOTrpDDtcYb911wKbE
```

---

## ✅ DEPOIS DE ADICIONAR:

1. Volte em **Deployments**
2. Clique nos **3 pontinhos** do último deploy
3. Clique em **Redeploy**
4. Aguarde o deploy terminar
5. Teste novamente!

---

**IMPORTANTE:** Sem essas variáveis, o app não consegue conectar no Supabase e fica com tela branca!
