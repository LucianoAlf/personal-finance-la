// ============================================
// TEMPLATES HUMANIZADOS DA ANA CLARA
// Baseado no Zé (Copiloto Financeiro)
// ============================================

import {
  IDENTIDADE,
  getSaudacaoHorario,
  getMensagemContextual,
  getMensagemMotivacional,
  getEmojiCategoria,
  getEmojiBanco,
  getVariacao,
  getAssinatura,
  formatarValor,
  formatarData
} from './humanization.ts';

// ============================================
// BOAS-VINDAS (PRIMEIRO CONTATO ABSOLUTO - ONBOARDING)
// Usado quando é a PRIMEIRA VEZ que o usuário fala com a Ana Clara
// Mostra TODO o valor do sistema!
// ============================================

export function templateBoasVindas(nome: string): string {
  const { texto: saudacao } = getSaudacaoHorario();
  const primeiroNome = nome.split(' ')[0];
  
  return `🙋🏻‍♀️ ${saudacao}, ${primeiroNome}! Sou a *Ana Clara*!

Sua *Personal Finance* - estou aqui pra cuidar das suas finanças!

Estou aqui pra te ajudar a *organizar suas finanças*, *alcançar seus objetivos* e *fazer seu dinheiro render mais*!

━━━━━━━━━━━━━━━━━━

📱 *O que posso fazer por você:*

💸 *Controle Financeiro*
• Registrar gastos e receitas (texto ou áudio)
• Mostrar saldos e extratos
• Organizar por categorias

🎯 *Metas & Planejamento*
• Criar metas de curto, médio e longo prazo
• Acompanhar seu progresso
• Te ajudar a guardar dinheiro

📈 *Investimentos*
• Acompanhar seu portfólio
• Alertar sobre oportunidades
• Informações do mercado em tempo real

🔔 *Lembretes & Alertas*
• Contas a pagar
• Padrões de gastos preocupantes
• Dicas personalizadas

📊 *Relatórios*
• Resumos semanais e mensais
• Análise de para onde vai seu dinheiro
• Evolução do seu patrimônio

📅 *Agenda de Compromissos*
• Agendar compromissos e reuniões
• Lembretes automáticos antes do horário
• Organizar sua rotina

━━━━━━━━━━━━━━━━━━

💡 *Comece assim:*
• _"Gastei 50 no mercado"_
• _"Recebi 3000 de salário"_
• _"Qual meu saldo?"_

Bora organizar suas finanças? Me conta! 🚀

_Ana Clara • Personal Finance_`;
}

// ============================================
// SAUDAÇÃO (PRIMEIRA VEZ NO DIA)
// SEM ASSINATURA - é uma saudação curta!
// ============================================

export function templateSaudacaoPrimeiraVez(nome: string): string {
  const { texto: saudacao, emoji } = getSaudacaoHorario();
  const primeiroNome = nome.split(' ')[0];
  
  return `${emoji} ${saudacao}, ${primeiroNome}! ${IDENTIDADE.emoji}

Como posso te ajudar hoje?`;
}

// ============================================
// SAUDAÇÃO (RETORNO NO MESMO DIA)
// SEM ASSINATURA - é uma saudação curta!
// ============================================

export function templateSaudacaoRetorno(nome: string): string {
  const primeiroNome = nome.split(' ')[0];
  const saudacao = getVariacao('saudacao_retorno', { nome: primeiroNome });
  
  return `${saudacao} ${IDENTIDADE.emoji}

No que posso ajudar?`;
}

// ============================================
// AJUDA COMPLETA
// ============================================

export function templateAjuda(nome: string, primeiraVezHoje: boolean): string {
  const primeiroNome = nome.split(' ')[0];
  const { texto: saudacao, emoji } = getSaudacaoHorario();
  
  const intro = primeiraVezHoje 
    ? `${emoji} ${saudacao}, ${primeiroNome}! ${IDENTIDADE.emoji}\n\n` 
    : `Claro, ${primeiroNome}! ${IDENTIDADE.emoji}\n\n`;
  
  return `${intro}Posso te ajudar com várias coisas:

💰 *Registrar transações*
• "Gastei 50 no mercado"
• "Recebi 1000 de salário"
• "Paguei 200 de luz"

📊 *Consultas*
• "Saldo" - Ver saldos das contas
• "Extrato" - Últimas transações
• "Quanto gastei esse mês?"

✏️ *Editar última transação*
• "Era 95" - Corrigir valor
• "Muda pra Nubank" - Trocar conta
• "Exclui essa" - Apagar

🎤 *Aceito áudios também!*

É só me dizer o que precisa! 😊
${getAssinatura()}`;
}

// ============================================
// SOBRE O SISTEMA (O que você faz? Quem é você?)
// ============================================

export function templateSobreSistema(nome: string): string {
  const primeiroNome = nome.split(' ')[0];
  
  return `Oi, ${primeiroNome}! 🙋🏻‍♀️

Sou a *Ana Clara*, sua Personal Finance!

📱 *Aqui no WhatsApp eu:*
• 💸 Registro seus gastos e receitas
• 📊 Mostro saldos e extratos
• ✏️ Edito transações
• 🎤 Entendo áudios também!

💻 *No App/Dashboard você tem:*
• 📈 Gráficos e relatórios detalhados
• 🎯 Metas financeiras
• 💼 Acompanhamento de investimentos
• 🔔 Lembretes de contas a pagar
• 📂 Organização por categorias

É só me contar o que precisa! 😊
${getAssinatura()}`;
}

// ============================================
// CONFIRMAÇÃO DE DESPESA
// ============================================

export interface DadosTransacao {
  descricao: string;
  valor: number;
  categoria: string;
  conta: string;
  data: string;
  isPago?: boolean;
}

export function templateConfirmacaoDespesa(dados: DadosTransacao, nome: string): string {
  const mensagemContextual = getMensagemContextual(dados.categoria, dados.descricao);
  const mensagemMotivacional = getMensagemMotivacional(dados.categoria, dados.descricao);
  const emojiCategoria = getEmojiCategoria(dados.categoria);
  const emojiBanco = getEmojiBanco(dados.conta);
  
  return `${mensagemContextual}

⭐ *Despesa Registrada!* ⭐

📝 *Descrição:* ${dados.descricao}
💰 *Valor:* R$ ${formatarValor(dados.valor)}
🔴 *Tipo:* Despesa
${emojiCategoria} *Categoria:* ${dados.categoria}
${emojiBanco} *Conta:* ${dados.conta}
📅 *Data:* ${formatarData(dados.data)}

✔️ *Status:* ${dados.isPago !== false ? 'Pago' : 'Pendente'}

━━━━━━━━━━━━━━━━━━
💡 Quer alterar algo? É só me dizer!
• "era 95" • "muda pra Nubank" • "exclui essa"

${mensagemMotivacional}
${getAssinatura()}`;
}

// ============================================
// CONFIRMAÇÃO DE RECEITA
// ============================================

export function templateConfirmacaoReceita(dados: DadosTransacao, nome: string): string {
  const confirmacao = getVariacao('confirmacao_receita');
  const mensagemMotivacional = getMensagemMotivacional(dados.categoria, dados.descricao);
  const emojiCategoria = getEmojiCategoria(dados.categoria);
  const emojiBanco = getEmojiBanco(dados.conta);
  
  return `${confirmacao}

⭐ *Receita Registrada!* ⭐

📝 *Descrição:* ${dados.descricao}
💰 *Valor:* R$ ${formatarValor(dados.valor)}
🟢 *Tipo:* Receita
${emojiCategoria} *Categoria:* ${dados.categoria}
${emojiBanco} *Conta:* ${dados.conta}
📅 *Data:* ${formatarData(dados.data)}

✔️ *Status:* Recebido

━━━━━━━━━━━━━━━━━━

${mensagemMotivacional}
${getAssinatura()}`;
}

// ============================================
// PERGUNTAR CONTA
// ============================================

export function templatePerguntarConta(
  descricao: string, 
  valor: number, 
  contas: Array<{ nome: string; tipo?: string }>
): string {
  const listaContas = contas
    .map((c, i) => `${i + 1}. ${getEmojiBanco(c.nome)} ${c.nome}`)
    .join('\n');
  
  return `📝 Anotei R$ ${formatarValor(valor)} - ${descricao}

🏦 *Em qual conta?*

${listaContas}

_Responda com o número ou nome da conta_
${getAssinatura()}`;
}

// ============================================
// AGRADECIMENTO
// Resposta humanizada, sem assinatura (é curta/média)
// ============================================

export function templateAgradecimento(nome: string): string {
  const primeiroNome = nome.split(' ')[0];
  const resposta = getVariacao('agradecimento', { nome: primeiroNome });
  
  return `${resposta} 🙋🏻‍♀️`;
}

// ============================================
// EDIÇÃO CONFIRMADA
// SEM ASSINATURA - é uma resposta curta!
// ============================================

export function templateEdicaoConfirmada(tipo: 'valor' | 'conta' | 'categoria', novoValor: string): string {
  const mensagens: Record<string, string> = {
    valor: `✅ *Corrigido!*\n\nValor atualizado para *R$ ${novoValor}*`,
    conta: `🏦 *Feito!*\n\nConta alterada para *${novoValor}*`,
    categoria: `📂 *Pronto!*\n\nCategoria alterada para *${novoValor}*` 
  };
  
  return mensagens[tipo];
}

// ============================================
// EXCLUSÃO CONFIRMADA
// SEM ASSINATURA - é uma resposta curta!
// ============================================

export function templateExclusaoConfirmada(descricao: string, valor: number): string {
  return `🗑️ *Transação excluída!*

❌ ${descricao} - R$ ${formatarValor(valor)}`;
}

// ============================================
// SALDO
// ============================================

export function templateSaldo(
  contas: Array<{ nome: string; saldo: number; tipo: string }>,
  nome: string
): string {
  const primeiroNome = nome.split(' ')[0];
  
  let totalGeral = 0;
  const listaContas = contas.map(c => {
    totalGeral += c.saldo;
    const emoji = getEmojiBanco(c.nome);
    const saldoFormatado = formatarValor(Math.abs(c.saldo));
    const sinal = c.saldo < 0 ? '-' : '';
    return `${emoji} ${c.nome}\nR$ ${sinal}${saldoFormatado}`;
  }).join('\n\n');
  
  const totalFormatado = formatarValor(Math.abs(totalGeral));
  const sinalTotal = totalGeral < 0 ? '-' : '';
  
  return `*Seus Saldos*

${listaContas}

━━━━━━━━━━━━━━━━━━
*Total:* R$ ${sinalTotal}${totalFormatado}
${getAssinatura()}`;
}

// ============================================
// LISTA DE CONTAS
// ============================================

export function templateListaContas(
  contas: Array<{ nome: string; tipo: string; saldo: number }>,
  nome: string
): string {
  const primeiroNome = nome.split(' ')[0];
  
  const listaContas = contas.map((c, i) => {
    const emoji = getEmojiBanco(c.nome);
    const tipoLabel = c.tipo === 'checking' ? 'Conta Corrente' 
      : c.tipo === 'savings' ? 'Poupança'
      : c.tipo === 'credit_card' ? 'Cartão de Crédito'
      : c.tipo === 'investment' ? 'Investimento'
      : c.tipo === 'cash' ? 'Dinheiro'
      : c.tipo;
    return `${i + 1}. ${emoji} *${c.nome}*\n   └ ${tipoLabel} • R$ ${formatarValor(c.saldo)}`;
  }).join('\n\n');
  
  return `🏦 *Suas contas, ${primeiroNome}:*

${listaContas}
${getAssinatura()}`;
}

// ============================================
// ERRO HUMANIZADO
// ============================================

export function templateErro(tipo: 'nao_entendi' | 'sistema' | 'sem_transacao'): string {
  const mensagens = {
    nao_entendi: `🤔 Hmm, não entendi bem...

Tenta assim:
• "Gastei 50 no mercado"
• "Recebi 1000"
• "Saldo"

Ou digite *ajuda* para ver os comandos! 😊`,
    
    sistema: `😅 Ops! Tive um probleminha técnico.

Por favor, tenta de novo em alguns segundos.

Se continuar, me avisa que a gente resolve!`,
    
    sem_transacao: `🤔 Não encontrei nenhuma transação recente para editar.

Registre uma transação primeiro! 
Exemplo: "Gastei 50 no mercado"`
  };
  
  return mensagens[tipo] + getAssinatura();
}

// ============================================
// USUÁRIO NÃO CADASTRADO
// ============================================

export function templateUsuarioNaoCadastrado(): string {
  return `Olá! ${IDENTIDADE.emoji}

Parece que você ainda não tem uma conta no *Personal Finance*.

📱 Acesse nosso app para se cadastrar e começar a organizar suas finanças!

Depois de cadastrado, volte aqui que eu te ajudo! 😊
${getAssinatura()}`;
}

// ============================================
// CONFIRMAÇÃO DE EXCLUSÃO (PERGUNTA)
// ============================================

export function templateConfirmarExclusao(descricao: string, valor: number): string {
  return `⚠️ *Confirma exclusão?*

🗑️ ${descricao} - R$ ${formatarValor(valor)}

Responda *sim* para confirmar ou *não* para cancelar.
${getAssinatura()}`;
}

// ============================================
// AÇÃO CANCELADA
// ============================================

export function templateAcaoCancelada(): string {
  return `✅ *Ação cancelada!*

Tudo certo, não fiz nenhuma alteração.

${getVariacao('pergunta_engajamento')}
${getAssinatura()}`;
}

// ============================================
// PERGUNTA ENGAJADORA (usar no final de respostas)
// ============================================

export function getPerguntaEngajamento(): string {
  return getVariacao('pergunta_engajamento');
}
