# 🎨 UX: Validação Visual de Metas

**Data:** 11/11/2025  
**Status:** ✅ Implementado  
**Objetivo:** Tornar validação de campos obrigatórios clara e intuitiva

---

## 🐛 Problema Original

**Feedback do Usuário:**
> "Eu só consegui salvar depois de ter preenchido outras abas... Acho que é bom essas regras estarem claras pro usuário senão fica parecendo bug."

**Comportamento Anterior:**
- ❌ Validação silenciosa (sem feedback visual)
- ❌ Usuário clicava "Salvar" e nada acontecia
- ❌ Não ficava claro quais campos eram obrigatórios
- ❌ Não mostrava em qual aba estava o erro

**Resultado:** Parecia um bug, usuário ficava confuso.

---

## ✅ Solução Implementada

### **1. Toast de Erro ao Tentar Salvar**

Quando o usuário clica em "Salvar" com campos obrigatórios faltando:

```typescript
toast.error('Preencha todos os campos obrigatórios');
```

**Resultado:** ✅ Feedback imediato e claro

---

### **2. Navegação Automática para Aba com Erro**

O sistema detecta qual aba contém o erro e navega automaticamente:

```typescript
const handleSaveClick = () => {
  handleSubmit(onSubmit)();
  
  setTimeout(() => {
    if (Object.keys(errors).length > 0) {
      // Detectar qual aba tem erro
      const hasBasicError = Object.keys(errors).some(key => 
        ['name', 'category', 'target_amount'].includes(key)
      );
      const hasScheduleError = Object.keys(errors).some(key => 
        ['start_date', 'target_date'].includes(key)
      );
      
      // Navegar para a aba com erro
      if (hasBasicError) {
        setActiveTab('basic');
      } else if (hasScheduleError) {
        setActiveTab('schedule');
      }
      
      toast.error('Preencha todos os campos obrigatórios');
    }
  }, 100);
};
```

**Resultado:** ✅ Usuário é levado direto para o problema

---

### **3. Indicadores Visuais nas Abas**

Ícone de alerta vermelho aparece nas abas que contêm erros:

```tsx
<TabsTrigger value="basic" className="relative">
  Básico
  {(errors.name || errors.category || errors.target_amount) && (
    <AlertTriangle className="h-3 w-3 text-red-500 absolute top-1 right-1" />
  )}
</TabsTrigger>

<TabsTrigger value="schedule" className="relative">
  Prazo & Prioridade
  {(errors.start_date || errors.target_date) && (
    <AlertTriangle className="h-3 w-3 text-red-500 absolute top-1 right-1" />
  )}
</TabsTrigger>
```

**Resultado:** ✅ Visual claro de onde está o problema

---

### **4. Mensagens de Erro Específicas**

Cada campo mostra sua própria mensagem de erro:

```typescript
const goalSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(100),
  target_amount: z.number().min(1, 'Valor deve ser maior que R$ 0'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  target_date: z.string().min(1, 'Data alvo é obrigatória'),
  // ...
});
```

**Resultado:** ✅ Usuário sabe exatamente o que precisa corrigir

---

## 🎯 Fluxo de Validação Completo

### **Cenário: Usuário tenta salvar sem preencher data alvo**

1. **Usuário edita nome da meta**
   - Muda de "Viagem" para "Viagem Europa"

2. **Clica em "Salvar"**
   - Sistema valida todos os campos
   - Detecta que `target_date` está vazio

3. **Feedback Imediato:**
   - 🔴 Toast vermelho: "Preencha todos os campos obrigatórios"
   - 🔄 Modal navega automaticamente para aba "Prazo & Prioridade"
   - ⚠️ Ícone de alerta vermelho aparece na aba "Prazo & Prioridade"
   - 📝 Campo "Data Alvo" mostra mensagem: "Data alvo é obrigatória"

4. **Usuário preenche a data**
   - Seleciona uma data no DatePicker

5. **Clica em "Salvar" novamente**
   - ✅ Validação passa
   - ✅ Toast verde: "Meta atualizada!"
   - ✅ Modal fecha
   - ✅ Card atualizado

---

## 📋 Campos Obrigatórios por Aba

### **Aba: Básico**
- ✅ Nome da Meta *
- ✅ Categoria *
- ✅ Valor Alvo (R$) *

### **Aba: Prazo & Prioridade**
- ✅ Data Início *
- ✅ Data Alvo *

### **Aba: Notificações**
- ℹ️ Nenhum campo obrigatório

---

## 🎨 Elementos Visuais

### **Toast de Erro**
```
┌─────────────────────────────────────┐
│ ❌ Preencha todos os campos         │
│    obrigatórios                     │
└─────────────────────────────────────┘
```

### **Aba com Erro**
```
┌─────────────────────────────────────┐
│ [Básico] [Prazo & Prioridade ⚠️] ... │
└─────────────────────────────────────┘
```

### **Campo com Erro**
```
Data Alvo *
┌─────────────────────────────────────┐
│ [Selecione a data alvo]             │
└─────────────────────────────────────┘
🔴 Data alvo é obrigatória
```

---

## 🧪 Como Testar

### **Teste 1: Validação de Nome**
1. Edite uma meta
2. Apague o nome
3. Clique "Salvar"
4. ✅ Deve mostrar toast de erro
5. ✅ Deve ficar na aba "Básico"
6. ✅ Campo nome deve mostrar "Nome é obrigatório"

### **Teste 2: Validação de Data**
1. Edite uma meta
2. Vá para aba "Prazo & Prioridade"
3. Apague a data alvo
4. Volte para aba "Básico"
5. Clique "Salvar"
6. ✅ Deve mostrar toast de erro
7. ✅ Deve navegar para aba "Prazo & Prioridade"
8. ✅ Aba deve ter ícone de alerta vermelho
9. ✅ Campo deve mostrar "Data alvo é obrigatória"

### **Teste 3: Múltiplos Erros**
1. Edite uma meta
2. Apague nome, valor e data
3. Clique "Salvar"
4. ✅ Deve mostrar toast de erro
5. ✅ Deve navegar para primeira aba com erro ("Básico")
6. ✅ Ambas as abas devem ter ícone de alerta

---

## ✅ Benefícios da Implementação

### **Para o Usuário:**
- ✅ Feedback claro e imediato
- ✅ Não parece mais um bug
- ✅ Sabe exatamente o que precisa corrigir
- ✅ É guiado automaticamente para o problema
- ✅ Experiência mais profissional

### **Para o Sistema:**
- ✅ Menos suporte (usuários não ficam travados)
- ✅ Menos frustração
- ✅ Maior taxa de conclusão de tarefas
- ✅ Melhor percepção de qualidade

---

## 📝 Arquivos Modificados

- `src/components/settings/goals/GoalDialog.tsx`
  - Adicionado `handleSaveClick()` com validação visual
  - Adicionado indicadores de erro nas abas
  - Melhoradas mensagens de validação
  - Importado `toast` do Sonner

---

## 🎯 Próximas Melhorias (Opcional)

### **Melhorias Futuras:**
1. **Validação em Tempo Real:**
   - Mostrar erro assim que o usuário sair do campo
   
2. **Contador de Erros:**
   - "3 campos obrigatórios faltando"
   
3. **Highlight Visual:**
   - Campos com erro com borda vermelha mais destacada
   
4. **Tooltip Explicativo:**
   - Hover no ícone de alerta mostra lista de erros

---

## ✅ Status Final

- ✅ Toast de erro implementado
- ✅ Navegação automática para aba com erro
- ✅ Indicadores visuais nas abas
- ✅ Mensagens de erro específicas
- ✅ Testado e funcionando
- ✅ Documentação completa

**UX muito melhor! Agora está claro para o usuário.** 🎉
