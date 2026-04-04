# personal-finance-la

Aplicativo financeiro pessoal da LA Music.

## Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Supabase

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Conexao com Supabase

O projeto remoto usado por este repositorio e:

- Project name: `Personal Finance LA`
- Project ref: `sbnpmhmvcspwcyjhftlw`
- Project URL: `https://sbnpmhmvcspwcyjhftlw.supabase.co`

O setup foi consolidado em [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

Resumo rapido:

1. Copie [.env.local.example](/d:/2026/personal-finance/personal-finance-la/.env.local.example) para `.env.local`.
2. Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Para CLI, use `SUPABASE_ACCESS_TOKEN` e o `project ref`.
4. Para Edge Functions, configure os secrets no projeto remoto.
