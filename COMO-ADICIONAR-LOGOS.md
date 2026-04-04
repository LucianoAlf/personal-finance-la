# 🏦 Como Adicionar Logos dos Bancos

## ✅ **ESTRUTURA CRIADA COM SUCESSO!**

O sistema está pronto para receber os logos dos bancos em formato SVG.

---

## 📁 **Onde Adicionar os SVGs:**

```
src/assets/bank-logos/
├── itau.svg          ← Adicione aqui
├── bradesco.svg      ← Adicione aqui
├── santander.svg     ← Adicione aqui
├── bb.svg            ← Adicione aqui
├── caixa.svg         ← Adicione aqui
├── inter.svg         ← Adicione aqui
├── c6.svg            ← Adicione aqui
└── README.md         ← Instruções detalhadas
```

---

## 🎯 **PRIORIDADE ALTA (7 bancos):**

1. ✅ **itau.svg** - Banco Itaú
2. ✅ **bradesco.svg** - Banco Bradesco
3. ✅ **santander.svg** - Banco Santander
4. ✅ **bb.svg** - Banco do Brasil
5. ✅ **caixa.svg** - Caixa Econômica
6. ✅ **inter.svg** - Banco Inter
7. ✅ **c6.svg** - C6 Bank

---

## 📐 **ESPECIFICAÇÕES:**

### **Formato:**
- Tipo: `.svg`
- ViewBox: `0 0 24 24` (ou `0 0 32 32`)
- Cores: Originais do banco

### **Exemplo de SVG válido:**
```svg
<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2L2 7v10c0 5.55..." fill="#EC7000"/>
</svg>
```

### **Otimização:**
- ❌ Remover `id`, `class`, `style` inline
- ❌ Remover comentários
- ✅ Manter apenas elementos gráficos

---

## 🌐 **Onde Encontrar:**

1. **Sites oficiais** (seção Imprensa/Mídia)
2. **Simple Icons:** https://simpleicons.org/
3. **SVG Repo:** https://www.svgrepo.com/
4. **Vectorizer.ai:** https://vectorizer.ai/ (converter PNG)

---

## ✨ **COMO FUNCIONA:**

### **Logos Oficiais (react-icons):**
- ✅ **Nubank** → Logo oficial roxo (perfeito!)
- ✅ **Mercado Pago** → Logo oficial
- ✅ **PicPay** → Logo oficial

### **SVGs Customizados (você adiciona):**
- 🟠 **Itaú** → `itau.svg`
- 🔴 **Bradesco** → `bradesco.svg`
- 🔴 **Santander** → `santander.svg`
- 🟡 **Banco do Brasil** → `bb.svg`
- 🔵 **Caixa** → `caixa.svg`
- 🟠 **Inter** → `inter.svg`
- ⚫ **C6** → `c6.svg`

### **Fallback (ícones genéricos):**
- 🏦 Outros bancos → Ícone de banco

---

## 🚀 **APÓS ADICIONAR:**

1. Coloque os SVGs na pasta `src/assets/bank-logos/`
2. Reinicie o servidor: `pnpm dev`
3. Os logos aparecerão automaticamente! ✨

---

## 📝 **STATUS ATUAL:**

- ✅ Pasta criada: `src/assets/bank-logos/`
- ✅ Sistema configurado
- ✅ Nubank funcionando (logo oficial)
- ⏳ Aguardando 7 SVGs dos bancos

---

**Última atualização:** 05/11/2025
