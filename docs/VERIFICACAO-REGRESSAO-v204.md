# 🧪 VERIFICAÇÃO DE REGRESSÃO - v204

**Data:** 08/12/2025  
**Versão:** v204  
**Status:** ✅ DEPLOY REALIZADO  
**Build:** ✅ PASSOU (deno check)

---

## 📋 CHECKLIST DE REGRESSÃO

### Bugs Corrigidos em v188-v203 (DEVEM CONTINUAR FUNCIONANDO)

#### v188: Regex "roxinho?" com pontuação
- **Descrição:** Regex capturava pontuação junto com apelido do banco
- **Solução:** Removido `detectarIntencaoConsulta` (regex fallback)
- **Teste:**
  ```
  Mensagem: "Qual o saldo no roxinho?"
  Esperado: Retorna saldo do Nubank (sem pontuação)
  Status: [ ] Testado
  ```

#### v189: isAnalyticsQuery() interceptava saldo
- **Descrição:** Função regex interceptava consultas de saldo antes do NLP
- **Solução:** Removido `isAnalyticsQuery()` completamente
- **Teste:**
  ```
  Mensagem: "Qual meu saldo?"
  Esperado: Retorna saldo total (não interceptado)
  Status: [ ] Testado
  ```

#### v190: Handler CONSULTAR_SALDO ignorava filtro de conta
- **Descrição:** Handler chamava `consultarSaldo(userId)` sem filtro
- **Solução:** Usar `consultarSaldoEspecifico(userId, nomeConta)` quando há filtro
- **Teste:**
  ```
  Mensagem: "Qual meu saldo no Itaú?"
  Esperado: Retorna só saldo do Itaú
  Status: [ ] Testado
  ```

#### v191: NLP não extraía "Itaú" como entidade
- **Descrição:** NLP retornava `conta: undefined` para "Itaú"
- **Solução:** Fallback detecta banco no texto original
- **Teste:**
  ```
  Mensagem: "Qual meu saldo no Itaú?"
  Esperado: Detecta Itaú via fallback
  Status: [ ] Testado
  ```

#### v196: TTL de contexto curto (15min → 60min)
- **Descrição:** Contexto expirava rápido, perdendo informações
- **Solução:** `CONTEXT_EXPIRATION_MINUTES = 60`
- **Teste:**
  ```
  Mensagem 1: "Vou pagar 100 de luz"
  Aguardar 30 minutos
  Mensagem 2: "Confirma?"
  Esperado: Contexto mantido (não expirado)
  Status: [ ] Testado
  ```

#### v197: Entidades perdidas na conversão
- **Descrição:** Conversão `intencaoNLP` → `intencao` perdia `forma_pagamento`, `conta`, `status_pagamento`
- **Solução:** Incluir TODAS as entidades na conversão
- **Teste:**
  ```
  Mensagem: "Paguei 100 de luz no pix do nubank"
  Esperado: Todas as entidades presentes (valor, categoria, conta, forma_pagamento)
  Status: [ ] Testado
  ```

#### v202: Categoria NLP contaminava detecção por palavra-chave
- **Descrição:** Array `textosParaAnalisar` incluía categoria do NLP, que podia estar errada
- **Solução:** Remover `entidades.categoria` do array
- **Teste:**
  ```
  Mensagem: "Paguei 100 de luz"
  Esperado: Categoria Moradia (não Saúde ou outra errada)
  Status: [ ] Testado
  ```

#### v203: Detecção de banco por alias
- **Descrição:** Sistema detecta bancos por apelidos (roxinho, laranjinha, etc)
- **Solução:** Usar `detectarBancoPorAlias()` centralizado
- **Teste:**
  ```
  Mensagem: "Qual meu saldo no roxinho?"
  Esperado: Detecta Nubank
  Status: [ ] Testado
  ```

---

## 🎯 TESTES OBRIGATÓRIOS (v204)

### Teste 1: Luz → Moradia
```
Mensagem: "Paguei 100 de luz no pix do nubank"
Esperado: 
  - Categoria: Moradia ✅
  - Conta: Nubank ✅
  - Forma pagamento: Pix ✅
  - Valor: 100 ✅
Status: [ ] Testado
```

### Teste 2: Abastecimento → Transporte
```
Mensagem: "Abasteci o carro e paguei 200 no débito do itaú"
Esperado:
  - Categoria: Transporte ✅
  - Conta: Itaú ✅
  - Forma pagamento: Débito ✅
  - Valor: 200 ✅
Status: [ ] Testado
```

### Teste 3: Saldo com banco
```
Mensagem: "Qual meu saldo no roxinho?"
Esperado:
  - Retorna só Nubank ✅
  - Sem outras contas ✅
Status: [ ] Testado
```

### Teste 4: Mercado → Alimentação
```
Mensagem: "Gastei 50 no mercado"
Esperado:
  - Categoria: Alimentação ✅
  - Valor: 50 ✅
Status: [ ] Testado
```

---

## 📊 VERIFICAÇÃO TÉCNICA

### Build
- [x] `deno check` passou sem erros
- [x] Sem erros de TypeScript
- [x] Imports corretos

### Deploy
- [x] `npx supabase functions deploy` sucesso
- [x] Function ID: process-whatsapp-message
- [x] Script size: 241.5kB
- [x] Project: sbnpmhmvcspwcyjhftlw

### Mapeamentos
- [x] Sem duplicações (grep verificado)
- [x] Todos os imports adicionados
- [x] Funções centralizadas em shared/mappings.ts

### Logs
- [x] Logs de detecção de categoria presentes
- [x] Logs de detecção de banco presentes
- [x] Logs de detecção de forma pagamento presentes

---

## 🔍 VERIFICAÇÃO GREP (Após Deploy)

```bash
# Verificar se não há duplicações
grep -r "MAPEAMENTO_BANCOS" supabase/functions/
# Esperado: 0 matches

grep -r "MAPEAMENTO_CATEGORIAS" supabase/functions/
# Esperado: 0 matches

grep -r "PALAVRAS_CATEGORIAS" supabase/functions/
# Esperado: 0 matches

grep -r "NLP_PARA_CATEGORIA" supabase/functions/
# Esperado: 1 match (apenas comentário DEPRECATED)

# Verificar se estão em shared/mappings.ts
grep -r "CATEGORIA_KEYWORDS" supabase/functions/
# Esperado: múltiplos matches (imports)

grep -r "detectarCategoriaPorPalavraChave" supabase/functions/
# Esperado: múltiplos matches (uso)

grep -r "detectarBancoPorAlias" supabase/functions/
# Esperado: múltiplos matches (uso)
```

---

## 📝 NOTAS IMPORTANTES

### O que foi alterado em v204
- ✅ Centralização completa de mapeamentos
- ✅ Remoção de duplicações
- ✅ Correção do erro `texto_original` → `comando_original`
- ✅ Build passou (deno check)
- ✅ Deploy realizado com sucesso

### O que NÃO foi alterado
- ❌ Lógica de handlers (REGISTRAR_DESPESA, CONSULTAR_SALDO, etc)
- ❌ Lógica de NLP (nlp-processor.ts)
- ❌ Lógica de contexto (context-manager.ts - apenas imports)
- ❌ Banco de dados (nenhuma alteração)

### Risco de Regressão
- **Baixo:** Apenas refatoração de mapeamentos
- **Mitigação:** Todos os 9 bugs v188-v203 devem continuar funcionando

---

## ✅ PRÓXIMOS PASSOS

1. **Testes Manuais no WhatsApp** (Alf)
   - Executar os 4 testes obrigatórios
   - Verificar os 9 bugs v188-v203
   - Marcar status no checklist

2. **Verificação de Logs** (Alf + Claude)
   - Verificar se logs mostram uso de funções centralizadas
   - Confirmar que detecção de categoria/banco está funcionando
   - Procurar por erros ou warnings

3. **Verificação de Regressão** (Alf + Claude)
   - Confirmar que todos os 9 bugs continuam corrigidos
   - Testar edge cases
   - Documentar resultados

4. **Documentação Final** (Claude)
   - Atualizar CENTRALIZACAO-STATUS.md com resultados
   - Criar documento de lições aprendidas
   - Arquivar para referência futura

---

**Status:** 🟢 PRONTO PARA TESTES MANUAIS  
**Versão:** v204  
**Data:** 08/12/2025  
**Autor:** Claude + Alf
