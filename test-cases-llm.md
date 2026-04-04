# 🧪 CASOS DE TESTE - LLM INTENT PARSER

## ✅ SPRINT 1.1 COMPLETO - Edge Function Deployada!

**Status:** ✅ Funcionando  
**URL:** `https://sbnpmhmvcspwcyjhftlw.supabase.co/functions/v1/llm-intent-parser`  
**Tamanho:** 85.27kB

---

## 📋 CASOS DE TESTE

### 1. Valor Simples
**Input:** `"150"`  
**Esperado:**
```json
{
  "intents": [
    {
      "action": "edit_value",
      "value": "150",
      "confidence": 0.95
    }
  ]
}
```

### 2. Múltiplas Intenções
**Input:** `"muda pra 150 e categoria alimentação"`  
**Esperado:**
```json
{
  "intents": [
    {
      "action": "edit_value",
      "value": "150",
      "confidence": 0.9
    },
    {
      "action": "edit_category",
      "value": "alimentação",
      "confidence": 0.9
    }
  ]
}
```
**Status:** ✅ TESTADO E FUNCIONANDO!

### 3. Descrição + Data
**Input:** `"Uber Black ontem"`  
**Esperado:**
```json
{
  "intents": [
    {
      "action": "edit_description",
      "value": "Uber Black",
      "confidence": 0.85
    },
    {
      "action": "edit_date",
      "value": "ontem",
      "confidence": 0.8
    }
  ]
}
```

### 4. Categoria Sozinha
**Input:** `"transporte"`  
**Esperado:**
```json
{
  "intents": [
    {
      "action": "edit_category",
      "value": "transporte",
      "confidence": 0.85
    }
  ]
}
```

### 5. Data Formatada
**Input:** `"15/11"`  
**Esperado:**
```json
{
  "intents": [
    {
      "action": "edit_date",
      "value": "15/11",
      "confidence": 0.9
    }
  ]
}
```

### 6. Confirmação
**Input:** `"pronto"`  
**Esperado:**
```json
{
  "intents": [
    {
      "action": "confirm",
      "value": "true",
      "confidence": 0.95
    }
  ]
}
```

### 7. Cancelamento
**Input:** `"cancelar"`  
**Esperado:**
```json
{
  "intents": [
    {
      "action": "cancel",
      "value": "true",
      "confidence": 0.95
    }
  ]
}
```

### 8. Complexo (3 intenções)
**Input:** `"muda pra 250, categoria transporte e data 16/11"`  
**Esperado:**
```json
{
  "intents": [
    {
      "action": "edit_value",
      "value": "250",
      "confidence": 0.9
    },
    {
      "action": "edit_category",
      "value": "transporte",
      "confidence": 0.85
    },
    {
      "action": "edit_date",
      "value": "16/11",
      "confidence": 0.85
    }
  ]
}
```

---

## 🎯 PRÓXIMOS PASSOS

- [x] SPRINT 1.1: Setup LLM ✅ COMPLETO
- [ ] SPRINT 1.2: Prompt Engineering (testar todos os casos)
- [ ] SPRINT 1.3: Integração com handleMessageWithContext
- [ ] SPRINT 1.4: Testes & Ajustes

---

## 📊 MÉTRICAS

- **Latência:** ~500-800ms (OpenAI API)
- **Custo:** ~$0.15/1000 requests (gpt-4o-mini)
- **Fallback:** Regex simples (se LLM falhar)
- **Confiança mínima:** 0.7 (70%)
