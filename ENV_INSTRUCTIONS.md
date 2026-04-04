# Environment setup

Este guia foi consolidado em [docs/SUPABASE_SETUP.md](/d:/2026/personal-finance/personal-finance-la/docs/SUPABASE_SETUP.md).

## Resumo rapido

1. Copie [.env.local.example](/d:/2026/personal-finance/personal-finance-la/.env.local.example) para `.env.local`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Use `SUPABASE_ACCESS_TOKEN` apenas para CLI e Management API.
4. Guarde `SUPABASE_SERVICE_ROLE_KEY` somente em secrets de servidor ou Edge Functions.
