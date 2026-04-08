# Mini-plano: endurecimento da arquitetura de IA (Ana Clara)

**Data**: 2026-04-08  
**Escopo**: Itens pendentes após a bateria de correções de runtime (GPT-5/OpenRouter/Gemini).  
**Fluxo de trabalho**: tudo na branch `main` (sem PRs obrigatórios); agentes podem pegar workstreams em paralelo, depois uma pessoa (ou um agente) consolida, roda verificação e faz deploy quando aplicável.

---

## Objetivos

1. **Uma fonte de verdade** para chamadas LLM nas edge functions (menos drift entre cópias de `ai.ts`).
2. **Consistência** entre o que a UI mostra, o que `validate-api-key` testa e o que o runtime usa (especialmente Gemini).
3. **Erros úteis e seguros** no frontend (sem vazar detalhes internos de provedor).
4. **Segredos** fora de texto puro no banco, com migração controlada (não big-bang só no write).

Relação com “performance”: o ganho principal aqui é **confiabilidade, manutenção e segurança**. Ganho mensurável de latência costuma ser marginal; o que evita é regressão e retrabalho.

---

## Workstreams (paralelizáveis por agente)

Cada linha pode ser uma tarefa isolada; ao terminar, commit na `main` (ou um commit agrupado por workstream, conforme preferência do time).

### WS-A — Alias Gemini na validação (baixo risco, alto impacto de honestidade)

- **Arquivo**: `supabase/functions/validate-api-key/index.ts` (`normalizeRequestedModel`).
- **Problema**: renomear silenciosamente `gemini-3.1-flash-preview` → `gemini-3.1-flash-lite-preview` faz o teste não bater com o modelo salvo na UI.
- **Direção**:
  - Ou alinhar o catálogo em `src/types/settings.types.ts` (único nome oficial) e remover o alias.
  - Ou manter alias só se a UI também normalizar e persistir o mesmo `model_name` após validação (documentar no retorno da função: `tested_model` / `requested_model`).
- **Verificação**: uma chamada real `validate-api-key` com o modelo escolhido na UI; `responded_model` e linha no `ai_provider_configs` coerentes.

### WS-B — Contrato de erro no frontend (médio risco se vazar segredo)

- **Arquivos típicos**: `src/hooks/useAnaDashboardInsights.ts`, `src/hooks/useAnaInsights.ts`, widgets que mostram erro genérico.
- **Problema**: `supabase.functions.invoke` expõe pouco em `fnError.message`; o corpo JSON rico da edge pode não chegar ao hook.
- **Direção**:
  - Padronizar resposta da edge: `{ error: { code, userMessage, requestId? } }` onde `userMessage` é texto seguro em PT-BR.
  - No hook: se `data` vier com erro estruturado mesmo com `fnError`, preferir `data.error.userMessage`.
  - Nunca exibir raw de provedor na UI; log completo só em `console` em dev ou campo técnico atrás de flag.
- **Verificação**: forçar erro controlado (ex.: modelo inválido) e confirmar mensagem útil sem stack trace nem chave.

### WS-C — Consolidação incremental de `ai.ts` (risco médio se feito em big-bang)

**Fonte canônica alvo**: `supabase/functions/_shared/ai.ts` + `supabase/functions/_shared/ai-openai-compatible.ts`.

Ordem sugerida (cada passo com deploy + smoke):

1. **Fase C1**: `ana-dashboard-insights` e `ana-investment-insights` — trocar imports locais para `../_shared/ai.ts` *após* garantir paridade de exports (`callChat`, `callVision`, `getDefaultAIConfig`).
2. **Fase C2**: `supabase/functions/_shared/report-ana.ts` — hoje importa `../ana-dashboard-insights/_shared/ai.ts`; realinhar para `../_shared/ai.ts` quando C1 estiver idêntico.
3. **Fase C3**: `process-whatsapp-message` — consolidar `./_shared/ai.ts` para global ou manter um thin wrapper que só reexporta do global (zero duplicação de lógica).
4. **Fase C4**: `extract-receipt-data` / `transcribe-audio` — já podem apontar para global; remover cópias mortas se não houver diff.

**Verificação por fase**: `deno test` nos testes de `ai-openai-compatible`; smoke das edges tocadas; opcionalmente matriz curta (dashboard + investment) com um provider cada.

### WS-D — Segredos (Vault / criptografia) — projeto dedicado, não misturar com C

- **Problema**: `api_key_encrypted` recebe plaintext em `update-ai-config` e `validate-api-key`.
- **Direção segura**:
  - Introduzir uma função única `resolveProviderApiKey(supabase, userId, provider)` que hoje lê coluna como hoje e, num segundo passo, lê do Vault quando migrado.
  - Migração de dados: script ou job único que regrava segredos e marca linha como migrada.
  - Nunca quebrar runtime no meio: feature flag ou coluna `key_storage = 'inline' | 'vault'`.
- **Verificação**: staging com chave de teste; rollback documentado.

---

## Fase de consolidação (após workstreams)

1. **Rebase mental na `main`**: garantir que não ficaram imports quebrados (`rg "_shared/ai.ts"` em `supabase/functions`).
2. **Testes automáticos**:
   - `deno test supabase/functions/_shared/ai-openai-compatible.test.ts`
   - testes de frontend/unit existentes no projeto (`pnpm test` / script do `package.json`).
3. **Smoke manual mínimo**:
   - Configurações → IA: testar cada provider uma vez.
   - Dashboard Ana + investimentos com provider padrão atual.
4. **Deploy** das edge functions alteradas (`supabase functions deploy ...`), lista no commit ou checklist abaixo.

---

## Checklist de deploy (preencher na execução)

- [ ] `validate-api-key` (se WS-A ou D tocar persistência)
- [ ] `update-ai-config` (se WS-D)
- [ ] `ana-dashboard-insights` / `ana-investment-insights` (se WS-C)
- [ ] `process-whatsapp-message` / `extract-receipt-data` / `transcribe-audio` (conforme C3/C4)

---

## Notas para uso de múltiplos agentes

- **Dividir por WS** (A, B, C1…, D), não por arquivo solto sem dono.
- **Conflitos**: WS-C e WS-D podem tocar os mesmos arquivos; rodar WS-A e WS-B primeiro ou em paralelo; WS-C em sequência por fase; WS-D por último ou em branch lógica separada no mesmo repo (commits ordenados).
- **Definição de pronto**: critérios de verificação da seção anterior cumpridos, sem erros de lint nos arquivos alterados.

---

## Referência rápida dos arquivos já conhecidos

- Catálogo de modelos: `src/types/settings.types.ts` (`AI_MODELS`).
- Validação: `supabase/functions/validate-api-key/index.ts`.
- Persistência: `supabase/functions/update-ai-config/index.ts`.
- Helpers compartilhados: `supabase/functions/_shared/ai-openai-compatible.ts`, `supabase/functions/_shared/ai.ts`.
- Report narrative: `supabase/functions/_shared/report-ana.ts` (import do dashboard local hoje).
