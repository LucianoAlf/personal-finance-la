# Supabase setup - Personal Finance LA

Este repositorio esta apontado para o projeto remoto abaixo:

- Project name: `Personal Finance LA`
- Project ref: `sbnpmhmvcspwcyjhftlw`
- Project URL: `https://sbnpmhmvcspwcyjhftlw.supabase.co`

## Validacao feita

Em `2026-04-03`, a conexao foi validada assim:

- Management API respondeu o projeto `Personal Finance LA` com status `ACTIVE_HEALTHY`
- `URL + anon key` inicializaram um cliente Supabase sem erro
- `service role key` respondeu a uma chamada administrativa de Auth sem erro

## 1. Frontend local

Copie o arquivo de exemplo:

```powershell
Copy-Item .env.local.example .env.local
```

Preencha pelo menos:

```env
VITE_SUPABASE_URL=https://sbnpmhmvcspwcyjhftlw.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Opcional:

```env
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key
```

## 2. O que cada credencial faz

- `VITE_SUPABASE_ANON_KEY`: usada no navegador e nas chamadas publicas do app
- `SUPABASE_SERVICE_ROLE_KEY`: usada apenas no servidor, Edge Functions e automacoes
- `SUPABASE_ACCESS_TOKEN`: usada pela Supabase CLI e pela Management API
- `SUPABASE_DB_PASSWORD`: usada para `supabase link`, `db pull` e `db push`

## 3. Supabase CLI

Segundo a documentacao oficial do Supabase CLI:

- `supabase login` autentica com personal access token
- `supabase link --project-ref ...` conecta o repo ao projeto remoto
- `supabase link` tambem aceita `--password` para a senha do banco remoto

Fluxo sugerido:

```powershell
npx supabase login --token "your_personal_access_token"
npx supabase link --project-ref sbnpmhmvcspwcyjhftlw --password "your_database_password"
npx supabase db pull
```

Se voce nao quiser persistir login local, a CLI tambem aceita `SUPABASE_ACCESS_TOKEN` por variavel de ambiente.

## 4. Edge Functions e secrets remotos

As functions deste repositorio leem secrets como:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `RESEND_API_KEY`
- `OPENAI_API_KEY`
- `UAZAPI_SERVER_URL`
- `UAZAPI_INSTANCE_TOKEN`
- `UAZAPI_PHONE_NUMBER`
- `UAZAPI_WEBHOOK_URL`

Exemplo com placeholders:

```powershell
npx supabase secrets set --project-ref sbnpmhmvcspwcyjhftlw `
  SUPABASE_URL=https://sbnpmhmvcspwcyjhftlw.supabase.co `
  SUPABASE_ANON_KEY=your_supabase_anon_key `
  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key `
  CRON_SECRET=your_cron_secret
```

## 5. Deploy de functions

Depois de autenticar e linkar o projeto:

```powershell
npx supabase functions deploy
```

Ou uma function especifica:

```powershell
npx supabase functions deploy test-email
```

## 6. Vercel

Na Vercel, configure:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_VAPID_PUBLIC_KEY`

Essas variaveis devem existir em `Production`, `Preview` e `Development`.

## 7. Onde o codigo le a configuracao

- [src/lib/supabase.ts](/d:/2026/personal-finance/personal-finance-la/src/lib/supabase.ts)
- [src/lib/email.ts](/d:/2026/personal-finance/personal-finance-la/src/lib/email.ts)

Ambos agora dependem de `import.meta.env`, sem fallback com chave embutida no codigo.

## Referencias oficiais

- Supabase CLI login: https://supabase.com/docs/reference/cli/supabase-login
- Supabase local development: https://supabase.com/docs/guides/local-development/overview
- Supabase functions deploy: https://supabase.com/docs/guides/functions/deploy
