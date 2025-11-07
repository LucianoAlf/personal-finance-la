# 🧪 Teste de Gamificação - Checklist

## ✅ Verificações Necessárias:

### 1. **Banco de Dados**
- [ ] Abra o Supabase → Table Editor
- [ ] Verifique se existem as tabelas:
  - `user_gamification`
  - `badge_progress`
  - `challenges`

### 2. **Frontend - Página Goals**
- [ ] Acesse: http://localhost:5173/metas (ou sua porta)
- [ ] Você deve ver **3 abas**:
  - 💰 Economia
  - 🛡️ Gastos  
  - ⚡ **Progresso** ← NOVA ABA

### 3. **Aba Progresso - O que deve aparecer:**
- [ ] **Barra de XP** no topo (azul/roxo com seu nível)
- [ ] **Card "Próximas Conquistas"** (3 badges mais próximos)
- [ ] **Card "Streak Atual"** (meses consecutivos)
- [ ] **Grid de Conquistas** (15 badges em 3 tiers)

---

## 🐛 Se NÃO aparecer:

### Opção 1: Verificar Console do Navegador
1. Abra DevTools (F12)
2. Vá em "Console"
3. Procure por erros em vermelho
4. Me envie os erros

### Opção 2: Verificar se o servidor está rodando
```bash
npm run dev
```

### Opção 3: Limpar cache e recarregar
- Ctrl + Shift + R (Windows/Linux)
- Cmd + Shift + R (Mac)

---

## 📸 O que você DEVE ver na aba Progresso:

```
┌─────────────────────────────────────────┐
│ 🎯 Nível 1 - Iniciante                 │
│ ━━━━░░░░░░░░░░░░░░░░ 0 / 100 XP       │
│ Faltam 100 XP para o próximo nível!    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📈 Próximas Conquistas                  │
│ (3 badges mais próximos de desbloquear)│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 🏆 Todas as Conquistas                  │
│ 0/15 desbloqueadas                      │
│ (Grid com 15 badges)                    │
└─────────────────────────────────────────┘
```

---

## ❓ Ainda não funciona?

**Me envie:**
1. Print da tela da página Metas
2. Erros do console (F12)
3. Confirme que executou: `npm install canvas-confetti react-hot-toast`
