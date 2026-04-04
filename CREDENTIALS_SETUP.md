# Credentials setup

As instrucoes principais de conexao e credenciais agora estao em [docs/SUPABASE_SETUP.md](/d:/2026/personal-finance/personal-finance-la/docs/SUPABASE_SETUP.md).

## Mapa rapido

- `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`: frontend web
- `SUPABASE_SERVICE_ROLE_KEY`: Edge Functions, automacoes e rotinas server-side
- `SUPABASE_ACCESS_TOKEN`: CLI e Management API
- `SUPABASE_DB_PASSWORD`: `supabase link`, `db pull` e `db push`

Nao mantenha chaves reais em arquivos versionados.
