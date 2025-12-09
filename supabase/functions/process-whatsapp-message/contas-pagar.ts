// ============================================
// CONTAS-PAGAR.TS - Gestão de Contas a Pagar
// Personal Finance LA - Ana Clara
// FASE 3.1: Consultas | FASE 3.2: CRUD
// ============================================

import { getSupabase } from './utils.ts';

// ============================================
// TIPOS
// ============================================

export type TipoIntencaoContaPagar = 
  | 'LISTAR_CONTAS_PAGAR'      // "contas a pagar", "contas pendentes"
  | 'CONTAS_VENCENDO'          // "o que vence essa semana"
  | 'CONTAS_VENCIDAS'          // "contas vencidas", "atrasadas"
  | 'CONTAS_DO_MES'            // "contas desse mês"
  | 'RESUMO_CONTAS_MES'        // "quanto tenho de contas", "resumo"
  | 'CADASTRAR_CONTA_PAGAR'    // "tenho que pagar 150 de luz dia 10"
  | 'EDITAR_CONTA_PAGAR'       // "mudar valor da luz para 180"
  | 'EXCLUIR_CONTA_PAGAR'      // "excluir conta de luz"
  | 'MARCAR_CONTA_PAGA'        // (fase 3.3)
  | 'VALOR_CONTA_VARIAVEL'     // (fase 3.3)
  | 'HISTORICO_CONTA'          // (fase 3.3)
  | 'CONTAS_AMBIGUO'           // "minhas contas" (perguntar ao usuário)
  | null;

// ============================================
// ALIASES DE CONTAS (FASE 3.2)
// ============================================

export const CONTA_ALIASES: Record<string, string[]> = {
  'luz': ['luz', 'energia', 'enel', 'cpfl', 'eletropaulo', 'light', 'cemig', 'celpe', 'energisa', 'coelba', 'eletricidade'],
  'agua': ['agua', 'água', 'sabesp', 'copasa', 'sanepar', 'cedae', 'cagece', 'esgoto', 'saneamento'],
  'internet': ['internet', 'wifi', 'net', 'vivo fibra', 'claro net', 'banda larga', 'oi fibra', 'fibra'],
  'aluguel': ['aluguel', 'alugel', 'moradia', 'locação', 'locacao'],
  'condominio': ['condominio', 'condomínio', 'cond', 'taxa condominial'],
  'gas': ['gas', 'gás', 'comgas', 'ultragaz', 'supergasbras', 'liquigás', 'naturgy'],
  'telefone': ['telefone', 'celular', 'móvel', 'movel', 'vivo', 'claro', 'tim', 'oi'],
  'netflix': ['netflix'],
  'spotify': ['spotify', 'deezer', 'apple music'],
  'amazon': ['amazon', 'prime', 'amazon prime'],
  'disney': ['disney', 'disney+', 'disneyplus'],
  'hbo': ['hbo', 'hbo max', 'max'],
  'globoplay': ['globoplay', 'globo play'],
  'seguro': ['seguro', 'seguro auto', 'seguro carro', 'seguro vida', 'seguro residencial'],
  'plano_saude': ['plano de saúde', 'plano saude', 'unimed', 'bradesco saúde', 'sulamerica', 'amil', 'hapvida'],
  'escola': ['escola', 'faculdade', 'mensalidade', 'curso', 'universidade'],
  'financiamento': ['financiamento', 'prestação', 'parcela carro', 'parcela casa', 'consórcio'],
  'iptu': ['iptu', 'imposto predial'],
  'ipva': ['ipva', 'licenciamento', 'detran'],
  'academia': ['academia', 'gym', 'smart fit', 'bluefit'],
};

// Normaliza nome da conta usando aliases
export function normalizarNomeConta(texto: string): string {
  const textoLower = texto.toLowerCase().trim();
  for (const [nomeNormalizado, aliases] of Object.entries(CONTA_ALIASES)) {
    if (aliases.some(alias => textoLower.includes(alias))) {
      // Capitaliza primeira letra
      return nomeNormalizado.charAt(0).toUpperCase() + nomeNormalizado.slice(1);
    }
  }
  // Retorna original capitalizado se não encontrar alias
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// ============================================
// TIPOS DE CONTA (SISTEMA ROBUSTO)
// ============================================

export type BillType = 
  | 'fixed'        // Conta fixa - mesmo valor todo mês (aluguel, plano)
  | 'variable'     // Conta variável - valor muda (luz, água, gás)
  | 'subscription' // Assinatura digital (Netflix, Spotify)
  | 'installment'  // Parcelamento (geladeira em 10x)
  | 'one_time'     // Conta avulsa/única (IPVA, matrícula)
  | 'credit_card'  // Fatura de cartão
  | 'unknown';     // Tipo desconhecido - perguntar ao usuário

// Interface para dados de cadastro
export interface DadosCadastroConta {
  tipo?: BillType;
  descricao?: string;
  valor?: number;
  diaVencimento?: number;   // 1-31
  dataVencimento?: string;  // YYYY-MM-DD (para avulsas)
  recorrencia?: 'unica' | 'mensal' | 'anual';
  parcelaAtual?: number;
  totalParcelas?: number;
  textoOriginal?: string;
}

// ============================================
// IDENTIFICAÇÃO DE TIPO DE CONTA
// ============================================

export function identificarTipoConta(texto: string, entidades: Record<string, unknown>): BillType {
  const textoLower = texto.toLowerCase();
  
  // PARCELAMENTO - tem parcelas mencionadas
  if (
    /(\d+)\s*x\s*de?\s*r?\$?\s*([\d.,]+)/i.test(textoLower) ||
    /parcela\s*(\d+)\s*(de|\/)\s*(\d+)/i.test(textoLower) ||
    /em\s*(\d+)\s*vezes/i.test(textoLower) ||
    entidades.parcela_atual || entidades.total_parcelas
  ) {
    return 'installment';
  }
  
  // ASSINATURA - serviços conhecidos
  const assinaturas = [
    'netflix', 'spotify', 'amazon prime', 'prime video', 'disney', 'hbo', 'max',
    'globoplay', 'youtube premium', 'apple music', 'deezer', 'paramount', 'star+',
    'xbox game pass', 'playstation plus', 'nintendo', 'crunchyroll',
    'chatgpt', 'claude', 'midjourney', 'canva', 'adobe', 'microsoft 365',
    'icloud', 'google one', 'dropbox', 'notion', 'figma'
  ];
  if (assinaturas.some(s => textoLower.includes(s))) {
    return 'subscription';
  }
  
  // CONTA VARIÁVEL - serviços de consumo
  const variaveis = [
    'luz', 'energia', 'eletricidade', 'enel', 'cpfl', 'cemig', 'light', 'celpe', 'energisa',
    'água', 'agua', 'sabesp', 'copasa', 'cedae', 'sanepar',
    'gás', 'gas', 'comgás', 'comgas', 'naturgy',
    'telefone fixo'
  ];
  if (variaveis.some(v => textoLower.includes(v))) {
    return 'variable';
  }
  
  // FATURA DE CARTÃO
  if (
    /fatura/i.test(textoLower) ||
    (/cart[aã]o/i.test(textoLower) && /(nubank|itau|itaú|bradesco|santander|inter|c6|xp|picpay)/i.test(textoLower))
  ) {
    return 'credit_card';
  }
  
  // CONTA AVULSA - pagamento único
  const avulsas = ['ipva', 'iptu', 'matrícula', 'matricula', 'licenciamento', 'multa', 'taxa'];
  if (avulsas.some(a => textoLower.includes(a))) {
    return 'one_time';
  }
  
  // CONTA FIXA - menções de recorrência
  const fixas = ['aluguel', 'condomínio', 'condominio', 'plano de saúde', 'plano saude', 'seguro', 'academia', 'escola', 'faculdade', 'mensalidade', 'financiamento'];
  if (fixas.some(f => textoLower.includes(f))) {
    return 'fixed';
  }
  
  // Se menciona "todo mês", "mensal", "recorrente" → FIXA
  if (/todo\s*m[eê]s|mensal|recorrente|sempre|fixo/i.test(textoLower)) {
    return 'fixed';
  }
  
  // DEFAULT: desconhecido - perguntar ao usuário
  return 'unknown';
}

// ============================================
// CAMPOS OBRIGATÓRIOS POR TIPO
// ============================================

export function getCamposObrigatorios(tipo: BillType): string[] {
  const campos: Record<BillType, string[]> = {
    'fixed': ['descricao', 'valor', 'diaVencimento'],
    'variable': ['descricao', 'diaVencimento'],  // valor pode informar depois
    'subscription': ['descricao', 'valor', 'diaVencimento'],
    'installment': ['descricao', 'valor', 'diaVencimento', 'parcelaAtual', 'totalParcelas'],
    'one_time': ['descricao', 'valor', 'diaVencimento'],  // simplificado para dia
    'credit_card': ['descricao', 'diaVencimento'],
    'unknown': ['descricao']
  };
  
  return campos[tipo] || campos['unknown'];
}

// ============================================
// VALIDAÇÃO DE CAMPOS
// ============================================

export function validarCamposConta(dados: DadosCadastroConta, camposObrigatorios: string[]): string[] {
  const faltantes: string[] = [];
  
  for (const campo of camposObrigatorios) {
    switch (campo) {
      case 'descricao':
        if (!dados.descricao || dados.descricao.trim() === '') {
          faltantes.push('descricao');
        }
        break;
        
      case 'valor':
        if (dados.valor === undefined || dados.valor === null || dados.valor <= 0) {
          faltantes.push('valor');
        }
        break;
        
      case 'diaVencimento':
        if (!dados.diaVencimento || dados.diaVencimento < 1 || dados.diaVencimento > 31) {
          faltantes.push('diaVencimento');
        }
        break;
        
      case 'dataVencimento':
        if (!dados.dataVencimento) {
          faltantes.push('dataVencimento');
        }
        break;
        
      case 'parcelaAtual':
        if (!dados.parcelaAtual || dados.parcelaAtual < 1) {
          faltantes.push('parcelaAtual');
        }
        break;
        
      case 'totalParcelas':
        if (!dados.totalParcelas || dados.totalParcelas < 1) {
          faltantes.push('totalParcelas');
        }
        break;
    }
  }
  
  return faltantes;
}

// ============================================
// FUNÇÕES DE EXTRAÇÃO
// ============================================

export function extrairValorTexto(texto: string): number | null {
  const limpo = texto.replace(/\s/g, '').toLowerCase();
  const match = limpo.match(/r?\$?([\d]+[.,]?[\d]*)/);
  
  if (match) {
    const valor = parseFloat(match[1].replace(',', '.'));
    return valor > 0 ? valor : null;
  }
  return null;
}

export function extrairDiaTexto(texto: string): number | null {
  const limpo = texto.toLowerCase();
  const match = limpo.match(/(\d{1,2})/);
  
  if (match) {
    const dia = parseInt(match[1]);
    return (dia >= 1 && dia <= 31) ? dia : null;
  }
  return null;
}

export function extrairParcelasTexto(texto: string): { atual: number; total: number } | null {
  const limpo = texto.toLowerCase();
  
  // Padrões: "3 de 10", "3/10", "parcela 3 de 10", "3ª de 10", "10x"
  let match = limpo.match(/(\d+)\s*(?:ª|°|de|\/)\s*(\d+)/);
  
  if (match) {
    const atual = parseInt(match[1]);
    const total = parseInt(match[2]);
    
    if (atual >= 1 && total >= 1 && atual <= total) {
      return { atual, total };
    }
  }
  
  // Padrão "10x de 150" - assume parcela 1
  match = limpo.match(/(\d+)\s*x/);
  if (match) {
    return { atual: 1, total: parseInt(match[1]) };
  }
  
  return null;
}

export function extrairRecorrenciaTexto(texto: string): 'mensal' | 'unica' | null {
  const limpo = texto.toLowerCase();
  
  if (/sim|mensal|todo\s*m[eê]s|repete|recorrente|1/.test(limpo)) {
    return 'mensal';
  }
  
  if (/n[aã]o|única|unica|só\s*essa|avulsa|2/.test(limpo)) {
    return 'unica';
  }
  
  return null;
}

export function extrairTipoDeResposta(texto: string): BillType | null {
  const limpo = texto.toLowerCase().trim();
  
  const mapeamento: Record<string, BillType> = {
    '1': 'fixed', 'fixa': 'fixed', 'fixo': 'fixed',
    '2': 'variable', 'variável': 'variable', 'variavel': 'variable',
    '3': 'subscription', 'assinatura': 'subscription',
    '4': 'installment', 'parcelamento': 'installment', 'parcela': 'installment', 'parcelada': 'installment', 'parcelado': 'installment',
    '5': 'one_time', 'avulsa': 'one_time', 'única': 'one_time', 'unica': 'one_time', 'avulso': 'one_time'
  };
  
  return mapeamento[limpo] || null;
}

// Mapear campo para estado do contexto
export function getStateForField(campo: string): string {
  const mapa: Record<string, string> = {
    'descricao': 'awaiting_bill_description',
    'valor': 'awaiting_bill_amount',
    'diaVencimento': 'awaiting_due_day',
    'dataVencimento': 'awaiting_due_date',
    'parcelaAtual': 'awaiting_installment_info',
    'totalParcelas': 'awaiting_installment_info',
    'tipo': 'awaiting_bill_type'
  };
  
  return mapa[campo] || 'awaiting_bill_description';
}

// ============================================
// TEMPLATES DE PERGUNTAS
// ============================================

export function getPerguntaParaCampo(campo: string, dados: DadosCadastroConta): string {
  const descricao = dados.descricao || 'essa conta';
  const emoji = dados.descricao ? getEmojiConta(dados.descricao) : '📋';
  
  switch (campo) {
    case 'descricao':
      return `📝 Qual conta você quer cadastrar?

_Exemplo: luz, água, Netflix, aluguel..._`;

    case 'valor':
      return `📝 Vou cadastrar *${descricao}*.

${emoji} 💰 Qual é o valor?

_Digite só o número, ex: "150" ou "150,00"_`;

    case 'diaVencimento':
      const valorStr = dados.valor ? ` de R$ ${dados.valor.toFixed(2).replace('.', ',')}` : '';
      return `📝 Vou cadastrar *${descricao}*${valorStr}.

${emoji} 📅 Qual o *dia do vencimento*? (1-31)

_Ex: "10", "dia 15", "todo dia 20"_`;

    case 'dataVencimento':
      return `📝 Vou cadastrar *${descricao}*${dados.valor ? ` de R$ ${dados.valor.toFixed(2).replace('.', ',')}` : ''}.

${emoji} 📅 Qual a *data do vencimento*?

_Ex: "15/01", "15 de janeiro"_`;

    case 'parcelaAtual':
    case 'totalParcelas':
      return `📝 Vou cadastrar o parcelamento de *${descricao}*.

🔢 Qual parcela é essa e de quantas?

_Ex: "3 de 10", "parcela 5 de 12", "5/12"_`;

    default:
      return `❓ Preciso de mais informações sobre *${descricao}*. Pode me contar mais?`;
  }
}

export function templatePerguntarTipoConta(descricao?: string): string {
  const intro = descricao 
    ? `📝 Vou cadastrar *${descricao}*.` 
    : `📝 Vou cadastrar sua conta.`;
    
  return `${intro}

🤔 Que tipo de conta é essa?

1️⃣ *Fixa* - mesmo valor todo mês (aluguel, plano)
2️⃣ *Variável* - valor muda (luz, água, gás)
3️⃣ *Assinatura* - serviço digital (Netflix, Spotify)
4️⃣ *Parcelamento* - compra parcelada
5️⃣ *Avulsa* - só essa vez (IPVA, matrícula)

_Digite o número ou o nome_`;
}

export interface ContaPagar {
  id: string;
  description: string;
  provider_name?: string;
  amount: number;
  due_date: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  is_recurring: boolean;
  bill_type?: string;
  category?: { name: string };
  account?: { name: string };
  // Para exibição numerada
  index?: number;
  // Tipo para diferenciação
  tipo?: 'conta' | 'fatura';
}

export interface FaturaCartao {
  id: string;
  card_name: string;
  total_amount: number;
  due_date: string;
  status: string;
}

// ============================================
// HELPERS
// ============================================

function formatarMoeda(valor: number): string {
  const absValor = Math.abs(valor);
  const formatted = absValor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return valor < 0 ? `-R$ ${formatted}` : `R$ ${formatted}`;
}

function obterNomeMes(data: Date): string {
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return meses[data.getMonth()];
}

function formatarData(data: string): string {
  const d = new Date(data + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatarDataComDia(data: string): string {
  const d = new Date(data + 'T12:00:00');
  const dias = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const dia = dias[d.getDay()];
  return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} (${dia})`;
}

function calcularDiasParaVencimento(dueDate: string): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencimento = new Date(dueDate + 'T12:00:00');
  vencimento.setHours(0, 0, 0, 0);
  const diffTime = vencimento.getTime() - hoje.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getEmojiConta(nome: string): string {
  const n = nome.toLowerCase();
  
  // Aliases de contas comuns
  const aliases: Record<string, string> = {
    // Energia
    'luz': '💡', 'energia': '💡', 'enel': '💡', 'light': '💡', 'eletricidade': '💡',
    'cemig': '💡', 'cpfl': '💡', 'eletropaulo': '💡', 'coelba': '💡', 'celpe': '💡',
    // Água
    'agua': '💧', 'água': '💧', 'saneamento': '💧', 'cedae': '💧', 'sabesp': '💧',
    'esgoto': '💧', 'copasa': '💧', 'sanepar': '💧',
    // Gás
    'gas': '🔥', 'gás': '🔥', 'naturgy': '🔥', 'comgas': '🔥', 'ultragaz': '🔥',
    // Internet/Telefone
    'internet': '🌐', 'wifi': '🌐', 'banda larga': '🌐', 'fibra': '🌐',
    'celular': '📱', 'telefone': '📱', 'tim': '📱', 'vivo': '📱', 
    'claro': '📱', 'oi': '📱', 'telecom': '🌐',
    // Moradia
    'aluguel': '🏠', 'moradia': '🏠', 'iptu': '🏠', 'housing': '🏠',
    'condominio': '🏢', 'condomínio': '🏢', 'cond': '🏢',
    // Streaming
    'netflix': '📺', 'disney': '📺', 'hbo': '📺', 'amazon prime': '📺',
    'globoplay': '📺', 'streaming': '📺', 'subscription': '📺',
    'spotify': '🎵', 'deezer': '🎵', 'apple music': '🎵',
    // Outros
    'academia': '🏋️', 'gym': '🏋️', 'smart fit': '🏋️',
    'seguro': '🛡️',
    'ipva': '🚗', 'licenciamento': '🚗', 'carro': '🚗', 'detran': '🚗',
    'escola': '📚', 'faculdade': '📚', 'curso': '📚', 'mensalidade': '📚',
    'financiamento': '🏦', 'emprestimo': '🏦', 'empréstimo': '🏦', 'parcela': '🏦',
    'plano de saude': '🏥', 'plano de saúde': '🏥', 'unimed': '🏥', 'amil': '🏥',
    'service': '📋',
  };
  
  for (const [key, emoji] of Object.entries(aliases)) {
    if (n.includes(key)) return emoji;
  }
  
  return '📋';
}

// ============================================
// BUSCAR CONTAS PENDENTES
// ============================================

export async function buscarContasPendentes(userId: string): Promise<ContaPagar[]> {
  const supabase = getSupabase();
  
  const { data: contas, error } = await supabase
    .from('payable_bills')
    .select(`
      id,
      description,
      provider_name,
      amount,
      due_date,
      status,
      is_recurring,
      bill_type,
      category:categories(name),
      account:accounts(name)
    `)
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true });
  
  if (error) {
    console.error('[CONTAS-PAGAR] Erro ao buscar contas:', error);
    return [];
  }
  
  return (contas || []).map((c: any, idx: number) => ({
    ...c,
    index: idx + 1,
    tipo: 'conta' as const,
    category: c.category as any,
    account: c.account as any
  }));
}

// ============================================
// BUSCAR FATURAS DE CARTÃO PENDENTES
// ============================================

export async function buscarFaturasPendentes(userId: string): Promise<FaturaCartao[]> {
  const supabase = getSupabase();
  
  const { data: faturas, error } = await supabase
    .from('credit_card_invoices')
    .select(`
      id,
      total_amount,
      due_date,
      status,
      card:credit_cards(name)
    `)
    .eq('user_id', userId)
    .in('status', ['open', 'closed'])
    .order('due_date', { ascending: true });
  
  if (error) {
    console.error('[CONTAS-PAGAR] Erro ao buscar faturas:', error);
    return [];
  }
  
  return (faturas || []).map((f: any) => ({
    id: f.id,
    card_name: f.card?.name || 'Cartão',
    total_amount: f.total_amount,
    due_date: f.due_date,
    status: f.status
  }));
}

// ============================================
// LISTAR CONTAS A PAGAR (COM FATURAS)
// ============================================

export async function listarContasPagar(userId: string): Promise<{ mensagem: string; contas: ContaPagar[] }> {
  const contas = await buscarContasPendentes(userId);
  const faturas = await buscarFaturasPendentes(userId);
  
  console.log('[CONTAS-PAGAR] Contas encontradas:', contas.length);
  console.log('[CONTAS-PAGAR] Faturas encontradas:', faturas.length);
  
  // Combinar contas + faturas
  const todos: ContaPagar[] = [];
  
  contas.forEach(c => todos.push({ ...c, tipo: 'conta' }));
  faturas.forEach(f => todos.push({ 
    id: f.id,
    description: `Fatura ${f.card_name}`,
    amount: f.total_amount,
    due_date: f.due_date,
    status: f.status === 'open' || f.status === 'closed' ? 'pending' : 'paid',
    is_recurring: false,
    tipo: 'fatura'
  }));
  
  // Ordenar por data
  todos.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  
  if (todos.length === 0) {
    return { 
      mensagem: `✅ *Tudo em dia!*\n\nVocê não tem contas pendentes no momento. 🎉\n\n💡 _Para cadastrar uma conta:_\n_"Tenho que pagar 150 de luz dia 10"_`,
      contas: []
    };
  }
  
  const hoje = new Date();
  
  // Separar por status
  const vencidas = todos.filter(t => calcularDiasParaVencimento(t.due_date) < 0);
  const proximos7 = todos.filter(t => {
    const dias = calcularDiasParaVencimento(t.due_date);
    return dias >= 0 && dias <= 7;
  });
  const restante = todos.filter(t => calcularDiasParaVencimento(t.due_date) > 7);
  
  let mensagem = `📋 *Suas Contas a Pagar*\n📅 ${obterNomeMes(hoje)}/${hoje.getFullYear()}\n`;
  
  let indexGlobal = 1;
  
  // VENCIDAS
  if (vencidas.length > 0) {
    mensagem += `\n🔴 *VENCIDAS* (${vencidas.length})\n`;
    for (const t of vencidas) {
      const dias = Math.abs(calcularDiasParaVencimento(t.due_date));
      const emoji = t.tipo === 'fatura' ? '💳' : getEmojiConta(t.description);
      // Formato: emoji Nome - DD/MM (dia): R$ valor — há Xd
      mensagem += `${indexGlobal}. ${emoji} ${t.description} - ${formatarDataComDia(t.due_date)}: ${formatarMoeda(t.amount)} — _há ${dias}d_\n`;
      
      const contaOriginal = contas.find(c => c.id === t.id);
      if (contaOriginal) contaOriginal.index = indexGlobal;
      indexGlobal++;
    }
  }
  
  // PRÓXIMOS 7 DIAS
  if (proximos7.length > 0) {
    mensagem += `\n🟡 *PRÓXIMOS 7 DIAS* (${proximos7.length})\n`;
    for (const t of proximos7) {
      const dias = calcularDiasParaVencimento(t.due_date);
      const emoji = t.tipo === 'fatura' ? '💳' : getEmojiConta(t.description);
      let prazo = '';
      if (dias === 0) prazo = 'HOJE';
      else if (dias === 1) prazo = 'amanhã';
      else prazo = `em ${dias}d`;
      
      // Formato: emoji Nome - DD/MM (dia): R$ valor — prazo
      mensagem += `${indexGlobal}. ${emoji} ${t.description} - ${formatarDataComDia(t.due_date)}: ${formatarMoeda(t.amount)} — _${prazo}_\n`;
      
      const contaOriginal = contas.find(c => c.id === t.id);
      if (contaOriginal) contaOriginal.index = indexGlobal;
      indexGlobal++;
    }
  }
  
  // RESTANTE DO MÊS
  if (restante.length > 0) {
    mensagem += `\n🟢 *RESTANTE DO MÊS* (${restante.length})\n`;
    for (const t of restante.slice(0, 5)) {
      const emoji = t.tipo === 'fatura' ? '💳' : getEmojiConta(t.description);
      // Formato: emoji Nome - DD/MM (dia): R$ valor
      mensagem += `${indexGlobal}. ${emoji} ${t.description} - ${formatarDataComDia(t.due_date)}: ${formatarMoeda(t.amount)}\n`;
      
      const contaOriginal = contas.find(c => c.id === t.id);
      if (contaOriginal) contaOriginal.index = indexGlobal;
      indexGlobal++;
    }
    if (restante.length > 5) {
      mensagem += `_... +${restante.length - 5} contas_\n`;
    }
  }
  
  // TOTAL
  const total = todos.reduce((sum, t) => sum + Number(t.amount), 0);
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total pendente:* ${formatarMoeda(total)}`;
  
  return { mensagem, contas };
}

// ============================================
// CONTAS VENCENDO (PRÓXIMOS X DIAS)
// ============================================

export async function contasVencendo(userId: string, dias: number = 7): Promise<string> {
  const supabase = getSupabase();
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString().split('T')[0];
  
  const dataLimite = new Date(hoje);
  dataLimite.setDate(dataLimite.getDate() + dias);
  const dataLimiteStr = dataLimite.toISOString().split('T')[0];
  
  // Buscar contas A VENCER (de hoje em diante, não vencidas!)
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('id, description, amount, due_date, status, bill_type')
    .eq('user_id', userId)
    .eq('status', 'pending')  // Só pendentes, não overdue!
    .gte('due_date', hojeStr)  // A partir de hoje
    .lte('due_date', dataLimiteStr)  // Até o limite
    .order('due_date', { ascending: true });
  
  // Buscar faturas A VENCER
  const { data: faturas } = await supabase
    .from('credit_card_invoices')
    .select(`
      id,
      total_amount,
      due_date,
      status,
      card:credit_cards(name)
    `)
    .eq('user_id', userId)
    .in('status', ['open', 'closed'])
    .gte('due_date', hojeStr)  // A partir de hoje
    .lte('due_date', dataLimiteStr)  // Até o limite
    .order('due_date', { ascending: true });
  
  // Combinar e ordenar
  const todos: any[] = [];
  
  (contas || []).forEach((c: any) => todos.push({
    ...c,
    tipo: 'conta',
    emoji: getEmojiConta(c.description)
  }));
  
  (faturas || []).forEach((f: any) => todos.push({
    id: f.id,
    description: `Fatura ${f.card?.name || 'Cartão'}`,
    amount: f.total_amount,
    due_date: f.due_date,
    status: f.status,
    tipo: 'fatura',
    emoji: '💳'
  }));
  
  todos.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  
  if (todos.length === 0) {
    return `✅ *Tudo tranquilo!*\n\nNenhuma conta vencendo nos próximos ${dias} dias! 🎉`;
  }
  
  let mensagem = `📅 *Contas a Vencer*\n_Próximos ${dias} dias_\n`;
  
  // Agrupar por prazo (só futuro, não tem vencidos aqui!)
  const hojeList = todos.filter(t => calcularDiasParaVencimento(t.due_date) === 0);
  const amanha = todos.filter(t => calcularDiasParaVencimento(t.due_date) === 1);
  const restante = todos.filter(t => calcularDiasParaVencimento(t.due_date) > 1);
  
  let idx = 1;
  
  if (hojeList.length > 0) {
    mensagem += `\n🔴 *HOJE* (${hojeList.length})\n`;
    for (const t of hojeList) {
      mensagem += `${idx}. ${t.emoji} ${t.description}: ${formatarMoeda(t.amount)} 🔔\n`;
      idx++;
    }
  }
  
  if (amanha.length > 0) {
    mensagem += `\n🟡 *AMANHÃ* (${amanha.length})\n`;
    for (const t of amanha) {
      mensagem += `${idx}. ${t.emoji} ${t.description} - ${formatarDataComDia(t.due_date)}: ${formatarMoeda(t.amount)}\n`;
      idx++;
    }
  }
  
  if (restante.length > 0) {
    mensagem += `\n🟢 *ESTA SEMANA* (${restante.length})\n`;
    for (const t of restante) {
      const diasRestantes = calcularDiasParaVencimento(t.due_date);
      mensagem += `${idx}. ${t.emoji} ${t.description} - ${formatarDataComDia(t.due_date)}: ${formatarMoeda(t.amount)} — _em ${diasRestantes}d_\n`;
      idx++;
    }
  }
  
  // Total
  const total = todos.reduce((sum, t) => sum + Number(t.amount), 0);
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total a vencer:* ${formatarMoeda(total)}`;
  
  return mensagem;
}

// ============================================
// CONTAS VENCIDAS
// ============================================

export async function contasVencidas(userId: string): Promise<string> {
  const supabase = getSupabase();
  
  const { data: vencidas } = await supabase
    .from('payable_bills')
    .select('id, description, amount, due_date, bill_type')
    .eq('user_id', userId)
    .eq('status', 'overdue')
    .order('due_date', { ascending: true });
  
  if (!vencidas || vencidas.length === 0) {
    return `✅ *Parabéns!*\n\nVocê não tem contas vencidas! 🎉\n\n_Continue assim, suas finanças agradecem!_`;
  }
  
  let mensagem = `🔴 *Contas Vencidas*\n_${vencidas.length} conta(s) em atraso_\n`;
  let total = 0;
  let idx = 1;
  
  // Agrupar por tempo de atraso
  const muitoAtrasadas = vencidas.filter((c: any) => Math.abs(calcularDiasParaVencimento(c.due_date)) > 15);
  const atrasadas = vencidas.filter((c: any) => {
    const dias = Math.abs(calcularDiasParaVencimento(c.due_date));
    return dias > 7 && dias <= 15;
  });
  const recentes = vencidas.filter((c: any) => Math.abs(calcularDiasParaVencimento(c.due_date)) <= 7);
  
  if (muitoAtrasadas.length > 0) {
    mensagem += `\n⚠️ *MAIS DE 15 DIAS* (${muitoAtrasadas.length})\n`;
    for (const c of muitoAtrasadas) {
      const emoji = getEmojiConta(c.description);
      const dias = Math.abs(calcularDiasParaVencimento(c.due_date));
      mensagem += `${idx}. ${emoji} ${c.description} - ${formatarDataComDia(c.due_date)}: ${formatarMoeda(c.amount)} — _há ${dias}d_\n`;
      total += Number(c.amount);
      idx++;
    }
  }
  
  if (atrasadas.length > 0) {
    mensagem += `\n🟠 *8 A 15 DIAS* (${atrasadas.length})\n`;
    for (const c of atrasadas) {
      const emoji = getEmojiConta(c.description);
      const dias = Math.abs(calcularDiasParaVencimento(c.due_date));
      mensagem += `${idx}. ${emoji} ${c.description} - ${formatarDataComDia(c.due_date)}: ${formatarMoeda(c.amount)} — _há ${dias}d_\n`;
      total += Number(c.amount);
      idx++;
    }
  }
  
  if (recentes.length > 0) {
    mensagem += `\n🟡 *ATÉ 7 DIAS* (${recentes.length})\n`;
    for (const c of recentes) {
      const emoji = getEmojiConta(c.description);
      const dias = Math.abs(calcularDiasParaVencimento(c.due_date));
      mensagem += `${idx}. ${emoji} ${c.description} - ${formatarDataComDia(c.due_date)}: ${formatarMoeda(c.amount)} — _há ${dias}d_\n`;
      total += Number(c.amount);
      idx++;
    }
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 *Total em atraso:* ${formatarMoeda(total)}\n\n`;
  mensagem += `⚠️ _Regularize o quanto antes para evitar juros!_\n\n`;
  mensagem += `💡 _"paguei a 1" ou "paguei a luz"_`;
  
  return mensagem;
}

// ============================================
// CONTAS DO MÊS
// ============================================

export async function contasDoMes(userId: string, mes?: number, ano?: number): Promise<string> {
  const supabase = getSupabase();
  const hoje = new Date();
  const mesAlvo = mes ?? hoje.getMonth();
  const anoAlvo = ano ?? hoje.getFullYear();
  
  const inicioMes = new Date(anoAlvo, mesAlvo, 1);
  const fimMes = new Date(anoAlvo, mesAlvo + 1, 0);
  
  // Buscar contas do mês
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('id, description, amount, due_date, status, bill_type')
    .eq('user_id', userId)
    .gte('due_date', inicioMes.toISOString().split('T')[0])
    .lte('due_date', fimMes.toISOString().split('T')[0])
    .order('due_date', { ascending: true });
  
  // Buscar faturas do mês
  const { data: faturas } = await supabase
    .from('credit_card_invoices')
    .select(`
      id,
      total_amount,
      due_date,
      status,
      card:credit_cards(name)
    `)
    .eq('user_id', userId)
    .gte('due_date', inicioMes.toISOString().split('T')[0])
    .lte('due_date', fimMes.toISOString().split('T')[0])
    .order('due_date', { ascending: true });
  
  // Combinar
  const todos: any[] = [];
  
  (contas || []).forEach((c: any) => todos.push({
    ...c,
    tipo: 'conta',
    emoji: getEmojiConta(c.description)
  }));
  
  (faturas || []).forEach((f: any) => todos.push({
    id: f.id,
    description: `Fatura ${f.card?.name || 'Cartão'}`,
    amount: f.total_amount,
    due_date: f.due_date,
    status: f.status,
    tipo: 'fatura',
    emoji: '💳'
  }));
  
  todos.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  
  if (todos.length === 0) {
    return `✅ Nenhuma conta em ${obterNomeMes(inicioMes)}!`;
  }
  
  let mensagem = `📋 *Contas de ${obterNomeMes(inicioMes)}*\n\n`;
  let totalPendente = 0;
  let totalPago = 0;
  
  for (const t of todos) {
    const dias = calcularDiasParaVencimento(t.due_date);
    let status = '';
    
    if (t.status === 'paid') {
      status = '✅';
      totalPago += Number(t.amount);
    } else if (dias < 0) {
      status = '🔴';
      totalPendente += Number(t.amount);
    } else if (dias === 0) {
      status = '🟠 HOJE';
      totalPendente += Number(t.amount);
    } else if (dias <= 3) {
      status = '🟡';
      totalPendente += Number(t.amount);
    } else {
      status = '🟢';
      totalPendente += Number(t.amount);
    }
    
    mensagem += `${status} ${t.emoji} ${t.description} (${formatarData(t.due_date)}): ${formatarMoeda(t.amount)}\n`;
  }
  
  mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
  if (totalPago > 0) {
    mensagem += `✅ Pago: ${formatarMoeda(totalPago)}\n`;
  }
  mensagem += `⏳ Pendente: ${formatarMoeda(totalPendente)}\n`;
  mensagem += `💰 *Total:* ${formatarMoeda(totalPago + totalPendente)}`;
  
  return mensagem;
}

// ============================================
// RESUMO DE CONTAS DO MÊS
// ============================================

export async function resumoContasMes(userId: string): Promise<string> {
  const supabase = getSupabase();
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  
  // Buscar contas do mês
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('amount, status, due_date')
    .eq('user_id', userId)
    .gte('due_date', inicioMes.toISOString().split('T')[0])
    .lte('due_date', fimMes.toISOString().split('T')[0]);
  
  // Buscar faturas do mês
  const { data: faturas } = await supabase
    .from('credit_card_invoices')
    .select('total_amount, status, due_date')
    .eq('user_id', userId)
    .gte('due_date', inicioMes.toISOString().split('T')[0])
    .lte('due_date', fimMes.toISOString().split('T')[0]);
  
  // Calcular totais
  const contasPagas = (contas || []).filter((c: any) => c.status === 'paid');
  const contasPendentes = (contas || []).filter((c: any) => c.status === 'pending');
  const contasVencidasList = (contas || []).filter((c: any) => c.status === 'overdue');
  
  const faturasPagas = (faturas || []).filter((f: any) => f.status === 'paid');
  const faturasPendentes = (faturas || []).filter((f: any) => ['open', 'closed'].includes(f.status));
  
  const totalPago = 
    contasPagas.reduce((sum: number, c: any) => sum + Number(c.amount), 0) +
    faturasPagas.reduce((sum: number, f: any) => sum + Number(f.total_amount), 0);
  
  const totalPendente = 
    contasPendentes.reduce((sum: number, c: any) => sum + Number(c.amount), 0) +
    faturasPendentes.reduce((sum: number, f: any) => sum + Number(f.total_amount), 0);
  
  const totalVencido = contasVencidasList.reduce((sum: number, c: any) => sum + Number(c.amount), 0);
  
  const totalPrevisto = totalPago + totalPendente + totalVencido;
  
  // Buscar mês anterior para comparativo
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  
  const { data: contasMesAnterior } = await supabase
    .from('payable_bills')
    .select('amount')
    .eq('user_id', userId)
    .gte('due_date', inicioMesAnterior.toISOString().split('T')[0])
    .lte('due_date', fimMesAnterior.toISOString().split('T')[0]);
  
  const { data: faturasMesAnterior } = await supabase
    .from('credit_card_invoices')
    .select('total_amount')
    .eq('user_id', userId)
    .gte('due_date', inicioMesAnterior.toISOString().split('T')[0])
    .lte('due_date', fimMesAnterior.toISOString().split('T')[0]);
  
  const totalMesAnterior = 
    (contasMesAnterior || []).reduce((sum: number, c: any) => sum + Number(c.amount), 0) +
    (faturasMesAnterior || []).reduce((sum: number, f: any) => sum + Number(f.total_amount), 0);
  
  // Montar mensagem
  let mensagem = `📊 *Resumo de ${obterNomeMes(hoje)}*\n\n`;
  
  mensagem += `━━━━━━━━━━━━━━━━━━\n`;
  mensagem += `💰 Total previsto: ${formatarMoeda(totalPrevisto)}\n`;
  mensagem += `✅ Já pago: ${formatarMoeda(totalPago)}\n`;
  mensagem += `⏳ Pendente: ${formatarMoeda(totalPendente)}\n`;
  
  if (totalVencido > 0) {
    mensagem += `🔴 Vencido: ${formatarMoeda(totalVencido)}\n`;
  }
  
  mensagem += `\n📋 Contas: ${(contas || []).length}\n`;
  mensagem += `💳 Faturas: ${(faturas || []).length}\n`;
  
  // Comparativo
  if (totalMesAnterior > 0) {
    const diferenca = totalPrevisto - totalMesAnterior;
    const percentual = (diferenca / totalMesAnterior) * 100;
    
    mensagem += `\n━━━━━━━━━━━━━━━━━━\n`;
    if (diferenca > 0) {
      mensagem += `📈 vs ${obterNomeMes(inicioMesAnterior)}: +${formatarMoeda(diferenca)} (+${percentual.toFixed(0)}%)`;
    } else if (diferenca < 0) {
      mensagem += `📉 vs ${obterNomeMes(inicioMesAnterior)}: ${formatarMoeda(diferenca)} (${percentual.toFixed(0)}%)`;
    } else {
      mensagem += `➡️ vs ${obterNomeMes(inicioMesAnterior)}: Igual`;
    }
  }
  
  return mensagem;
}

// ============================================
// SALVAR CONTEXTO DE LISTAGEM (para atalho "paguei a 1")
// ============================================

export async function salvarContextoListagem(userId: string, contas: ContaPagar[]): Promise<void> {
  const supabase = getSupabase();
  
  // Salvar no contexto do usuário
  await supabase
    .from('user_context')
    .upsert({
      user_id: userId,
      context_type: 'lista_contas_pagar',
      context_data: {
        contas: contas.map(c => ({
          index: c.index,
          id: c.id,
          nome: c.description
        })),
        expira_em: Date.now() + (30 * 60 * 1000) // 30 minutos
      },
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,context_type'
    });
}

// ============================================
// TEMPLATE PARA DESAMBIGUAÇÃO
// ============================================

export function templateContasAmbiguo(): string {
  return `Oi! Quais contas você quer consultar?

1️⃣ Contas Bancárias (saldos)
2️⃣ Contas a Pagar (luz, água, etc)

_Digite 1 ou 2, ou escreva "bancárias" ou "pagar"_ 😊`;
}

// ============================================
// PROCESSAR RESPOSTA DA DESAMBIGUAÇÃO
// ============================================

export function processarRespostaContasAmbiguo(resposta: string): 'bancarias' | 'pagar' | null {
  const r = resposta.toLowerCase().trim();
  
  // Opção 1 - Contas Bancárias
  if (r === '1' || r === 'bancárias' || r === 'bancarias' || r === 'bancos' || r === 'saldo' || r === 'saldos') {
    return 'bancarias';
  }
  
  // Opção 2 - Contas a Pagar
  if (r === '2' || r === 'pagar' || r === 'a pagar' || r === 'pendentes' || r === 'contas a pagar') {
    return 'pagar';
  }
  
  return null;
}

// ============================================
// PROCESSAR INTENÇÃO - CONSULTAS (FASE 3.1)
// ============================================

export async function processarIntencaoContaPagar(
  intencao: TipoIntencaoContaPagar,
  userId: string,
  _phone: string,
  _entidades?: any
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: any }> {
  
  console.log('[CONTAS-PAGAR] Processando intenção:', intencao);
  
  switch (intencao) {
    case 'LISTAR_CONTAS_PAGAR': {
      const resultado = await listarContasPagar(userId);
      
      // Salvar contexto para atalho "paguei a 1"
      if (resultado.contas.length > 0) {
        await salvarContextoListagem(userId, resultado.contas);
      }
      
      return { mensagem: resultado.mensagem };
    }
    
    case 'CONTAS_VENCENDO':
      return { mensagem: await contasVencendo(userId, 7) };
    
    case 'CONTAS_VENCIDAS':
      return { mensagem: await contasVencidas(userId) };
    
    case 'CONTAS_DO_MES':
      return { mensagem: await contasDoMes(userId) };
    
    case 'RESUMO_CONTAS_MES':
      return { mensagem: await resumoContasMes(userId) };
    
    // FASE 3.2: CRUD de contas
    case 'CADASTRAR_CONTA_PAGAR':
      return await processarCadastroConta(userId, _phone, _entidades);
    
    case 'EDITAR_CONTA_PAGAR':
      return await processarEdicaoConta(userId, _entidades);
    
    case 'EXCLUIR_CONTA_PAGAR':
      return await processarExclusaoConta(userId, _phone, _entidades);
    
    case 'MARCAR_CONTA_PAGA':
    case 'VALOR_CONTA_VARIAVEL':
    case 'HISTORICO_CONTA':
      return { 
        mensagem: `🚧 _Funcionalidade em desenvolvimento..._\n\nEm breve você poderá marcar contas como pagas!\n\n💡 Por enquanto, use:\n• _"contas a pagar"_\n• _"contas vencidas"_` 
      };
    
    case 'CONTAS_AMBIGUO':
      return { 
        mensagem: templateContasAmbiguo(),
        precisaConfirmacao: true,
        dados: { step: 'awaiting_account_type_selection' }
      };
    
    default:
      return { 
        mensagem: `❓ Não entendi o que você quer fazer com contas.\n\n💡 Tente:\n• _"minhas contas"_\n• _"o que vence essa semana"_\n• _"contas vencidas"_\n• _"resumo de contas"_` 
      };
  }
}

// ============================================
// FASE 3.2: CADASTRAR CONTA (SISTEMA ROBUSTO)
// ============================================

async function processarCadastroConta(
  userId: string,
  phone: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const supabase = getSupabase();
  const comandoOriginal = (entidades.comando_original as string || '').toLowerCase();
  
  console.log('[CADASTRAR-CONTA] Iniciando processamento robusto');
  console.log('[CADASTRAR-CONTA] Entidades NLP:', JSON.stringify(entidades));
  console.log('[CADASTRAR-CONTA] Comando original:', comandoOriginal);
  
  // ============================================
  // PASSO 1: Extrair dados do NLP + fallback
  // ============================================
  
  let descricaoRaw = entidades.descricao as string || entidades.nome_conta as string || '';
  let valor = entidades.valor as number | undefined;
  let diaVencimento = entidades.dia_vencimento as number | undefined;
  let parcelaAtual = entidades.parcela_atual as number | undefined;
  let totalParcelas = entidades.total_parcelas as number | undefined || entidades.parcelas as number | undefined;
  
  // Fallback: extrair descrição do texto
  if (!descricaoRaw && comandoOriginal) {
    for (const [tipo, aliases] of Object.entries(CONTA_ALIASES)) {
      if (aliases.some(alias => comandoOriginal.includes(alias))) {
        descricaoRaw = tipo;
        break;
      }
    }
  }
  
  // ============================================
  // PASSO 2: VALIDAÇÃO CRÍTICA - Não confiar cegamente no NLP
  // ============================================
  
  // Só aceitar dia_vencimento se REALMENTE foi mencionado no texto
  const textoMencionaDia = comandoOriginal && (
    /dia\s*\d{1,2}/i.test(comandoOriginal) ||
    /todo\s+dia/i.test(comandoOriginal) ||
    /vence\s+(dia\s*)?\d{1,2}/i.test(comandoOriginal) ||
    /vencimento\s+(dia\s*)?\d{1,2}/i.test(comandoOriginal)
  );
  
  if (diaVencimento && !textoMencionaDia) {
    console.log('[CADASTRAR-CONTA] NLP inventou dia_vencimento. Ignorando.');
    diaVencimento = undefined;
  }
  
  // Só aceitar valor se REALMENTE foi mencionado no texto
  const textoMencionaValor = comandoOriginal && (
    /r\s*\$\s*\d/i.test(comandoOriginal) ||
    /\d+\s*(reais|real)/i.test(comandoOriginal) ||
    /valor\s*(de)?\s*\d/i.test(comandoOriginal) ||
    /pagar\s*\d/i.test(comandoOriginal) ||
    /\d+[.,]\d{2}/i.test(comandoOriginal)  // 150,00 ou 150.00
  );
  
  if (valor && !textoMencionaValor) {
    console.log('[CADASTRAR-CONTA] NLP inventou valor. Ignorando.');
    valor = undefined;
  }
  
  // Fallback: extrair dia do texto
  if (!diaVencimento && comandoOriginal) {
    const diaMatch = comandoOriginal.match(/dia\s*(\d{1,2})/i);
    if (diaMatch) {
      diaVencimento = parseInt(diaMatch[1]);
    }
  }
  
  // Fallback: extrair valor do texto
  if (!valor && comandoOriginal) {
    const valorMatch = comandoOriginal.match(/r?\$?\s*(\d+(?:[.,]\d+)?)\s*(?:de|reais)?/i);
    if (valorMatch && !comandoOriginal.includes('dia ' + valorMatch[1])) {
      valor = parseFloat(valorMatch[1].replace(',', '.'));
    }
  }
  
  // Fallback: extrair parcelas do texto
  if (!parcelaAtual && !totalParcelas && comandoOriginal) {
    const parcelas = extrairParcelasTexto(comandoOriginal);
    if (parcelas) {
      parcelaAtual = parcelas.atual;
      totalParcelas = parcelas.total;
    }
  }
  
  // ============================================
  // PASSO 3: Identificar tipo de conta
  // ============================================
  
  const tipo = identificarTipoConta(comandoOriginal || descricaoRaw, entidades);
  console.log('[CADASTRAR-CONTA] Tipo identificado:', tipo);
  
  // ============================================
  // PASSO 4: Montar dados e validar
  // ============================================
  
  const descricao = descricaoRaw ? normalizarNomeConta(descricaoRaw) : undefined;
  
  const dados: DadosCadastroConta = {
    tipo,
    descricao,
    valor,
    diaVencimento,
    parcelaAtual,
    totalParcelas,
    recorrencia: tipo === 'fixed' || tipo === 'subscription' || tipo === 'variable' ? 'mensal' : 'unica',
    textoOriginal: comandoOriginal
  };
  
  console.log('[CADASTRAR-CONTA] Dados extraídos:', JSON.stringify(dados));
  
  // ============================================
  // PASSO 5: Se tipo desconhecido, perguntar
  // ============================================
  
  if (tipo === 'unknown' && descricao) {
    return {
      mensagem: templatePerguntarTipoConta(descricao),
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_bill_type',
        ...dados,
        phone
      }
    };
  }
  
  // ============================================
  // PASSO 6: Validar campos obrigatórios
  // ============================================
  
  const camposObrigatorios = getCamposObrigatorios(tipo);
  const camposFaltantes = validarCamposConta(dados, camposObrigatorios);
  
  console.log('[CADASTRAR-CONTA] Campos obrigatórios:', camposObrigatorios);
  console.log('[CADASTRAR-CONTA] Campos faltantes:', camposFaltantes);
  
  // Se falta descrição, perguntar primeiro
  if (camposFaltantes.includes('descricao')) {
    return {
      mensagem: getPerguntaParaCampo('descricao', dados),
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_bill_description',
        ...dados,
        phone
      }
    };
  }
  
  // Verificar duplicação (só se tem descrição)
  if (descricao) {
    const contaExistente = await buscarContaPorNome(userId, descricao);
    
    if (contaExistente) {
      return {
        mensagem: templateContaDuplicada(contaExistente, valor),
        precisaConfirmacao: true,
        dados: { 
          step: 'awaiting_duplicate_decision',
          conta_existente_id: contaExistente.id,
          novo_valor: valor,
          ...dados,
          phone
        }
      };
    }
  }
  
  // Se falta dia de vencimento, perguntar
  if (camposFaltantes.includes('diaVencimento')) {
    return {
      mensagem: getPerguntaParaCampo('diaVencimento', dados),
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_due_day',
        ...dados,
        phone
      }
    };
  }
  
  // Se falta valor (e tipo exige), perguntar
  if (camposFaltantes.includes('valor')) {
    return {
      mensagem: getPerguntaParaCampo('valor', dados),
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_bill_amount',
        ...dados,
        phone
      }
    };
  }
  
  // Se falta info de parcelas, perguntar
  if (camposFaltantes.includes('parcelaAtual') || camposFaltantes.includes('totalParcelas')) {
    return {
      mensagem: getPerguntaParaCampo('parcelaAtual', dados),
      precisaConfirmacao: true,
      dados: {
        step: 'awaiting_installment_info',
        ...dados,
        phone
      }
    };
  }
  
  // ============================================
  // PASSO 7: Todos os campos OK - Cadastrar!
  // ============================================
  
  return await cadastrarContaNoBanco(supabase, userId, dados);
}

// Função para efetivamente inserir no banco
async function cadastrarContaNoBanco(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  dados: DadosCadastroConta
): Promise<{ mensagem: string }> {
  
  const { descricao, valor, diaVencimento, tipo, parcelaAtual, totalParcelas, recorrencia } = dados;
  
  if (!descricao || !diaVencimento) {
    return { mensagem: '❌ Dados incompletos. Tente novamente.' };
  }
  
  // Calcular due_date
  const hoje = new Date();
  let dueDate = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
  
  if (dueDate < hoje) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  
  // Mapear tipo para bill_type do banco
  const BILL_TYPE_DB_MAP: Record<BillType, string> = {
    'fixed': 'service',
    'variable': 'service',
    'subscription': 'subscription',
    'installment': 'loan',
    'one_time': 'other',
    'credit_card': 'credit_card',
    'unknown': 'other'
  };
  
  const billTypeDb = BILL_TYPE_DB_MAP[tipo || 'unknown'];
  const isRecurring = recorrencia === 'mensal' || tipo === 'fixed' || tipo === 'subscription' || tipo === 'variable';
  const isInstallment = tipo === 'installment';
  
  const { error } = await supabase
    .from('payable_bills')
    .insert({
      user_id: userId,
      description: descricao,
      amount: valor || null,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      is_recurring: isRecurring && !isInstallment,
      bill_type: billTypeDb,
      recurrence_config: isRecurring && !isInstallment ? { type: 'monthly', day: diaVencimento } : null,
      is_installment: isInstallment,
      installment_number: parcelaAtual || null,
      installment_total: totalParcelas || null,
    });
  
  if (error) {
    console.error('[CADASTRAR-CONTA] Erro ao inserir:', error);
    return { mensagem: '❌ Erro ao cadastrar conta. Tente novamente.' };
  }
  
  // Template de sucesso
  const emoji = getEmojiConta(descricao);
  let msg = `✅ *Conta cadastrada!*\n\n`;
  msg += `${emoji} *${descricao}*\n`;
  
  if (valor) {
    msg += `💰 R$ ${valor.toFixed(2).replace('.', ',')}\n`;
  } else if (tipo === 'variable') {
    msg += `💰 Valor variável _(informe quando chegar)_\n`;
  }
  
  msg += `📅 Vence dia ${diaVencimento}\n`;
  
  if (isInstallment && parcelaAtual && totalParcelas) {
    msg += `🔢 Parcela ${parcelaAtual} de ${totalParcelas}\n`;
  } else if (isRecurring) {
    msg += `🔄 Recorrente mensal\n`;
  }
  
  msg += `\n🔔 _Vou te lembrar 1 dia antes!_`;
  
  return { mensagem: msg };
}

// ============================================
// FASE 3.2: EDITAR CONTA
// ============================================

async function processarEdicaoConta(
  userId: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string }> {
  const supabase = getSupabase();
  
  // Extrair do NLP ou do texto original
  let nomeConta = entidades.conta as string || entidades.nome_conta as string || entidades.descricao as string || '';
  let campo = entidades.campo as string || '';
  let novoValor = entidades.novo_valor || entidades.valor;
  
  // Fallback: extrair do comando original se NLP não extraiu
  const comandoOriginal = (entidades.comando_original as string || '').toLowerCase();
  
  if (!nomeConta && comandoOriginal) {
    // Tentar extrair nome da conta do texto
    for (const [tipo, aliases] of Object.entries(CONTA_ALIASES)) {
      if (aliases.some(alias => comandoOriginal.includes(alias))) {
        nomeConta = tipo;
        break;
      }
    }
  }
  
  if (!novoValor && comandoOriginal) {
    // Extrair valor do texto: "para 175", "para R$175", "de 150 para 175"
    const valorMatch = comandoOriginal.match(/para\s*r?\$?\s*(\d+(?:[.,]\d+)?)/i);
    if (valorMatch) {
      novoValor = parseFloat(valorMatch[1].replace(',', '.'));
      campo = 'valor'; // Se tem "para X", é edição de valor
    }
  }
  
  if (!campo && comandoOriginal) {
    // Detectar campo pelo contexto
    if (comandoOriginal.includes('valor') || comandoOriginal.includes('preço') || comandoOriginal.includes('custo')) {
      campo = 'valor';
    } else if (comandoOriginal.includes('dia') || comandoOriginal.includes('vencimento')) {
      campo = 'dia';
    } else if (comandoOriginal.includes('nome') || comandoOriginal.includes('renomear')) {
      campo = 'nome';
    }
  }
  
  console.log('[EDITAR-CONTA] Entidades extraídas:', { nomeConta, campo, novoValor, comandoOriginal });
  
  if (!nomeConta) {
    return { mensagem: `❓ Qual conta você quer editar?\n\n💡 Exemplo:\n_"mudar valor da luz para 180"_` };
  }
  
  // Buscar conta
  const conta = await buscarContaPorNome(userId, nomeConta);
  
  if (!conta) {
    return { mensagem: `❌ Conta "${nomeConta}" não encontrada.\n\n💡 Use _"contas a pagar"_ para ver suas contas.` };
  }
  
  // Determinar campo a editar
  let campoDb = '';
  let valorAntigo: any = '';
  let valorNovo: any = novoValor;
  
  if (campo.includes('valor') || typeof novoValor === 'number') {
    campoDb = 'amount';
    valorAntigo = formatarMoeda(conta.amount);
    valorNovo = typeof novoValor === 'number' ? novoValor : parseFloat(String(novoValor));
  } else if (campo.includes('dia')) {
    campoDb = 'due_date';
    valorAntigo = `dia ${new Date(conta.due_date).getDate()}`;
    const novoDia = parseInt(String(novoValor));
    const novaData = new Date(conta.due_date);
    novaData.setDate(novoDia);
    valorNovo = novaData.toISOString().split('T')[0];
  } else if (campo.includes('nome')) {
    campoDb = 'description';
    valorAntigo = conta.description;
    valorNovo = normalizarNomeConta(String(novoValor));
  }
  
  if (!campoDb) {
    return { mensagem: `❓ O que você quer alterar?\n\n💡 Exemplos:\n_"mudar valor da luz para 180"_\n_"alterar dia da internet para 10"_` };
  }
  
  // Atualizar
  const { error } = await supabase
    .from('payable_bills')
    .update({ [campoDb]: valorNovo })
    .eq('id', conta.id);
  
  if (error) {
    console.error('Erro ao editar conta:', error);
    return { mensagem: `❌ Erro ao editar conta. Tente novamente.` };
  }
  
  const emoji = getEmojiConta(conta.description);
  const campoExibicao = campoDb === 'amount' ? 'Valor' : campoDb === 'due_date' ? 'Vencimento' : 'Nome';
  const valorNovoExibicao = campoDb === 'amount' ? formatarMoeda(valorNovo) : campoDb === 'due_date' ? `dia ${new Date(valorNovo).getDate()}` : valorNovo;
  
  return {
    mensagem: `✅ *Conta atualizada!*\n\n${emoji} *${conta.description}*\n📝 ${campoExibicao}: ${valorAntigo} → *${valorNovoExibicao}*`
  };
}

// ============================================
// FASE 3.2: EXCLUIR CONTA
// ============================================

async function processarExclusaoConta(
  userId: string,
  phone: string,
  entidades: Record<string, unknown>
): Promise<{ mensagem: string; precisaConfirmacao?: boolean; dados?: Record<string, unknown> }> {
  const nomeConta = entidades.conta as string || entidades.nome_conta as string || '';
  
  if (!nomeConta) {
    return { mensagem: `❓ Qual conta você quer excluir?\n\n💡 Exemplo:\n_"excluir conta de netflix"_` };
  }
  
  // Buscar conta
  const conta = await buscarContaPorNome(userId, nomeConta);
  
  if (!conta) {
    return { mensagem: `❌ Conta "${nomeConta}" não encontrada.\n\n💡 Use _"contas a pagar"_ para ver suas contas.` };
  }
  
  // Pedir confirmação
  return {
    mensagem: templateConfirmarExclusao(conta),
    precisaConfirmacao: true,
    dados: {
      step: 'awaiting_delete_confirmation',
      conta_id: conta.id,
      conta_nome: conta.description,
      phone
    }
  };
}

// ============================================
// FASE 3.2: BUSCAR CONTA POR NOME
// ============================================

export async function buscarContaPorNome(userId: string, nome: string): Promise<ContaPagar | null> {
  const supabase = getSupabase();
  const nomeNormalizado = normalizarNomeConta(nome).toLowerCase();
  
  // Buscar todas as contas do usuário
  const { data: contas } = await supabase
    .from('payable_bills')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['pending', 'overdue']);
  
  if (!contas || contas.length === 0) return null;
  
  // Buscar por match exato ou parcial
  const contaEncontrada = contas.find((c: any) => {
    const descLower = c.description.toLowerCase();
    return descLower === nomeNormalizado || 
           descLower.includes(nomeNormalizado) ||
           nomeNormalizado.includes(descLower);
  });
  
  return contaEncontrada || null;
}

// ============================================
// FASE 3.2: EXECUTAR EXCLUSÃO
// ============================================

export async function executarExclusaoConta(userId: string, contaId: string): Promise<{ sucesso: boolean; mensagem: string }> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('payable_bills')
    .delete()
    .eq('id', contaId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Erro ao excluir conta:', error);
    return { sucesso: false, mensagem: `❌ Erro ao excluir conta. Tente novamente.` };
  }
  
  return { sucesso: true, mensagem: '' };
}

// ============================================
// FASE 3.2: TEMPLATES
// ============================================

function templateContaCadastrada(dados: {
  descricao: string;
  emoji: string;
  valor?: number;
  diaVencimento: number;
  recorrente: boolean;
  variavel: boolean;
  parcelas?: number;
}): string {
  const valorStr = dados.variavel 
    ? '💰 Valor variável _(informar ao pagar)_' 
    : `💰 ${formatarMoeda(dados.valor || 0)}`;
  
  const recorrenciaStr = dados.parcelas 
    ? `🔢 Parcela 1/${dados.parcelas}`
    : dados.recorrente 
      ? '🔄 Recorrente mensal' 
      : '📌 Pagamento único';
  
  let msg = `✅ *Conta cadastrada!*\n\n`;
  msg += `${dados.emoji} *${dados.descricao}*\n`;
  msg += `${valorStr}\n`;
  msg += `📅 Vence dia ${dados.diaVencimento}\n`;
  msg += `${recorrenciaStr}\n`;
  msg += `\n🔔 _Vou te lembrar 1 dia antes!_`;
  
  if (dados.variavel) {
    msg += `\n\n💡 Quando chegar a conta:\n_"${dados.descricao.toLowerCase()} veio 185"_`;
  }
  
  return msg;
}

function templatePerguntarDiaVencimento(descricao: string): string {
  const emoji = getEmojiConta(descricao);
  return `${emoji} *${descricao}*\n\n📅 Qual o *dia do vencimento*? (1-31)`;
}

function templatePerguntarValor(descricao: string, recorrente?: boolean): string {
  const emoji = getEmojiConta(descricao);
  const recorrenteStr = recorrente ? ' (todo mês)' : '';
  return `📝 Entendi! Vou cadastrar sua conta de *${descricao}*${recorrenteStr}.\n\n${emoji} 💰 Qual é o *valor* dessa conta?\n\n_Pode ser um valor aproximado._`;
}

function templateContaDuplicada(conta: ContaPagar, novoValor?: number): string {
  const emoji = getEmojiConta(conta.description);
  const valorAtual = conta.amount ? formatarMoeda(conta.amount) : 'Variável';
  const diaVenc = new Date(conta.due_date).getDate();
  
  let msg = `⚠️ Você já tem uma conta de *${conta.description}* cadastrada!\n\n`;
  msg += `${emoji} *${conta.description}*\n`;
  msg += `📅 Vence dia ${diaVenc}\n`;
  msg += `💰 ${valorAtual}\n\n`;
  
  if (novoValor) {
    msg += `Deseja atualizar o valor para ${formatarMoeda(novoValor)}?\n\n`;
  } else {
    msg += `O que deseja fazer?\n\n`;
  }
  
  msg += `1️⃣ ${novoValor ? 'Sim, atualizar valor' : 'Editar esta conta'}\n`;
  msg += `2️⃣ Manter como está\n`;
  msg += `3️⃣ Criar nova conta separada`;
  
  return msg;
}

function templateConfirmarExclusao(conta: ContaPagar): string {
  const emoji = getEmojiConta(conta.description);
  const valorStr = conta.amount ? formatarMoeda(conta.amount) : 'Variável';
  const diaVenc = new Date(conta.due_date).getDate();
  
  let msg = `⚠️ *Confirmar exclusão?*\n\n`;
  msg += `${emoji} *${conta.description}*\n`;
  msg += `💰 ${valorStr}\n`;
  msg += `📅 Dia ${diaVenc}\n\n`;
  msg += `Digite *SIM* para confirmar ou *NÃO* para cancelar.`;
  
  return msg;
}

export function templateContaExcluida(nome: string): string {
  return `✅ Conta de *${nome}* excluída com sucesso!`;
}
