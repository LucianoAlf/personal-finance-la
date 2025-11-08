# 🔐 CONFIGURAÇÃO DE AMBIENTE

## ⚠️ IMPORTANTE: NUNCA COMMITAR CHAVES SECRETAS!

### Arquivos que NUNCA vão pro Git (.gitignore):
- `.env.local` - Chaves secretas locais
- `.vercel` - Config local da Vercel

### Arquivos que PODEM ir pro Git:
- `src/lib/email.ts` - Código do cliente
- `supabase/functions/*/index.ts` - Edge Functions
- `package.json` - Dependências

---

## 🚀 COMO CONFIGURAR EM OUTRA MÁQUINA:

### 1️⃣ Clonar o projeto:
```bash
git clone [url-do-repo]
cd personal-finance-la
npm install
```

### 2️⃣ Criar `.env.local` com as chaves:
```bash
# Supabase
VITE_SUPABASE_URL=https://sbnpmhmvcspwcyjhftlw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNibnBtaG12Y3Nwd2N5amhmdGx3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxODg2NTgsImV4cCI6MjA3Nzc2NDY1OH0.IxhNnR85udF-0_WJshDCzV9w3KIe1gfpEJ6LWvdm_eU
VITE_VAPID_PUBLIC_KEY=BJU7xxWFkbG0MA40XdcoJCd5uRFXs34Q6vpLXyB430itLQf5BMvXD0AYbp7YJAtk8HIOWyOTrpDDtcYb911wKbE

# Resend
RESEND_API_KEY=re_2LWckZTk_2G9b8Fk8xai5JPapXZ8qvtHQ
RESEND_FROM_EMAIL=noreply@mypersonalfinance.com.br
```

### 3️⃣ Configurar secrets na Supabase:
```bash
npx supabase secrets set RESEND_API_KEY=re_2LWckZTk_2G9b8Fk8xai5JPapXZ8qvtHQ --project-ref sbnpmhmvcspwcyjhftlw
```

### 4️⃣ Deploy de Edge Functions:
```bash
npx supabase functions deploy test-email --project-ref sbnpmhmvcspwcyjhftlw --no-verify-jwt
```

---

## ✅ O QUE FOI IMPLEMENTADO HOJE:

### 📱 Push Notifications:
- ✅ Frontend completo com Service Worker
- ✅ Backend com VAPID keys configuradas
- ✅ Deploy em produção (Vercel)
- ✅ Testado no celular (funciona!)

### 📧 Emails com Resend:
- ✅ Resend instalado e configurado
- ✅ Edge Function para envio
- ✅ Cliente frontend sem expor chaves
- ✅ Email da Ana Clara funcionando

### 🚀 Deploy:
- ✅ Frontend: https://personal-finance-la.vercel.app
- ✅ Edge Functions: Supabase Functions
- ✅ Variáveis de ambiente configuradas

---

**RESUMO: O código está pronto para produção, só precisa configurar as chaves secretas!** 🔐
