# Backlog: drift histórico Supabase (migrations locais vs remoto)

**Data:** 2026-04-06  
**Prioridade:** dívida técnica (não bloqueia features atuais no projeto já ligado ao remoto)  
**Escopo funcional já validado:** `Metas > Configurações` (persistência, front, integrações Ana Clara, alertas, dashboard, ciclos, E2E).

## Problema

O histórico em `supabase/migrations` **não espelha** todas as versões aplicadas no projeto Supabase remoto. Há versões **só no remoto** e arquivos **só no repositório**, o que gera:

- `supabase db push` / alinhamento automático arriscado sem passo de reparo
- ambiente novo criado **só** a partir do repo pode nascer **incompleto ou divergente**
- `supabase migration list` mostra colunas Local vs Remote desalinhadas

## O que não é pendência deste item

- Funcionalidade da aba Configurações, edge functions já deployadas e fluxos E2E já validados no ambiente atual.

## O que fazer depois (quando for prioridade)

1. Exportar / documentar o estado remoto: `supabase migration list` (linked) e, se necessário, `supabase db dump` ou inventário de tabelas críticas.
2. Decidir estratégia única:
   - **A)** `supabase migration fetch` + alinhar arquivos locais com o que só existe no remoto; ou  
   - **B)** `supabase migration repair` para marcar versões como aplicadas/revertidas de forma consistente com a realidade; ou  
   - **C)** baseline: uma migration “squash” documentada + reparo do histórico (só com cuidado e backup).
3. Garantir que qualquer migration nova use timestamps únicos e não conflite com versões remotas já registradas.
4. Opcional: CI que rode `migration list` e falhe se houver divergência não explicada.

## Referência rápida

- Repositório local: `supabase/migrations/`
- CLI: `supabase migration list`, `supabase migration repair --help`, `supabase migration fetch`

---

*Registrado para lembrar antes de: novo projeto Supabase, novo clone “do zero”, ou refator grande que dependa de histórico de migrations confiável.*
