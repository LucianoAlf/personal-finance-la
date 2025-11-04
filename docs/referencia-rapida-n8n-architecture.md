# 📊 REFERÊNCIA RÁPIDA - Workflows N8N

**Tabela de consulta rápida para todos os workflows**

---

## 📋 TABELA GERAL

| # | Workflow | Trigger | Frequência | Nodes | APIs Usadas | Prioridade |
|---|----------|---------|------------|-------|-------------|------------|
| 1 | Processar Texto | Webhook | Real-time | 15 | UAZAPI, OpenAI, Supabase | 🔴 Alta |
| 2 | Processar Áudio | Webhook | Real-time | 16 | UAZAPI, OpenAI, Google Speech, Supabase | 🟡 Média |
| 3 | Processar Imagem | Webhook | Real-time | 18 | UAZAPI, OpenAI, Google Vision, Supabase | 🟡 Média |
| 4 | Comandos Rápidos | Webhook | Real-time | 11 | UAZAPI, Supabase | 🔴 Alta |
| 5 | Lembretes | Cron | Diário 09:00 | 10 | UAZAPI, Supabase | 🟢 Baixa |
| 6 | Resumo Diário | Cron | Diário 20:00 | 10 | UAZAPI, OpenAI, Supabase | 🟢 Baixa |
| 7 | Resumo Semanal | Cron | Seg 09:00 | 11 | UAZAPI, OpenAI, Supabase | 🟢 Baixa |
| 8 | Resumo Mensal | Cron | Dia 1 10:00 | 14 | UAZAPI, OpenAI, Supabase, PDFShift | 🟢 Baixa |
| 9 | Alertas Orçamento | Cron | A cada 6h | 10 | UAZAPI, Supabase | 🟢 Baixa |
| 10 | Progresso Metas | Cron | Dia 15 10:00 | 12 | UAZAPI, Supabase | 🟢 Baixa |

**Legenda Prioridade:**
- 🔴 Alta - Implementar primeiro (core features)
- 🟡 Média - Implementar depois dos core
- 🟢 Baixa - Implementar por último (nice to have)

---

## 🔵 WORKFLOW 1: Processar Texto
**O mais importante do sistema!**

### Resumo Visual
```
WhatsApp → Parse → Get User → OpenAI Extract → 
Map Data → Insert Transaction → Update Balance → 
Send Confirmation → Log
```

### Inputs
- Mensagem de texto do WhatsApp
- Phone number do usuário

### Outputs
- Transação inserida no banco
- Saldo da conta atualizado
- Mensagem de confirmação enviada

### Tempo Médio
~2-3 segundos

### Exemplo
```
Input:  "Gastei 50 no mercado"
Output: ✅ Registrado! 
        🍔 Alimentação - Compras no mercado
        💰 R$ 50,00
```

---

## 🔵 WORKFLOW 2: Processar Áudio

### Resumo Visual
```
WhatsApp Áudio → Download → Speech-to-Text → 
[MESMO FLUXO DO WORKFLOW 1]
```

### Diferencial
+ Google Speech-to-Text
+ Validação de duração (1-60s)
+ Validação de confiança (>0.7)

### Tempo Médio
~4-5 segundos

---

## 🔵 WORKFLOW 3: Processar Imagem

### Resumo Visual
```
WhatsApp Imagem → Download → Google Vision OCR → 
OpenAI Parse → Upload to Storage → 
[FLUXO NORMAL COM receipt_url]
```

### Diferencial
+ Google Cloud Vision (OCR)
+ Supabase Storage (salvar imagem)
+ Campo receipt_url na transação

### Tempo Médio
~5-7 segundos

---

## 🔵 WORKFLOW 4: Comandos Rápidos

### Resumo Visual
```
WhatsApp Comando → Parse → Switch (6 rotas):
  /saldo      → Get Accounts → Format
  /resumo     → Get Summary → Format
  /contas     → Get Bills → Format
  /ajuda      → Static Help Message
  /categorias → Get Categories → Format
  /metas      → Get Goals → Format
→ Send WhatsApp → Log
```

### Comandos Suportados
- `/saldo` - Todos os saldos
- `/resumo` - Resumo do mês
- `/contas` - Contas a vencer
- `/ajuda` - Menu de ajuda
- `/categorias` - Lista de categorias
- `/metas` - Progresso das metas

### Tempo Médio
~1-2 segundos

---

## 🔵 WORKFLOW 5: Lembretes de Contas

### Resumo Visual
```
Cron 09:00 → Get Users with Bills (próximos 3 dias) → 
Loop: Get Bills → Group by Days → Format → 
Send WhatsApp → Log → Wait
```

### Níveis de Urgência
- **Hoje:** ⚠️ Urgente
- **Amanhã:** 📅 Normal
- **2-3 dias:** 📅 Normal

### Regras Anti-spam
- Máximo 1 notificação por categoria/dia
- Respeitar horário de preferência do usuário

---

## 🔵 WORKFLOW 6: Resumo Diário

### Resumo Visual
```
Cron 20:00 → Get Active Users (com transações hoje) → 
Loop: Get Daily Data → OpenAI Insight → Format → 
Send → Log
```

### Dados Incluídos
- Total receitas/despesas do dia
- Top 3 categorias
- Saldo atual
- Insight personalizado da Ana Clara

### Exemplo
```
📊 Resumo do Seu Dia

💸 Despesas: R$ 420,50 (5 lançamentos)
💰 Receitas: R$ 0,00

📈 Maiores gastos:
1. 🍔 Alimentação: R$ 200 (47%)

💡 Insight: Você fez 5 lançamentos hoje! 👏
```

---

## 🔵 WORKFLOW 7: Resumo Semanal

### Resumo Visual
```
Cron Segunda 09:00 → Get Users → 
Loop: Calculate Week Range → Get Week Data → 
Compare vs Last Week → OpenAI Analysis → 
Format → Send
```

### Dados Incluídos
- Total da semana (segunda a domingo)
- Top 5 categorias
- Variação vs semana anterior
- Média diária
- Análise da Ana Clara

---

## 🔵 WORKFLOW 8: Resumo Mensal

### Resumo Visual
```
Cron Dia 1 10:00 → Calculate Previous Month → Get Users → 
Loop: Call get_monthly_summary() → OpenAI Full Analysis → 
Format Long Message → Send → Generate PDF (opt) → 
Send PDF (opt) → Log → Create Report Entry
```

### Dados Incluídos
- Total receitas/despesas do mês
- Top categorias
- Status do orçamento
- Progresso de metas
- Comparação vs mês anterior
- Análise completa da Ana Clara
- PDF do relatório (opcional)

### Tempo de Processamento
~10-15 segundos por usuário

---

## 🔵 WORKFLOW 9: Alertas de Orçamento

### Resumo Visual
```
Cron 6 em 6h → Get Budget Status (≥80%) → 
Check Last Alert (anti-spam) → 
Loop: Calculate Days Left → Format by Level → 
Send → Log
```

### Níveis de Alerta
- **80-89%:** ⚠️ Warning (1x/dia)
- **90-99%:** 🚨 Critical (2x/dia)
- **100%+:** 🔴 Exceeded (imediato)

### Lógica Anti-spam
Não enviar se já enviou nas últimas 12h para mesma categoria

---

## 🔵 WORKFLOW 10: Progresso de Metas

### Resumo Visual
```
Cron Dia 15 10:00 → Get Goals Milestones (25/50/75/100%) → 
Loop: Calculate Details → Format by Milestone → 
IF 100%: Update Status + Create Achievement → 
Send → Log
```

### Marcos Monitorados
- **25%:** 🎯 Primeiro Marco
- **50%:** 🎉 Metade do Caminho
- **75%:** 🌟 Quase Lá
- **100%:** 🏆 META ALCANÇADA!

### Ações Especiais no 100%
1. Atualizar status da meta → `completed`
2. Criar achievement
3. Enviar GIF de comemoração
4. Sugerir criar nova meta

---

## 📊 MÉTRICAS DE PERFORMANCE

### Por Workflow

| Workflow | Tempo Médio | Tempo Max Aceitável | Taxa de Sucesso Alvo |
|----------|-------------|---------------------|----------------------|
| 1 - Texto | 2-3s | 5s | >98% |
| 2 - Áudio | 4-5s | 10s | >95% |
| 3 - Imagem | 5-7s | 15s | >90% |
| 4 - Comandos | 1-2s | 3s | >99% |
| 5 - Lembretes | 1s/user | 2s/user | >99% |
| 6 - Resumo Diário | 2s/user | 5s/user | >98% |
| 7 - Resumo Semanal | 3s/user | 7s/user | >98% |
| 8 - Resumo Mensal | 10-15s/user | 30s/user | >95% |
| 9 - Alertas | 1s/user | 3s/user | >99% |
| 10 - Metas | 2s/user | 5s/user | >98% |

### Limites de API

| API | Limite | Custo Médio | Workflow |
|-----|--------|-------------|----------|
| OpenAI GPT-4 | 60 RPM | $0.03/1K tokens | 1,2,3,6,7,8 |
| Google Speech | 60 RPM | $0.006/15s | 2 |
| Google Vision | 1800/min | $1.50/1K imgs | 3 |
| UAZAPI | Conforme plano | ~R$50/mês | Todos |
| Supabase | 500 req/s | Grátis até 500MB | Todos |

---

## 🔧 CONFIGURAÇÕES CRÍTICAS

### Credenciais Obrigatórias
```
✅ UAZAPI_API_KEY
✅ OPENAI_API_KEY  
✅ SUPABASE_URL
✅ SUPABASE_SERVICE_KEY
```

### Credenciais Opcionais
```
⚪ GOOGLE_CREDENTIALS_JSON (para Workflows 2 e 3)
⚪ PDFSHIFT_API_KEY (para Workflow 8)
```

### Variáveis de Ambiente Importantes
```
ENVIRONMENT=production|development
NODE_ENV=production
TZ=America/Sao_Paulo
LOG_LEVEL=info|debug
```

---

## 🚦 ORDEM DE IMPLEMENTAÇÃO

### ✅ Fase 1 - CORE (Semanas 1-3)
```
1. Workflow 1 (Texto)        - IMPLEMENTAR PRIMEIRO
2. Workflow 4 (Comandos)      - SEGUNDO
3. Testes exaustivos
```

### ✅ Fase 2 - AVANÇADO (Semana 4)
```
1. Workflow 2 (Áudio)
2. Workflow 3 (Imagem)
3. Testes de integração
```

### ✅ Fase 3 - NOTIFICAÇÕES (Semanas 5-6)
```
1. Workflow 5 (Lembretes)
2. Workflow 6 (Resumo Diário)
3. Workflow 9 (Alertas)
```

### ✅ Fase 4 - RELATÓRIOS (Semanas 7-8)
```
1. Workflow 7 (Resumo Semanal)
2. Workflow 8 (Resumo Mensal)
3. Workflow 10 (Metas)
4. Otimização e go-live
```

---

## 🧪 TESTES OBRIGATÓRIOS

### Por Workflow

**Workflow 1:**
- [ ] Mensagem simples
- [ ] Mensagem com data
- [ ] Receita
- [ ] Transferência
- [ ] Usuário não cadastrado
- [ ] Erro OpenAI
- [ ] Categoria não encontrada

**Workflow 2:**
- [ ] Áudio claro
- [ ] Áudio com ruído
- [ ] Áudio muito curto
- [ ] Áudio muito longo
- [ ] Erro download
- [ ] Baixa confiança

**Workflow 3:**
- [ ] Nota fiscal clara
- [ ] Nota fiscal borrada
- [ ] Imagem sem texto
- [ ] Múltiplos valores
- [ ] Formato não suportado
- [ ] Erro upload

**Workflow 4:**
- [ ] /saldo
- [ ] /resumo
- [ ] /contas
- [ ] /ajuda
- [ ] /categorias
- [ ] /metas
- [ ] Comando inválido

**Workflows 5-10:**
- [ ] Execução agendada funciona
- [ ] Múltiplos usuários processados
- [ ] Mensagens formatadas corretamente
- [ ] Logs salvos
- [ ] Anti-spam funcionando

---

## 💾 BACKUP E VERSIONAMENTO

### O que fazer backup:

✅ **Workflows (JSON):**
```bash
# Exportar todos os workflows regularmente
n8n export:workflow --all --output=/backup/workflows/
```

✅ **Credenciais (excluindo secrets):**
```bash
# Documentar (sem valores sensíveis)
```

✅ **Variáveis de ambiente:**
```bash
# Backup do .env (em local seguro)
```

✅ **Database (Supabase):**
```bash
# Backup automático do Supabase
```

---

## 📞 CONTATOS ÚTEIS

### Suporte Técnico
- N8N: support@n8n.io
- UAZAPI: suporte via portal
- OpenAI: https://help.openai.com
- Supabase: support@supabase.io

### Documentação
- N8N: https://docs.n8n.io
- UAZAPI: https://docs.uazapi.com
- OpenAI: https://platform.openai.com/docs
- Supabase: https://supabase.com/docs

---

## ✅ CHECKLIST FINAL

Antes de considerar concluído:

**Infraestrutura:**
- [ ] N8N instalado e rodando
- [ ] Todas as credenciais configuradas
- [ ] Domínio e SSL configurados
- [ ] Monitoring ativado

**Workflows 1-4 (Core):**
- [ ] Importados e ativados
- [ ] Testados individualmente
- [ ] Teste end-to-end passou
- [ ] Logs funcionando

**Workflows 5-10 (Notificações):**
- [ ] Importados e agendados
- [ ] Testados com datas manipuladas
- [ ] Mensagens corretas
- [ ] Anti-spam funcionando

**Performance:**
- [ ] Load test passou
- [ ] Queries otimizadas
- [ ] Rate limits respeitados
- [ ] Tempo de resposta OK

**Documentação:**
- [ ] README interno criado
- [ ] Equipe treinada
- [ ] Runbook de incidentes
- [ ] Plano de contingência

**Go-Live:**
- [ ] Usuários beta testaram
- [ ] Feedback implementado
- [ ] Rollback plan definido
- [ ] 🚀 DEPLOY!

---

**Última atualização:** Novembro 2025  
**Versão:** 2.0 Final  
**Status:** Pronto para uso

**Use este documento como referência rápida durante a implementação!**
