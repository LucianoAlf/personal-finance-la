// ============================================
// CONTEXT-MANAGER.TS - Gerenciamento de Contexto
// Modularização v2.0 - Dezembro 2025
// ============================================
// 
// Estrutura da tabela conversation_context:
// - context_type: 'idle' | 'editing_transaction' | 'creating_transaction' | 'confirming_action' | 'multi_step_flow'
// - context_data: JSONB com dados do contexto
// - last_interaction: timestamp
// - expires_at: timestamp
// 
// ============================================

import { getSupabase, getEmojiBanco, todayBrasilia } from './utils.ts';
import {
  buildWhatsAppSuitabilityFacts,
  type InvestorSuitabilityWhatsAppFacts,
} from '../_shared/education-profile.ts';
import {
  fetchEducationMentoringWhatsAppFacts,
  type EducationMentoringWhatsAppFacts,
} from '../_shared/education-renderers.ts';
import { enviarConfirmacaoComBotoes } from './button-sender.ts';
import type { IntencaoClassificada } from './nlp-processor.ts';
import { templateTransacaoRegistrada } from './response-templates.ts';
import {
  templateAccountsDiagnosticClarifyingQuestion,
  templateAccountsSafeActionDecline,
  templateAccountsSafeActionDefer,
} from './accounts-response-templates.ts';
import { 
  processarRespostaContasAmbiguo, 
  listarContasPagar,
  buscarContaPorNome,
  executarExclusaoConta,
  templateContaExcluida,
  normalizarNomeConta,
  getEmojiConta
} from './contas-pagar.ts';
import { consultarSaldo, listarContas } from './command-handlers.ts';
import {
  BANCO_CONFIGS,
  detectarBancoPorAlias,
  detectarPagamentoPorAlias,
  CONTEXT_TIMEOUT_MINUTES as MAPPINGS_TIMEOUT
} from '../shared/mappings.ts';
import { shouldStayInCreditCardContext } from '../shared/context-detector.ts';
import { resolveCanonicalCategory } from '../_shared/canonical-categorization.ts';
import {
  buildSafeActionPreviewFromDiagnosticContext,
  continueAccountsDiagnosticConversation,
  detectDiagnosticDeferReply,
  detectDiagnosticInterestReply,
  detectDiagnosticTargetSelectionReply,
  detectDiagnosticTopicShift,
  extractResolvedSafeActionFieldsFromDiagnosticReply,
  startAccountsDiagnosticConversation,
  type AccountsDiagnosticContextData,
} from './accounts-diagnostic-conversations.ts';
import {
  parseSafeActionConfirmation,
  type PendingAccountsSafeAction,
} from './accounts-safe-actions.ts';
import { executePendingAccountsSafeAction } from './accounts-safe-action-executor.ts';

// TTL do contexto: 60 minutos (1 hora)
// Aumentado de 15min para evitar perda de contexto quando usuário demora a responder
const CONTEXT_EXPIRATION_MINUTES = 60;
const ACCOUNTS_SAFE_ACTION_PREVIEW_TTL_MINUTES = 15;

function buildAccountsSafeActionPreviewExpiresAt(nowIso: string): string {
  const expiresAt = new Date(nowIso);
  expiresAt.setMinutes(expiresAt.getMinutes() + ACCOUNTS_SAFE_ACTION_PREVIEW_TTL_MINUTES);
  return expiresAt.toISOString();
}

function getSafeActionConfirmationSource(
  text: string,
): NonNullable<PendingAccountsSafeAction['confirmationSource']> {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

  return normalized === 'sim' ? 'explicit_yes' : 'explicit_confirm_phrase';
}

type AwaitingAccountsSafeActionConfirmDeps = {
  limparContexto: typeof limparContexto;
  salvarContexto: typeof salvarContexto;
  executePendingAccountsSafeAction: typeof executePendingAccountsSafeAction;
  getSupabase: typeof getSupabase;
  now?: () => string;
};

export async function handleAwaitingAccountsSafeActionConfirmReply(params: {
  texto: string;
  contexto: ContextoConversa;
  userId: string;
  phone: string;
  deps?: Partial<AwaitingAccountsSafeActionConfirmDeps>;
}): Promise<string> {
  const deps: AwaitingAccountsSafeActionConfirmDeps = {
    limparContexto,
    salvarContexto,
    executePendingAccountsSafeAction,
    getSupabase,
    now: () => new Date().toISOString(),
    ...params.deps,
  };
  const { texto, contexto, userId, phone } = params;

  if (detectDiagnosticTopicShift(texto)) {
    await deps.limparContexto(userId);
    return '';
  }

  const pending = contexto.context_data as PendingAccountsSafeAction;
  const parsed = parseSafeActionConfirmation(texto);

  if (parsed.kind === 'decline') {
    await deps.limparContexto(userId);
    return templateAccountsSafeActionDecline();
  }

  if (parsed.kind === 'defer') {
    await deps.limparContexto(userId);
    return templateAccountsSafeActionDefer();
  }

  if (parsed.kind !== 'confirm') {
    await deps.salvarContexto(userId, 'awaiting_accounts_safe_action_confirm', {
      ...pending,
      phone,
      clarificationRequestedAt: deps.now(),
    }, phone);
    return templateAccountsDiagnosticClarifyingQuestion(
      'voce quer que eu aplique essa alteracao, prefere deixar para depois, ou quer cancelar?',
    );
  }

  const confirmedAt = deps.now();
  const result = await deps.executePendingAccountsSafeAction(
    deps.getSupabase(),
    {
      ...pending,
      confirmationSource: getSafeActionConfirmationSource(texto),
      confirmationText: texto,
      confirmedAt,
    },
    {
      userId,
      now: confirmedAt,
    },
  );

  await deps.limparContexto(userId);
  return result.message;
}

// Tipos do contexto
export type ContextType = 
  | 'idle' 
  | 'editing_transaction' 
  | 'creating_transaction' 
  | 'confirming_action' 
  | 'multi_step_flow' 
  | 'awaiting_account_type_selection'
  | 'awaiting_register_account_type' // Cadastrar: conta bancária ou conta a pagar?
  // FASE 3.2 - Cadastro de contas (Sistema Robusto)
  | 'awaiting_bill_type'            // Aguardando tipo de conta (fixa, variável, etc)
  | 'awaiting_bill_description'     // Aguardando descrição da conta
  | 'awaiting_due_day'              // Aguardando dia do vencimento
  | 'awaiting_bill_amount'          // Aguardando valor da conta
  | 'awaiting_installment_info'     // Aguardando info de parcelas
  | 'awaiting_average_value'        // Aguardando valor médio de conta variável
  | 'awaiting_duplicate_decision'   // Aguardando decisão sobre duplicata
  | 'awaiting_delete_confirmation'  // Aguardando confirmação de exclusão
  // FASE 3.3 - Faturas de Cartão de Crédito
  | 'awaiting_invoice_due_date'     // Aguardando dia de vencimento da fatura
  | 'awaiting_invoice_amount'       // Aguardando valor da fatura
  | 'awaiting_card_selection'       // Aguardando seleção de cartão
  | 'awaiting_card_creation_confirmation' // Aguardando confirmação para criar cartão
  | 'awaiting_card_limit'           // Aguardando limite do cartão
  // FASE 3.4 - Parcelamentos com método de pagamento
  | 'awaiting_installment_payment_method'  // Aguardando: cartão ou boleto?
  | 'awaiting_installment_card_selection'  // Aguardando seleção de cartão para parcelamento
  // Contexto de transação registrada (para "exclui essa", "era X")
  | 'transaction_registered'               // Transação acabou de ser registrada
  // FASE 3.3 - Registro de Pagamentos
  | 'awaiting_payment_value'               // Aguardando valor do pagamento (conta variável)
  | 'awaiting_bill_name_for_payment'       // Aguardando nome da conta para marcar como paga
  | 'awaiting_payment_account'             // Aguardando conta bancária de onde sai o pagamento
  | 'awaiting_accounts_safe_action_confirm' // Aguardando confirmação de ação segura em contas
  // Contexto de ações rápidas de cartão
  | 'credit_card_context'                  // Contexto de cartão para ações rápidas
  // Contexto de referência para faturas vencidas
  | 'faturas_vencidas_context'            // Contexto de faturas vencidas para follow-ups
  | 'accounts_diagnostic_context'         // Contexto de conversa diagnóstica de contas
  // Onboarding do agente
  | 'onboarding_agent'                   // Fluxo de onboarding (nome, tom, preferências)
  // Sessão curta no WhatsApp (grupo) — não entra na prioridade de fluxos do DM em buscarContexto
  | 'ana_clara_group_session'
  // Confirmação antes de criar compromisso na agenda (sim/não, estilo Mike)
  | 'awaiting_calendar_create_confirm';

export interface ContextData {
  intencao_pendente?: IntencaoClassificada;
  transacao_id?: string;
  transacao_tipo?: 'transaction' | 'credit_card_transaction';
  step?: string; // 'awaiting_account', 'awaiting_category', 'awaiting_value', etc.
  phone?: string;
  current_data?: Record<string, unknown>;
  /** Deterministic suitability snapshot for flows that read conversation_context. */
  investor_suitability?: InvestorSuitabilityWhatsAppFacts;
  /** Auditable education mentoring snapshot (refreshed on context load; not a hidden prompt state). */
  education_mentoring?: EducationMentoringWhatsAppFacts;
  [key: string]: unknown;
}

export interface ContextoConversa {
  id: string;
  user_id: string;
  phone: string;
  context_type: ContextType;
  context_data: ContextData;
  last_interaction: string;
  expires_at: string;
}

// ============================================
// CALCULAR DATA DE VENCIMENTO
// ============================================

/**
 * Converte diaVencimento (número ou string) para data ISO (YYYY-MM-DD)
 * Suporta: 15, "15", "15/03", "15/03/2026", "15 de março"
 */
function calcularDataVencimento(diaVencimento: number | string): Date | null {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  
  const diaStr = String(diaVencimento).trim();
  console.log(`[DATA] Convertendo: "${diaStr}" (tipo: ${typeof diaVencimento})`);
  
  // Caso 1: Número simples (dia do mês) - 15, "15", "5"
  if (/^\d{1,2}$/.test(diaStr)) {
    const dia = parseInt(diaStr);
    if (dia < 1 || dia > 31) {
      console.error(`[DATA] Dia inválido: ${dia}`);
      return null;
    }
    
    let data = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
    // Se já passou, vai para o próximo mês
    if (data <= hoje) {
      data.setMonth(data.getMonth() + 1);
    }
    
    console.log(`[DATA] Dia simples: ${dia} → ${data.toISOString().split('T')[0]}`);
    return data;
  }
  
  // Caso 2: Formato DD/MM (dia/mês) - "15/03", "5/1"
  const matchDDMM = diaStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})$/);
  if (matchDDMM) {
    const dia = parseInt(matchDDMM[1]);
    const mes = parseInt(matchDDMM[2]) - 1; // JavaScript meses são 0-indexed
    
    if (dia < 1 || dia > 31 || mes < 0 || mes > 11) {
      console.error(`[DATA] Data inválida: dia=${dia}, mes=${mes + 1}`);
      return null;
    }
    
    let ano = hoje.getFullYear();
    let data = new Date(ano, mes, dia);
    
    // Se a data já passou este ano, vai para o próximo ano
    if (data <= hoje) {
      ano += 1;
      data = new Date(ano, mes, dia);
    }
    
    console.log(`[DATA] DD/MM: ${dia}/${mes + 1} → ${data.toISOString().split('T')[0]}`);
    return data;
  }
  
  // Caso 3: Formato DD/MM/YYYY ou DD/MM/YY - "15/03/2026", "15/03/26"
  const matchDDMMYYYY = diaStr.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (matchDDMMYYYY) {
    const dia = parseInt(matchDDMMYYYY[1]);
    const mes = parseInt(matchDDMMYYYY[2]) - 1;
    let ano = parseInt(matchDDMMYYYY[3]);
    
    // Converter ano de 2 dígitos para 4
    if (ano < 100) {
      ano += 2000;
    }
    
    const data = new Date(ano, mes, dia);
    console.log(`[DATA] DD/MM/YYYY: ${dia}/${mes + 1}/${ano} → ${data.toISOString().split('T')[0]}`);
    return data;
  }
  
  // Fallback: formato não reconhecido
  console.error(`[DATA] Formato não reconhecido: "${diaStr}"`);
  return null;
}

// ============================================
// BUSCAR CONTEXTO
// ============================================

// Contextos de fluxo (multi-step) têm prioridade sobre contextos de referência
const FLOW_CONTEXT_TYPES: ContextType[] = [
  'creating_transaction',
  'editing_transaction',
  'confirming_action',
  'multi_step_flow',
  'awaiting_account_type_selection',
  'awaiting_register_account_type',
  'awaiting_bill_type',
  'awaiting_bill_description',
  'awaiting_due_day',
  'awaiting_bill_amount',
  'awaiting_installment_info',
  'awaiting_average_value',
  'awaiting_duplicate_decision',
  'awaiting_delete_confirmation',
  'awaiting_invoice_due_date',
  'awaiting_invoice_amount',
  'awaiting_card_selection',
  'awaiting_card_creation_confirmation',
  'awaiting_card_limit',
  'awaiting_installment_payment_method',
  'awaiting_installment_card_selection',
  'awaiting_payment_value',
  'awaiting_bill_name_for_payment',
  'awaiting_payment_account',
  'accounts_diagnostic_context',
  'awaiting_accounts_safe_action_confirm',
  'awaiting_calendar_create_confirm',
];

// Contextos de referência (memória) - usados para inferir contexto em follow-ups
const REFERENCE_CONTEXT_TYPES: ContextType[] = [
  'credit_card_context',
  'faturas_vencidas_context'
];

export async function fetchInvestorSuitabilityForContext(
  userId: string,
): Promise<InvestorSuitabilityWhatsAppFacts> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('investor_profile_assessments')
    .select('profile_key, confidence, effective_at, explanation, questionnaire_version, answers')
    .eq('user_id', userId)
    .order('effective_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.log('⚠️ investor_profile_assessments fetch failed:', error.message);
    return buildWhatsAppSuitabilityFacts(null);
  }

  return buildWhatsAppSuitabilityFacts(data);
}

export function enrichContextoComInvestorSuitability(
  contexto: ContextoConversa,
  facts: InvestorSuitabilityWhatsAppFacts,
): ContextoConversa {
  return {
    ...contexto,
    context_data: {
      ...contexto.context_data,
      investor_suitability: facts,
    },
  };
}

export async function fetchEducationMentoringForContext(userId: string): Promise<EducationMentoringWhatsAppFacts> {
  const supabase = getSupabase();
  return fetchEducationMentoringWhatsAppFacts(supabase, userId);
}

export function enrichContextoComEducationMentoring(
  contexto: ContextoConversa,
  facts: EducationMentoringWhatsAppFacts,
): ContextoConversa {
  return {
    ...contexto,
    context_data: {
      ...contexto.context_data,
      education_mentoring: facts,
    },
  };
}

export async function buscarContexto(userId: string): Promise<ContextoConversa | null> {
  const supabase = getSupabase();
  
  // Buscar TODOS os contextos ativos do usuário
  const { data, error } = await supabase
    .from('conversation_context')
    .select('*')
    .eq('user_id', userId)
    .neq('context_type', 'ana_clara_group_session')
    .gt('expires_at', new Date().toISOString())
    .order('last_interaction', { ascending: false });
  
  if (error || !data || data.length === 0) {
    console.log('📭 Nenhum contexto ativo para usuário:', userId);
    return null;
  }
  
  console.log('📬 Contextos encontrados:', data.map(c => c.context_type).join(', '));
  
  // Priorizar contextos de FLUXO (multi-step) sobre contextos de REFERÊNCIA
  const flowContext = data.find(c => FLOW_CONTEXT_TYPES.includes(c.context_type as ContextType));
  if (flowContext) {
    console.log('🔄 Usando contexto de FLUXO:', flowContext.context_type);
    const suitabilityFacts = await fetchInvestorSuitabilityForContext(userId);
    const educationFacts = await fetchEducationMentoringForContext(userId);
    return enrichContextoComEducationMentoring(
      enrichContextoComInvestorSuitability(flowContext as ContextoConversa, suitabilityFacts),
      educationFacts,
    );
  }
  
  // Se não há contexto de fluxo, retornar o mais recente (provavelmente referência)
  console.log('📝 Usando contexto de REFERÊNCIA:', data[0].context_type);
  const suitabilityFacts = await fetchInvestorSuitabilityForContext(userId);
  const educationFacts = await fetchEducationMentoringForContext(userId);
  return enrichContextoComEducationMentoring(
    enrichContextoComInvestorSuitability(data[0] as ContextoConversa, suitabilityFacts),
    educationFacts,
  );
}

// ============================================
// SALVAR CONTEXTO
// ============================================

export async function salvarContexto(
  userId: string,
  contextType: ContextType,
  contextData: ContextData,
  phone?: string,
  options?: { expirationMinutes?: number },
): Promise<void> {
  const supabase = getSupabase();
  
  const expiresAt = new Date();
  const ttl = options?.expirationMinutes ?? CONTEXT_EXPIRATION_MINUTES;
  expiresAt.setMinutes(expiresAt.getMinutes() + ttl);
  
  const phoneValue = phone || contextData.phone || '';
  
  console.log('💾 Salvando contexto:', { userId, contextType, phoneValue, step: contextData.step });
  
  // UPSERT: Atualiza se existir, insere se não existir
  // A constraint unique é (user_id, phone, context_type)
  const { data, error } = await supabase.from('conversation_context').upsert({
    user_id: userId,
    phone: phoneValue,
    context_type: contextType,
    context_data: contextData,
    last_interaction: new Date().toISOString(),
    expires_at: expiresAt.toISOString()
  }, {
    onConflict: 'user_id,phone,context_type'
  }).select().single();
  
  if (error) {
    console.error('❌ Erro ao salvar contexto:', JSON.stringify(error));
    throw error;
  }
  
  console.log('✅ Contexto salvo com sucesso:', data?.id, '| Type:', contextType, '| Step:', contextData.step);
}

// ============================================
// LIMPAR CONTEXTO
// ============================================

export async function limparContexto(userId: string): Promise<void> {
  const supabase = getSupabase();
  
  const { error } = await supabase
    .from('conversation_context')
    .delete()
    .eq('user_id', userId);
  
  if (error) {
    console.error('❌ Erro ao limpar contexto:', error);
  } else {
    console.log('🧹 Contexto limpo para usuário:', userId);
  }
}

// ============================================
// VERIFICAR CONTEXTO ATIVO
// ============================================

export function isContextoAtivo(contexto: ContextoConversa | null): boolean {
  if (!contexto) return false;
  return contexto.context_type !== 'idle';
}

// ============================================
// CONVERTER NÚMEROS POR EXTENSO
// ============================================

const NUMEROS_EXTENSO: Record<string, number> = {
  'zero': 0, 'um': 1, 'uma': 1, 'dois': 2, 'duas': 2, 'três': 3, 'tres': 3,
  'quatro': 4, 'cinco': 5, 'seis': 6, 'sete': 7, 'oito': 8, 'nove': 9,
  'dez': 10, 'onze': 11, 'doze': 12, 'treze': 13, 'quatorze': 14, 'catorze': 14,
  'quinze': 15, 'dezesseis': 16, 'dezessete': 17, 'dezoito': 18, 'dezenove': 19,
  'vinte': 20, 'trinta': 30, 'quarenta': 40, 'cinquenta': 50,
  'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90,
  'cem': 100, 'cento': 100, 'duzentos': 200, 'trezentos': 300,
  'quatrocentos': 400, 'quinhentos': 500, 'seiscentos': 600,
  'setecentos': 700, 'oitocentos': 800, 'novecentos': 900,
  'mil': 1000
};

function converterParteExtenso(texto: string): number {
  const palavras = texto.toLowerCase().split(/\s+e\s+|\s+/);
  let total = 0;
  let atual = 0;
  
  for (const palavra of palavras) {
    const valor = NUMEROS_EXTENSO[palavra];
    if (valor === undefined) continue;
    
    if (valor === 1000) {
      atual = atual === 0 ? 1000 : atual * 1000;
      total += atual;
      atual = 0;
    } else if (valor >= 100) {
      atual += valor;
    } else {
      atual += valor;
    }
  }
  
  return total + atual;
}

export function converterExtensoParaNumero(texto: string): number | null {
  const textoLower = texto.toLowerCase()
    .replace(/reais?/g, '')
    .replace(/centavos?/g, '')
    .replace(/r\$/g, '')
    .trim();
  
  // Verificar se já é número
  const numeroMatch = textoLower.match(/^(\d+(?:[.,]\d+)?)$/);
  if (numeroMatch) {
    return parseFloat(numeroMatch[1].replace(',', '.'));
  }
  
  // Verificar se tem número no texto
  const numeroNoTexto = textoLower.match(/(\d+(?:[.,]\d+)?)/);
  if (numeroNoTexto) {
    return parseFloat(numeroNoTexto[1].replace(',', '.'));
  }
  
  // "vinte e um e noventa" → separar parte inteira e centavos
  // Padrão: último "e [número < 100]" pode ser centavos
  const partes = textoLower.split(/\s+e\s+/);
  
  if (partes.length >= 2) {
    const ultimaParte = partes[partes.length - 1].trim();
    const valorUltima = converterParteExtenso(ultimaParte);
    
    // Se última parte é < 100 e parece ser centavos (contexto de dinheiro)
    if (valorUltima > 0 && valorUltima < 100) {
      const partesInteiras = partes.slice(0, -1).join(' e ');
      const parteInteira = converterParteExtenso(partesInteiras);
      
      // Se parte inteira é válida, assumir que última é centavos
      if (parteInteira > 0) {
        console.log(`[EXTENSO] "${texto}" → ${parteInteira} + ${valorUltima}/100 = ${parteInteira + valorUltima / 100}`);
        return parteInteira + (valorUltima / 100);
      }
    }
  }
  
  // Tentar converter tudo como parte inteira
  const valorTotal = converterParteExtenso(textoLower);
  
  if (valorTotal > 0) {
    console.log(`[EXTENSO] "${texto}" → ${valorTotal}`);
    return valorTotal;
  }
  
  return null;
}

// ============================================
// ATUALIZAR DADOS DO CONTEXTO
// ============================================

export async function atualizarContextData(
  userId: string, 
  dados: Record<string, unknown>
): Promise<void> {
  const supabase = getSupabase();
  const contexto = await buscarContexto(userId);
  
  if (!contexto) {
    console.log('⚠️ Nenhum contexto para atualizar');
    return;
  }
  
  const novosDados = {
    ...contexto.context_data,
    ...dados
  };
  
  await supabase
    .from('conversation_context')
    .update({ 
      context_data: novosDados,
      last_interaction: new Date().toISOString()
    })
    .eq('user_id', userId);
  
  console.log('📝 Context data atualizado');
}

// ============================================
// PROCESSAR MENSAGEM NO CONTEXTO
// ============================================

export async function processarNoContexto(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string | null> {
  const step = contexto.context_data?.step || '';
  const contextType = contexto.context_type;
  
  console.log('🔄 Processando no contexto:', contextType, '| Step:', step);
  
  const command = texto.toLowerCase().trim();
  
  // Cancelar em qualquer estado
  if (command === 'cancelar' || command === 'cancela' || command === 'sair') {
    await limparContexto(userId);
    return '👍 Ação cancelada. Como posso ajudar?';
  }
  
  // Processar baseado no context_type e step
  if (contextType === 'creating_transaction') {
    if (step === 'awaiting_account') {
      const resultado = await processarSelecaoConta(texto, contexto, userId, phone);
      return resultado; // Pode ser null se enviou botões
    }
    if (step === 'awaiting_category') {
      return await processarCategoria(texto, contexto, userId);
    }
    if (step === 'awaiting_value') {
      return await processarValor(texto, contexto, userId);
    }
    if (step === 'awaiting_description') {
      return await processarDescricao(texto, contexto, userId, phone);
    }
    if (step === 'awaiting_payment_method') {
      return await processarSelecaoMetodoPagamento(texto, contexto, userId, phone);
    }
    // ✅ BUG #21: Handler para seleção de conta em transferência
    if (step === 'awaiting_transfer_account') {
      return await processarSelecaoContaTransferencia(texto, contexto, userId, phone);
    }
  }
  
  if (contextType === 'editing_transaction') {
    return await processarEdicao(texto, contexto, userId);
  }
  
  if (contextType === 'confirming_action') {
    if (step === 'awaiting_delete_confirmation') {
      return await processarConfirmacaoExclusao(texto, contexto, userId);
    }
    if (step === 'awaiting_image_confirmation') {
      return await processarConfirmacaoImagem(texto, contexto, userId, phone);
    }
    if (step === 'awaiting_image_account') {
      return await processarSelecaoContaImagem(texto, contexto, userId, phone);
    }
    if (step === 'awaiting_card_selection') {
      return await processarSelecaoCartao(texto, contexto, userId);
    }
    if (step === 'awaiting_card_purchase_description') {
      return await processarDescricaoCompraCartao(texto, contexto, userId);
    }
    return await processarConfirmacao(texto, contexto, userId);
  }
  
  // Handler para desambiguação "minhas contas"
  if (contextType === 'awaiting_account_type_selection') {
    return await processarSelecaoTipoConta(texto, contexto, userId);
  }
  
  // Handler para desambiguação "cadastrar conta"
  if (contextType === 'awaiting_register_account_type') {
    return await processarSelecaoCadastrarConta(texto, contexto, userId);
  }
  
  // FASE 3.2: Handlers de cadastro de contas (Sistema Robusto)
  if (contextType === 'awaiting_bill_type') {
    return await processarTipoConta(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_bill_description') {
    return await processarDescricaoConta(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_due_day') {
    return await processarDiaVencimento(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_bill_amount') {
    return await processarValorConta(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_installment_info') {
    return await processarInfoParcelas(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_average_value') {
    return await processarValorMedio(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_duplicate_decision') {
    return await processarDecisaoDuplicata(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_delete_confirmation') {
    return await processarConfirmacaoExclusaoConta(texto, contexto, userId);
  }
  
  // FASE 3.3: Handlers de faturas de cartão de crédito
  if (contextType === 'awaiting_invoice_due_date') {
    return await processarDiaVencimentoFatura(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_invoice_amount') {
    return await processarValorFatura(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_card_selection') {
    return await processarSelecaoCartaoFatura(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_card_creation_confirmation') {
    return await processarConfirmacaoCriarCartao(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_card_limit') {
    return await processarLimiteCartao(texto, contexto, userId);
  }
  
  // FASE 3.4: Handlers de parcelamentos com método de pagamento
  if (contextType === 'awaiting_installment_payment_method') {
    return await processarMetodoPagamentoParcelamento(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_installment_card_selection') {
    return await processarSelecaoCartaoParcelamento(texto, contexto, userId);
  }
  
  // FASE 3.3: Handlers de registro de pagamentos
  if (contextType === 'awaiting_payment_value') {
    return await processarValorPagamento(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_bill_name_for_payment') {
    return await processarNomeContaPagamento(texto, contexto, userId);
  }
  
  if (contextType === 'awaiting_payment_account') {
    return await processarSelecaoContaPagamento(texto, contexto, userId);
  }
  
  // AÇÕES RÁPIDAS DE CARTÃO DE CRÉDITO
  if (contextType === 'credit_card_context') {
    if (!shouldStayInCreditCardContext(texto)) {
      console.log('[CARTAO-3CAMADAS] Contexto de referência liberado para fluxo normal:', texto);
      await limparContexto(userId);
      return '';
    }
    return await processarAcaoRapidaCartao(texto, contexto, userId);
  }

  if (contextType === 'accounts_diagnostic_context') {
    const diagnosticContext = contexto.context_data as AccountsDiagnosticContextData;
    const availableAnomalies = diagnosticContext.availableAnomalies ?? (diagnosticContext.anomaly ? [diagnosticContext.anomaly] : []);
    const command = texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    if (
      command.includes('analisa minhas contas') ||
      command.includes('tem algo errado nas contas') ||
      command.includes('faz um checkup') ||
      command.includes('faz um check-up')
    ) {
      await limparContexto(userId);
      return '';
    }

    if (diagnosticContext.diagnosisState === 'DIAGNOSIS_INVITED' || diagnosticContext.diagnosisState === 'OBSERVATION_SHOWN') {
      if (detectDiagnosticDeferReply(texto)) {
        await limparContexto(userId);
        return 'Perfeito.\n\nDeixo isso sinalizado aqui como um ponto que vale revisar depois.';
      }

      if (detectDiagnosticInterestReply(texto) || detectDiagnosticTargetSelectionReply(availableAnomalies, texto)) {
        const transition = startAccountsDiagnosticConversation({
          anomalies: availableAnomalies,
          source: diagnosticContext.source,
          userText: texto,
        });

        await salvarContexto(userId, 'accounts_diagnostic_context', transition.contextData, phone);
        return transition.message;
      }

      await limparContexto(userId);
      return '';
    }

    if (
      diagnosticContext.diagnosisState === 'DIAGNOSIS_CONCLUDED' ||
      diagnosticContext.diagnosisState === 'DIAGNOSIS_DEFERRED'
    ) {
      await limparContexto(userId);
      return '';
    }

    const transition = continueAccountsDiagnosticConversation(diagnosticContext, texto);
    if (transition.nextState === 'IDLE') {
      await limparContexto(userId);
      return '';
    }

    if (transition.nextState === 'DIAGNOSIS_CONCLUDED') {
      const nowIso = new Date().toISOString();
      const resolvedFields = extractResolvedSafeActionFieldsFromDiagnosticReply({
        context: transition.contextData,
        userText: texto,
        now: nowIso,
      });
      const safeAction = buildSafeActionPreviewFromDiagnosticContext({
        context: transition.contextData,
        resolvedFields,
        previewExpiresAt: buildAccountsSafeActionPreviewExpiresAt(nowIso),
      });

      if (safeAction) {
        await salvarContexto(userId, 'awaiting_accounts_safe_action_confirm', {
          ...safeAction,
          phone,
        }, phone);
        return `${transition.message}\n\n${safeAction.confirmationPrompt}`;
      }
    }

    await salvarContexto(userId, 'accounts_diagnostic_context', transition.contextData, phone);
    return transition.message;
  }

  if (contextType === 'awaiting_accounts_safe_action_confirm') {
    return await handleAwaitingAccountsSafeActionConfirmReply({
      texto,
      contexto,
      userId,
      phone,
    });
  }
  
  // ✅ CORREÇÃO BUG #5 e #9: Contexto transaction_registered não deve bloquear novos comandos
  // Este contexto é apenas para ações rápidas como "exclui essa", "era 95"
  // Qualquer outro comando deve ser processado normalmente pelo NLP
  // IMPORTANTE: Retornar '' (string vazia) para que o fluxo continue para o NLP
  if (contextType === 'transaction_registered') {
    console.log('[CONTEXT] transaction_registered detectado - limpando contexto para processar novo comando');
    await limparContexto(userId);
    return ''; // String vazia = continuar para o fluxo normal do NLP
  }
  
  await limparContexto(userId);
  return '❓ Não entendi. Vamos recomeçar?';
}

// ============================================
// HANDLERS DE CONTEXTO
// ============================================

// Mapeamento de nomes de meses para números (0-11)
const MESES_MAP: Record<string, number> = {
  'janeiro': 0, 'jan': 0,
  'fevereiro': 1, 'fev': 1,
  'marco': 2, 'mar': 2,
  'abril': 3, 'abr': 3,
  'maio': 4, 'mai': 4,
  'junho': 5, 'jun': 5,
  'julho': 6, 'jul': 6,
  'agosto': 7, 'ago': 7,
  'setembro': 8, 'set': 8,
  'outubro': 9, 'out': 9,
  'novembro': 10, 'nov': 10,
  'dezembro': 11, 'dez': 11
};

// Extrair mês de uma string
function extrairMesDaString(texto: string): number | null {
  const textoNorm = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const [nome, numero] of Object.entries(MESES_MAP)) {
    const nomeNorm = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (textoNorm.includes(nomeNorm)) {
      return numero;
    }
  }
  return null;
}

// Handler para ações rápidas de cartão de crédito
// ============================================
// ARQUITETURA DE 3 CAMADAS
// ============================================
export async function processarAcaoRapidaCartao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const { 
    listarComprasCartao, 
    compararMeses, 
    consultarGastoEspecifico, 
    consultarFatura,
    classificarIntencaoCartaoIA,
    validarCartaoExtraido,
    buscarCartaoFuzzy,
    buscarCategoriaFuzzy,
    buscarCartoesUsuario
  } = await import('./cartao-credito.ts');
  
  const cartaoIdContexto = contexto.context_data?.cartao_id as string | undefined;
  const cartaoNomeContexto = contexto.context_data?.cartao_nome as string | undefined;
  
  console.log('[CARTAO-3CAMADAS] ========================================');
  console.log('[CARTAO-3CAMADAS] Processando:', texto);
  console.log('[CARTAO-3CAMADAS] Cartão do contexto:', cartaoNomeContexto);
  console.log('[CARTAO-3CAMADAS] ========================================');
  
  // Buscar cartões do usuário para as 3 camadas
  const cartoesUsuario = await buscarCartoesUsuario(userId);
  console.log('[CARTAO-3CAMADAS] Cartões do usuário:', cartoesUsuario.map((c: any) => c.name));
  
  // ✅ CORREÇÃO BUG #8: Detectar quando usuário digita APENAS nome/alias de cartão
  // Nesse caso, assumir que quer ver a FATURA (não listar cartões novamente)
  const textoLimpo = texto.trim().toLowerCase();
  const fuzzyCheck = buscarCartaoFuzzy(texto, cartoesUsuario);
  
  // Se o texto é curto (≤15 chars) e corresponde a um cartão, ir direto para fatura
  if (textoLimpo.length <= 15 && fuzzyCheck.encontrado && fuzzyCheck.cartao) {
    // Verificar se não é um comando explícito
    const comandosExplicitos = ['fatura', 'limite', 'compras', 'comparar', 'quanto', 'gastei', 'cartoes', 'cartões', 'meus'];
    const ehComandoExplicito = comandosExplicitos.some(cmd => textoLimpo.includes(cmd));
    
    if (!ehComandoExplicito) {
      console.log('[CARTAO-3CAMADAS] ✅ Detectado nome/alias de cartão isolado:', texto, '→', fuzzyCheck.cartao.name);
      console.log('[CARTAO-3CAMADAS] Assumindo intenção: CONSULTAR_FATURA');
      
      // Ir direto para consulta de fatura sem passar pelo GPT-4
      const resposta = await consultarFatura(userId, fuzzyCheck.cartao.name, true, '', undefined);
      await limparContexto(userId);
      return resposta;
    }
  }
  
  // ============================================
  // CAMADA 1: GPT-4 INTELIGENTE
  // ============================================
  console.log('[CARTAO-3CAMADAS] CAMADA 1: Classificando com GPT-4...');
  
  const classificacao = await classificarIntencaoCartaoIA(texto, cartoesUsuario, userId);
  
  if (!classificacao || !classificacao.intencao) {
    console.log('[CARTAO-3CAMADAS] Camada 1 não identificou intenção');
    await limparContexto(userId);
    return `💳 *Ações disponíveis para ${cartaoNomeContexto}:*\n\n` +
      `• _"ver todas compras"_ - Lista completa\n` +
      `• _"compras de novembro"_ - Mês específico\n` +
      `• _"comparar meses"_ - Histórico\n` +
      `• _"quanto gastei de alimentação"_ - Gasto por categoria\n\n` +
      `💡 Ou digite qualquer outra coisa para uma nova consulta.`;
  }
  
  console.log('[CARTAO-3CAMADAS] Camada 1 retornou:', JSON.stringify(classificacao));
  
  // ============================================
  // CAMADA 2: VALIDAÇÃO ANTI-ALUCINAÇÃO
  // ============================================
  let cartaoFinal: { id: string; name: string } | null = null;
  
  // Se GPT-4 retornou um cartão, validar
  if (classificacao.cartao) {
    console.log('[CARTAO-3CAMADAS] CAMADA 2: Validando cartão:', classificacao.cartao);
    const validacao = validarCartaoExtraido(classificacao.cartao, cartoesUsuario);
    
    if (validacao.valido && validacao.cartaoExato) {
      console.log('[CARTAO-3CAMADAS] Camada 2 ✅ Validou:', validacao.cartaoExato.name);
      cartaoFinal = validacao.cartaoExato;
    } else {
      // ============================================
      // CAMADA 3: BUSCA FUZZY
      // ============================================
      console.log('[CARTAO-3CAMADAS] CAMADA 3: Busca fuzzy...');
      const fuzzy = buscarCartaoFuzzy(texto, cartoesUsuario);
      
      if (fuzzy.encontrado && fuzzy.cartao) {
        console.log('[CARTAO-3CAMADAS] Camada 3 ✅ Encontrou:', fuzzy.cartao.name, 'via', fuzzy.estrategia);
        cartaoFinal = fuzzy.cartao;
      }
    }
  } else {
    // GPT-4 não retornou cartão, usar contexto ou busca fuzzy
    if (cartaoIdContexto && cartaoNomeContexto) {
      console.log('[CARTAO-3CAMADAS] Usando cartão do contexto:', cartaoNomeContexto);
      cartaoFinal = { id: cartaoIdContexto, name: cartaoNomeContexto };
    } else {
      // Tentar busca fuzzy na mensagem
      console.log('[CARTAO-3CAMADAS] CAMADA 3: Busca fuzzy sem menção explícita...');
      const fuzzy = buscarCartaoFuzzy(texto, cartoesUsuario);
      
      if (fuzzy.encontrado && fuzzy.cartao) {
        console.log('[CARTAO-3CAMADAS] Camada 3 ✅ Encontrou:', fuzzy.cartao.name);
        cartaoFinal = fuzzy.cartao;
      } else if (cartoesUsuario.length === 1) {
        // Único cartão disponível
        cartaoFinal = cartoesUsuario[0];
        console.log('[CARTAO-3CAMADAS] Único cartão disponível:', cartaoFinal.name);
      }
    }
  }
  
  // Se ainda não tem cartão, perguntar ao usuário
  if (!cartaoFinal && cartoesUsuario.length > 1) {
    console.log('[CARTAO-3CAMADAS] Nenhum cartão identificado, perguntando ao usuário');
    let msg = `💳 *Qual cartão você quer consultar?*\n\n`;
    cartoesUsuario.forEach((c: any, i: number) => {
      msg += `${i + 1}. ${c.name}\n`;
    });
    msg += `\n_Responda com o número ou nome do cartão_`;
    return msg;
  }
  
  // Usar cartão do contexto como fallback final
  if (!cartaoFinal && cartaoIdContexto && cartaoNomeContexto) {
    cartaoFinal = { id: cartaoIdContexto, name: cartaoNomeContexto };
  }
  
  const cartaoNome = cartaoFinal?.name || cartaoNomeContexto;
  
  // ============================================
  // PROCESSAR TERMO (CATEGORIA) COM FUZZY
  // ============================================
  let termoFinal = classificacao.termo;
  if (termoFinal) {
    termoFinal = buscarCategoriaFuzzy(termoFinal);
    console.log('[CARTAO-3CAMADAS] Termo normalizado:', termoFinal);
  }
  
  // ============================================
  // EXECUTAR AÇÃO BASEADA NA INTENÇÃO
  // ============================================
  console.log('[CARTAO-3CAMADAS] Executando:', classificacao.intencao, '| Cartão:', cartaoNome, '| Termo:', termoFinal, '| Mês:', classificacao.mes, '| Período:', classificacao.periodo);
  
  switch (classificacao.intencao) {
    case 'listar_compras_cartao':
      return await listarComprasCartao(userId, cartaoNome, classificacao.mes ?? undefined, classificacao.periodo ?? undefined);
      
    case 'comparar_meses':
      return await compararMeses(userId, cartaoNome);
      
    case 'consulta_fatura':
      return await consultarFatura(userId, cartaoNome);
      
    case 'consulta_gasto_especifico':
      if (termoFinal) {
        return await consultarGastoEspecifico(userId, termoFinal, cartaoNome, classificacao.mes ?? undefined);
      }
      // Se não tem termo, perguntar
      return `💳 *${cartaoNome}*\n\n❓ Qual categoria ou estabelecimento você quer consultar?\n\n_Exemplos: alimentação, transporte, iFood, Uber_`;
      
    case 'consulta_limite':
      // ✅ FEATURE: Consulta de limite implementada
      const { consultarLimite } = await import('./cartao-credito.ts');
      return await consultarLimite(userId, cartaoNome);
      
    case 'listar_cartoes':
      let msg = `💳 *Seus Cartões de Crédito*\n\n`;
      cartoesUsuario.forEach((c: any, i: number) => {
        msg += `${i + 1}. ${c.name}\n`;
      });
      return msg;
      
    default:
      console.log('[CARTAO-3CAMADAS] Intenção não mapeada:', classificacao.intencao);
      await limparContexto(userId);
      return `💳 *Ações disponíveis para ${cartaoNome}:*\n\n` +
        `• _"ver todas compras"_ - Lista completa\n` +
        `• _"compras de novembro"_ - Mês específico\n` +
        `• _"comparar meses"_ - Histórico\n` +
        `• _"quanto gastei de alimentação"_ - Gasto por categoria\n\n` +
        `💡 Ou digite qualquer outra coisa para uma nova consulta.`;
  }
}

// Handler para desambiguação "minhas contas"
async function processarSelecaoTipoConta(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  console.log('🔄 [CONTAS] Processando seleção de tipo de conta:', texto);
  
  const escolha = processarRespostaContasAmbiguo(texto);
  
  if (escolha === 'bancarias') {
    // Usuário quer ver saldos bancários
    await limparContexto(userId);
    const saldos = await consultarSaldo(userId);
    return saldos;
  }
  
  if (escolha === 'pagar') {
    // Usuário quer ver contas a pagar
    await limparContexto(userId);
    const resultado = await listarContasPagar(userId);
    return resultado.mensagem;
  }
  
  // Não entendeu a resposta
  return `Não entendi. Por favor, digite:

1️⃣ ou *bancárias* → Ver saldos
2️⃣ ou *pagar* → Ver contas a pagar`;
}

async function processarConfirmacao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const command = texto.toLowerCase().trim();
  const transacaoId = contexto.context_data?.transacao_id;
  
  if (command === 'sim' || command === 's' || command === 'confirmar' || command === 'ok') {
    // Confirmar transação pendente
    if (transacaoId) {
      const supabase = getSupabase();
      await supabase
        .from('transactions')
        .update({ status: 'confirmed', is_paid: true })
        .eq('id', transacaoId);
      
      await limparContexto(userId);
      return '✅ Transação confirmada!';
    }
  }
  
  if (command === 'não' || command === 'nao' || command === 'n') {
    await limparContexto(userId);
    return '❌ Transação cancelada.';
  }
  
  return 'Digite *sim* para confirmar ou *não* para cancelar.';
}

async function processarValor(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  // Extrair valor numérico
  const valorMatch = texto.match(/(\d+[.,]?\d*)/);
  
  if (!valorMatch) {
    return '❌ Não consegui identificar o valor. Digite apenas o número (ex: 50 ou 50,00)';
  }
  
  const valor = parseFloat(valorMatch[1].replace(',', '.'));
  
  if (isNaN(valor) || valor <= 0) {
    return '❌ Valor inválido. Digite um número positivo.';
  }
  
  // Atualizar context_data com valor
  await atualizarContextData(userId, { valor });
  
  // Próximo passo: pedir conta
  await salvarContexto(userId, 'creating_transaction', {
    ...contexto.context_data,
    step: 'awaiting_account',
    valor
  });
  
  return `💰 Valor: R$ ${valor.toFixed(2).replace('.', ',')}\n\nEm qual conta?`;
}

async function processarSelecaoConta(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phoneFromCaller?: string
): Promise<string | null> {
  const supabase = getSupabase();
  
  // Buscar contas do usuário
  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, name, bank_name, type, icon')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  console.log('🏦 Contas encontradas:', accounts?.length, '| Erro:', accountsError?.message);
  
  if (!accounts || accounts.length === 0) {
    await limparContexto(userId);
    return '❌ Você não tem contas cadastradas. Cadastre uma conta no app primeiro.';
  }
  
  // Tentar encontrar conta pelo texto
  // Normalizar texto (remover acentos, pontuação, etc)
  const textoLower = texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[.,!?]/g, '') // Remove pontuação
    .trim();
  
  console.log('🔍 Texto normalizado para busca de conta:', textoLower);
  
  let contaSelecionada: typeof accounts[0] | null = null;
  
  // Primeiro, tentar por número
  const numeroMatch = texto.match(/^(\d+)$/);
  if (numeroMatch) {
    const index = parseInt(numeroMatch[1]) - 1;
    if (index >= 0 && index < accounts.length) {
      contaSelecionada = accounts[index];
    }
  }
  
  // Mapeamento de variações comuns de transcrição de áudio
  // IMPORTANTE: Ordenado do mais específico para o menos específico
  const variacoesBancos: Record<string, string[]> = {
    'itau': ['itau', 'itaú', 'ita', 'itauu', 'itaí'],
    'nubank': ['nubank', 'nuno bank', 'nuno benk', 'nu bank', 'roxinho', 'nubamk'],
    'bradesco': ['bradesco', 'brades', 'bradescoo'],
    'santander': ['santander', 'santan', 'santande'],
    'inter': ['inter', 'banco inter', 'inter bank'],
    'caixa': ['caixa', 'cef', 'caixa economica'],
    'bb': ['bb', 'banco do brasil', 'brasil'],
    'c6': ['c6', 'c6 bank', 'c 6'],
    'picpay': ['picpay', 'pic pay', 'pic'],
    'mercadopago': ['mercado pago', 'mercadopago', 'mp'],
  };
  
  console.log('🔍 Buscando conta para texto:', textoLower);
  console.log('🏦 Contas disponíveis:', accounts.map((a: any) => a.name).join(', '));
  
  // PRIMEIRO: Tentar match EXATO com variações (prioridade máxima)
  if (!contaSelecionada) {
    for (const [banco, variacoes] of Object.entries(variacoesBancos)) {
      // Verificar se o texto É exatamente uma das variações
      if (variacoes.includes(textoLower)) {
        // Encontrar a conta que corresponde a esse banco
        for (const account of accounts) {
          const accountNameLower = account.name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (accountNameLower.includes(banco)) {
            contaSelecionada = account;
            console.log('✅ Match EXATO por variação:', textoLower, '→', account.name);
            break;
          }
        }
        if (contaSelecionada) break;
      }
    }
  }
  
  // SEGUNDO: Tentar match direto no nome da conta
  if (!contaSelecionada) {
    for (const account of accounts) {
      const accountNameLower = account.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const bankNameLower = (account.bank_name || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Match direto - texto é igual ao nome da conta
      if (textoLower === accountNameLower || textoLower === bankNameLower) {
        contaSelecionada = account;
        console.log('✅ Match direto EXATO:', account.name);
        break;
      }
    }
  }
  
  // TERCEIRO: Tentar match parcial (texto contém nome da conta)
  if (!contaSelecionada) {
    for (const account of accounts) {
      const accountNameLower = account.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const bankNameLower = (account.bank_name || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      if (textoLower.includes(accountNameLower) || textoLower.includes(bankNameLower)) {
        contaSelecionada = account;
        console.log('✅ Match parcial encontrado:', account.name);
        break;
      }
    }
  }
  
  // QUARTO: Tentar match por variações (texto contém variação)
  if (!contaSelecionada) {
    for (const [banco, variacoes] of Object.entries(variacoesBancos)) {
      for (const variacao of variacoes) {
        if (textoLower.includes(variacao)) {
          // Encontrar a conta que corresponde a esse banco
          for (const account of accounts) {
            const accountNameLower = account.name.toLowerCase()
              .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            if (accountNameLower.includes(banco)) {
              contaSelecionada = account;
              console.log('✅ Match por variação:', variacao, '→', account.name);
              break;
            }
          }
          if (contaSelecionada) break;
        }
      }
      if (contaSelecionada) break;
    }
  }
  
  // Se ainda não encontrou, tentar match parcial mais agressivo
  if (!contaSelecionada) {
    for (const account of accounts) {
      const accountNameLower = account.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Verificar se alguma palavra do texto está no nome da conta
      const palavras = textoLower.split(/\s+/);
      for (const palavra of palavras) {
        if (palavra.length >= 3 && accountNameLower.includes(palavra)) {
          contaSelecionada = account;
          console.log('✅ Match parcial encontrado:', palavra, '→', account.name);
          break;
        }
      }
      if (contaSelecionada) break;
    }
  }
  
  // Se encontrou conta, registrar a transação pendente
  const intencaoPendente = contexto.context_data?.intencao_pendente;
  console.log('📋 Contexto recebido:', JSON.stringify(contexto.context_data));
  console.log('📋 Intenção pendente:', JSON.stringify(intencaoPendente));
  console.log('🏦 Conta selecionada:', contaSelecionada?.name);
  
  if (contaSelecionada && intencaoPendente) {
    const intencao = intencaoPendente;
    const entidades = intencao.entidades || {};
    
    console.log('📊 Entidades:', JSON.stringify(entidades));
    
    // 1. Verificar se a conta existe e pertence ao usuário
    const { data: contaVerificada, error: contaError } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('id', contaSelecionada.id)
      .eq('user_id', userId)
      .single();
    
    if (contaError || !contaVerificada) {
      console.error('❌ Conta não encontrada ou não pertence ao usuário:', JSON.stringify(contaError));
      await limparContexto(userId);
      return '❌ Conta não encontrada. Tente novamente.';
    }
    
    console.log('✅ Conta verificada:', contaVerificada.name);
    
    const tipo = intencao.intencao === 'REGISTRAR_RECEITA' ? 'income' : 'expense';
    const textosCtx = [intencao?.comando_original, entidades.descricao].filter((t): t is string => !!t);
    const resolvedCtx = await resolveCanonicalCategory(supabase, {
      userId,
      transactionType: tipo,
      textSources: textosCtx,
      amount: entidades.valor,
      labelHint: entidades.categoria,
    });
    const categoryId: string | null = resolvedCtx.categoryId;
    const categoriaNome = resolvedCtx.categoryName;
    console.log('[CONTEXTO-CATEGORIA] Resolvido:', categoriaNome, categoryId, resolvedCtx.resolutionPath);
    const valorTransacao = entidades.valor || 0;
    const descricaoTransacao = entidades.descricao || 'Via WhatsApp';
    
    console.log('💰 Valor:', valorTransacao, '| Categoria:', categoryId, '| Desc:', descricaoTransacao);
    
    // Mapear forma de pagamento do NLP para o banco
    const mapFormaPagamento: Record<string, 'pix' | 'credit' | 'debit' | 'cash' | 'boleto' | 'transfer' | 'other'> = {
      'pix': 'pix',
      'credito': 'credit',
      'debito': 'debit',
      'dinheiro': 'cash',
      'boleto': 'boleto',
      'transferencia': 'transfer'
    };
    const paymentMethod = entidades.forma_pagamento 
      ? mapFormaPagamento[entidades.forma_pagamento] || 'other'
      : undefined;
    
    // 2. Montar payload de inserção
    const payload: any = {
      user_id: userId,
      amount: valorTransacao,
      type: intencao.intencao === 'REGISTRAR_RECEITA' ? 'income' : 'expense',
      account_id: contaSelecionada.id,
      category_id: categoryId,
      description: descricaoTransacao,
      transaction_date: todayBrasilia(),
      is_paid: true,
      source: 'whatsapp',
      payment_method: paymentMethod // ✅ Incluir forma de pagamento
    };
    
    console.log('📤 Payload de inserção:', JSON.stringify(payload, null, 2));
    
    // 3. Criar transação
    const { data: transacao, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single();
    
    if (error) {
      console.error('❌ ERRO COMPLETO:', JSON.stringify(error, null, 2));
      console.error('❌ Código:', error.code);
      console.error('❌ Mensagem:', error.message);
      console.error('❌ Detalhes:', error.details);
      console.error('❌ Hint:', error.hint);
      await limparContexto(userId);
      return `❌ Erro ao registrar: ${error.message || 'Erro desconhecido'}`;
    }
    
    console.log('✅ Transação inserida com sucesso! ID:', transacao?.id);
    
    // Buscar saldo atualizado da conta
    const { data: contaAtualizada } = await supabase
      .from('accounts')
      .select('current_balance')
      .eq('id', contaSelecionada.id)
      .single();
    
    // Limpar contexto após sucesso
    await limparContexto(userId);
    
    // Usar novo template profissional com saldo
    const mensagemSucesso = templateTransacaoRegistrada({
      type: intencao.intencao === 'REGISTRAR_RECEITA' ? 'income' : 'expense',
      amount: valorTransacao,
      description: descricaoTransacao,
      category: categoriaNome,
      account: contaSelecionada.name,
      data: new Date(),
      paymentMethod: paymentMethod,
      saldoConta: contaAtualizada?.current_balance // ✅ Incluir saldo atualizado
    });
    
    return mensagemSucesso;
  }
  
  // Se encontrou conta mas não tem intenção pendente
  if (contaSelecionada) {
    await atualizarContextData(userId, { account_id: contaSelecionada.id, account_name: contaSelecionada.name });
    await limparContexto(userId);
    return `✅ Conta selecionada: ${contaSelecionada.name}`;
  }
  
  // Não encontrou - listar opções
  let lista = '🏦 *Escolha uma conta:*\n\n';
  accounts.forEach((acc: { name: string }, i: number) => {
    lista += `${i + 1}. ${acc.name}\n`;
  });
  lista += '\n_Digite o número ou nome da conta_';
  
  return lista;
}

async function processarCategoria(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  
  // Buscar categorias
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, icon')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  if (!categories || categories.length === 0) {
    await limparContexto(userId);
    return '❌ Nenhuma categoria encontrada.';
  }
  
  const textoLower = texto.toLowerCase();
  
  // Tentar por número
  const numeroMatch = texto.match(/^(\d+)$/);
  if (numeroMatch) {
    const index = parseInt(numeroMatch[1]) - 1;
    if (index >= 0 && index < categories.length) {
      const cat = categories[index];
      await atualizarContextData(userId, { category_id: cat.id, category_name: cat.name });
      await limparContexto(userId);
      return `✅ Categoria: ${cat.icon || '📂'} ${cat.name}`;
    }
  }
  
  // Tentar por nome
  for (const cat of categories) {
    if (textoLower.includes(cat.name.toLowerCase())) {
      await atualizarContextData(userId, { category_id: cat.id, category_name: cat.name });
      await limparContexto(userId);
      return `✅ Categoria: ${cat.icon || '📂'} ${cat.name}`;
    }
  }
  
  // Listar opções
  let lista = '📂 *Escolha uma categoria:*\n\n';
  categories.forEach((cat: { icon?: string; name: string }, i: number) => {
    lista += `${i + 1}. ${cat.icon || '📂'} ${cat.name}\n`;
  });
  lista += '\n_Digite o número ou nome_';
  
  return lista;
}

async function processarConfirmacaoExclusao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const command = texto.toLowerCase().trim();
  
  const transacaoId = contexto.context_data?.transacao_id;
  const transacaoTipo = contexto.context_data?.transacao_tipo;
  
  if (command === 'sim' || command === 's' || command === 'confirmar') {
    if (transacaoId) {
      const supabase = getSupabase();
      const tabela = transacaoTipo === 'credit_card_transaction' 
        ? 'credit_card_transactions' 
        : 'transactions';
      
      const { error } = await supabase
        .from(tabela)
        .delete()
        .eq('id', transacaoId)
        .eq('user_id', userId);
      
      await limparContexto(userId);
      
      if (error) {
        return '❌ Erro ao excluir. Tente novamente.';
      }
      
      return '✅ Transação excluída com sucesso!';
    }
  }
  
  if (command === 'não' || command === 'nao' || command === 'n') {
    await limparContexto(userId);
    return '👍 Exclusão cancelada.';
  }
  
  return '⚠️ Digite *sim* para confirmar a exclusão ou *não* para cancelar.';
}

async function processarEdicao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const transacaoId = contexto.context_data?.transacao_id;
  const transacaoTipo = contexto.context_data?.transacao_tipo;
  
  if (!transacaoId) {
    await limparContexto(userId);
    return '❌ Nenhuma transação para editar.';
  }
  
  const supabase = getSupabase();
  const textoLower = texto.toLowerCase();
  
  // Detectar o que editar
  const updates: Record<string, unknown> = {};
  
  // Editar valor
  const valorMatch = texto.match(/(\d+[.,]?\d*)\s*(reais?|r\$)?/i);
  if (valorMatch || textoLower.includes('valor')) {
    const match = texto.match(/(\d+[.,]?\d*)/);
    if (match) {
      const novoValor = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(novoValor) && novoValor > 0) {
        updates.amount = novoValor;
      }
    }
  }
  
  // Editar descrição
  if (textoLower.startsWith('descrição') || textoLower.startsWith('descricao')) {
    const novaDescricao = texto.replace(/^descri[çc][ãa]o\s*/i, '').trim();
    if (novaDescricao) {
      updates.description = novaDescricao;
    }
  }
  
  if (Object.keys(updates).length === 0) {
    return '❓ Não entendi o que mudar.\n\nExemplos:\n• "50 reais" ou "era 50"\n• "descrição almoço"\n• "categoria alimentação"';
  }
  
  // Aplicar updates
  const tabela = transacaoTipo === 'credit_card_transaction' 
    ? 'credit_card_transactions' 
    : 'transactions';
  
  const { error } = await supabase
    .from(tabela)
    .update(updates)
    .eq('id', transacaoId)
    .eq('user_id', userId);
  
  await limparContexto(userId);
  
  if (error) {
    return '❌ Erro ao atualizar. Tente novamente.';
  }
  
  const campos = Object.keys(updates).join(', ');
  return `✅ Transação atualizada! (${campos})`;
}

// ============================================
// PROCESSAR CONFIRMAÇÃO DE IMAGEM
// ============================================
async function processarConfirmacaoImagem(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string> {
  const supabase = getSupabase();
  const command = texto.toLowerCase().trim();
  const dadosImagem = contexto.context_data?.dados_imagem as {
    tipo: string;
    valor: number;
    descricao: string;
    categoria: string;
    tipo_transacao?: string;
    data?: string;
  } | undefined;
  
  if (!dadosImagem) {
    await limparContexto(userId);
    return '❌ Dados da imagem não encontrados. Envie novamente.';
  }
  
  if (command === 'sim' || command === 's' || command === 'confirmar' || command === 'ok') {
    // Buscar contas do usuário
    const { data: contas } = await supabase
      .from('accounts')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    if (!contas || contas.length === 0) {
      await limparContexto(userId);
      return '❌ Você não tem contas cadastradas. Cadastre uma conta no app primeiro.';
    }
    
    if (contas.length > 1) {
      // Perguntar qual conta
      await salvarContexto(userId, 'creating_transaction', {
        step: 'awaiting_account',
        phone,
        intencao_pendente: {
          intencao: dadosImagem.tipo_transacao === 'income' ? 'REGISTRAR_RECEITA' : 'REGISTRAR_DESPESA',
          confianca: 0.95,
          entidades: {
            valor: dadosImagem.valor,
            descricao: dadosImagem.descricao,
            categoria: dadosImagem.categoria
          },
          explicacao: 'Leitura de imagem',
          resposta_conversacional: 'Transação via imagem',
          comando_original: `Imagem: ${dadosImagem.descricao}`
        }
      }, phone);
      
      let lista = '🏦 *Em qual conta?*\n\n';
      contas.forEach((acc: any, i: number) => {
        lista += `${i + 1}. ${acc.name}\n`;
      });
      lista += '\n_Responda com o número ou nome_';
      return lista;
    }
    
    // Tem só uma conta, registrar direto
    const tipo = dadosImagem.tipo_transacao || 'expense';
    const tipoCategoria = tipo === 'income' ? 'income' : 'expense';
    const resolvedImg = await resolveCanonicalCategory(supabase, {
      userId,
      transactionType: tipoCategoria,
      textSources: [dadosImagem.descricao, dadosImagem.categoria].filter(Boolean) as string[],
      labelHint: dadosImagem.categoria,
      amount: dadosImagem.valor,
    });
    const categoryId: string | null = resolvedImg.categoryId;
    
    const payload = {
      user_id: userId,
      amount: dadosImagem.valor,
      type: tipo,
      account_id: contas[0].id,
      category_id: categoryId,
      description: dadosImagem.descricao,
      transaction_date: dadosImagem.data || new Date().toISOString().split('T')[0],
      is_paid: true,
      source: 'whatsapp'
    };
    
    const { data: transacao, error } = await supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single();
    
    await limparContexto(userId);
    
    if (error) {
      console.error('[IMAGE] Erro ao registrar:', error);
      return `❌ Erro ao registrar: ${error.message}`;
    }
    
    const emoji = tipo === 'income' ? '💰' : '💸';
    return `✅ *Registrado com sucesso!*\n\n` +
           `${emoji} R$ ${dadosImagem.valor.toFixed(2).replace('.', ',')}\n` +
           `📝 ${dadosImagem.descricao}\n` +
           `📂 ${resolvedImg.categoryName}\n` +
           `🏦 ${contas[0].name}`;
  }
  
  if (command === 'não' || command === 'nao' || command === 'n' || command === 'cancelar') {
    await limparContexto(userId);
    return '👍 Cancelado! Envie outra imagem ou me diga o que quer registrar.';
  }
  
  return '❓ Responda *sim* para confirmar ou *não* para cancelar.';
}

// ============================================
// PROCESSAR SELEÇÃO DE CONTA (IMAGEM) - FLUXO UNIFICADO
// ============================================
async function processarSelecaoContaImagem(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string> {
  const supabase = getSupabase();
  const command = texto.toLowerCase().trim();
  
  const dadosImagem = contexto.context_data?.dados_imagem as {
    tipo: string;
    valor: number;
    descricao: string;
    categoria: string;
    tipo_transacao?: string;
    data?: string;
  } | undefined;
  
  const contas = contexto.context_data?.contas as Array<{ id: string; name: string }> | undefined;
  
  if (!dadosImagem || !contas) {
    await limparContexto(userId);
    return '❌ Dados não encontrados. Envie a imagem novamente.';
  }
  
  // Verificar cancelamento
  if (command === 'cancelar' || command === 'não' || command === 'nao' || command === 'n') {
    await limparContexto(userId);
    return '👍 Cancelado! Envie outra imagem ou me diga o que quer registrar.';
  }
  
  // Encontrar conta selecionada
  let contaSelecionada: { id: string; name: string } | null = null;
  
  // Por número
  const numero = parseInt(command);
  if (!isNaN(numero) && numero >= 1 && numero <= contas.length) {
    contaSelecionada = contas[numero - 1];
  }
  
  // Por nome (parcial)
  if (!contaSelecionada) {
    const normalizarTexto = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const comandoNorm = normalizarTexto(command);
    
    contaSelecionada = contas.find(c => 
      normalizarTexto(c.name).includes(comandoNorm) || 
      comandoNorm.includes(normalizarTexto(c.name))
    ) || null;
  }
  
  if (!contaSelecionada) {
    let lista = '❓ Não encontrei essa conta.\n\n🏦 *Escolha uma:*\n\n';
    contas.forEach((acc, i) => {
      lista += `${i + 1}. ${acc.name}\n`;
    });
    lista += '\n_Responda com número/nome ou "cancelar"_';
    return lista;
  }
  
  // Registrar transação
  const tipo = dadosImagem.tipo_transacao || 'expense';
  const tipoCategoria = tipo === 'income' ? 'income' : 'expense';
  const resolvedImg2 = await resolveCanonicalCategory(supabase, {
    userId,
    transactionType: tipoCategoria,
    textSources: [dadosImagem.descricao, dadosImagem.categoria].filter(Boolean) as string[],
    labelHint: dadosImagem.categoria,
    amount: dadosImagem.valor,
  });
  let categoryId: string | null = resolvedImg2.categoryId;

  console.log('[IMAGE] Categoria:', resolvedImg2.categoryName, '| ID:', categoryId);
  
  const payload = {
    user_id: userId,
    amount: dadosImagem.valor,
    type: tipo,
    account_id: contaSelecionada.id,
    category_id: categoryId,
    description: dadosImagem.descricao,
    transaction_date: dadosImagem.data || new Date().toISOString().split('T')[0],
    is_paid: true,
    source: 'whatsapp'
  };
  
  const { data: transacao, error } = await supabase
    .from('transactions')
    .insert(payload)
    .select()
    .single();
  
  await limparContexto(userId);
  
  if (error) {
    console.error('[IMAGE] Erro ao registrar:', error);
    return `❌ Erro ao registrar: ${error.message}`;
  }
  
  // Buscar saldo atualizado da conta
  const { data: contaAtualizada } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('id', contaSelecionada.id)
    .single();
  
  const saldoAtual = contaAtualizada?.current_balance || 0;
  
  const nomeCategoria = resolvedImg2.categoryName;
  
  // Usa getEmojiBanco de utils.ts
  const emojiBanco = getEmojiBanco(contaSelecionada.name);
  const emoji = tipo === 'income' ? '💰' : '💸';
  const tipoTexto = tipo === 'income' ? 'Receita' : 'Despesa';
  const dataFormatada = dadosImagem.data 
    ? new Date(dadosImagem.data + 'T12:00:00').toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');
  
  const formatarMoeda = (v: number) => v.toFixed(2).replace('.', ',');
  
  return `Anotado! 📝\n\n` +
         `⭐ *Transação Registrada!* ⭐\n\n` +
         `📝 *Descrição:* ${dadosImagem.descricao}\n` +
         `${emoji} *Valor:* R$ ${formatarMoeda(dadosImagem.valor)}\n` +
         `🔴 *Tipo:* ${tipoTexto}\n` +
         `🏷️ *Categoria:* ${nomeCategoria}\n` +
         `${emojiBanco} *Conta:* ${contaSelecionada.name}\n` +
         `📅 *Data:* ${dataFormatada}\n\n` +
         `✅ *Status:* Pago\n\n` +
         `━━━━━━━━━━━━━━━━━━\n` +
         `${emojiBanco} *Saldo ${contaSelecionada.name}:* R$ ${formatarMoeda(saldoAtual)}\n` +
         `━━━━━━━━━━━━━━━━━━\n\n` +
         `💡 *Quer alterar algo?*\n` +
         `• Valor → _"era 95"_\n` +
         `• Conta → _"muda pra Nubank"_\n` +
         `• Excluir → _"exclui essa"_`;
}

// ============================================
// PROCESSAR SELEÇÃO DE CARTÃO (FASE 2)
// ============================================

async function processarSelecaoCartao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const dados = contexto.context_data?.dados_cartao as any;
  
  if (!dados || !dados.cartoes) {
    await limparContexto(userId);
    return '❌ Erro: dados do cartão não encontrados.';
  }
  
  const resposta = texto.toLowerCase().trim();
  
  // Cancelar
  if (resposta === 'cancelar' || resposta === 'cancela' || resposta === 'não' || resposta === 'nao') {
    await limparContexto(userId);
    return '❌ Compra cancelada.';
  }
  
  // ✅ Detectar comandos de exclusão - não é seleção de cartão!
  if (/^(exclui|apaga|deleta|remove)\s*(essa|este|isso|a última|a ultima)?$/i.test(resposta)) {
    await limparContexto(userId);
    // Importar e chamar excluirUltimaTransacao
    const { excluirUltimaTransacao } = await import('./command-handlers.ts');
    return await excluirUltimaTransacao(userId);
  }
  
  // Buscar cartão por número ou nome
  let cartaoSelecionado = null;
  const numero = parseInt(resposta);
  
  if (!isNaN(numero) && numero > 0 && numero <= dados.cartoes.length) {
    cartaoSelecionado = dados.cartoes[numero - 1];
  } else {
    const respostaNorm = resposta.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // ✅ CORREÇÃO: Usar aliases para encontrar cartão (roxinho → nubank, laranjinha → inter)
    const { buscarCartaoFuzzy } = await import('./cartao-credito.ts');
    const fuzzyResult = buscarCartaoFuzzy(resposta, dados.cartoes);
    
    if (fuzzyResult.encontrado && fuzzyResult.cartao) {
      cartaoSelecionado = fuzzyResult.cartao;
    } else {
      // Fallback: busca simples por nome
      cartaoSelecionado = dados.cartoes.find((c: any) => {
        const nomeNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nomeNorm.includes(respostaNorm) || respostaNorm.includes(nomeNorm);
      });
    }
  }
  
  if (!cartaoSelecionado) {
    return `❓ Não encontrei esse cartão.\n\nResponda com o número ou nome do cartão.\n\n💡 _Você pode usar apelidos como "roxinho", "laranjinha", etc._`;
  }
  
  // Importar e chamar registrarCompraCartao
  const { registrarCompraCartao } = await import('./cartao-credito.ts');
  
  const resultado = await registrarCompraCartao(userId, {
    valor: dados.valor,
    parcelas: dados.parcelas,
    cartao_id: cartaoSelecionado.id,
    descricao: dados.descricao,
    data_compra: new Date().toISOString().split('T')[0]
  });
  
  // ✅ Salvar ID da transação no contexto para exclusão posterior
  if (resultado.sucesso && resultado.transactionId) {
    await salvarContexto(userId, 'credit_card_context', {
      transacao_id: resultado.transactionId,
      transacao_tipo: 'credit_card_transaction'
    });
  } else {
    await limparContexto(userId);
  }
  
  return resultado.mensagem;
}

// ============================================
// PROCESSAR DESCRIÇÃO DA COMPRA NO CARTÃO
// ============================================

async function processarDescricaoCompraCartao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const dados = contexto.context_data?.dados_cartao as any;
  
  if (!dados || !dados.cartao_id) {
    await limparContexto(userId);
    return '❌ Erro: dados do cartão não encontrados.';
  }
  
  const resposta = texto.toLowerCase().trim();
  
  // Cancelar
  if (resposta === 'cancelar' || resposta === 'cancela' || resposta === 'não' || resposta === 'nao') {
    await limparContexto(userId);
    return '❌ Compra cancelada.';
  }
  
  // ✅ Detectar comandos de exclusão - não é descrição de compra!
  if (/^(exclui|apaga|deleta|remove)\s*(essa|este|isso|a última|a ultima)?$/i.test(resposta)) {
    await limparContexto(userId);
    const { excluirUltimaTransacao } = await import('./command-handlers.ts');
    return await excluirUltimaTransacao(userId);
  }
  
  // Extrair descrição e parcelas da resposta
  let descricao = texto.trim();
  let parcelas = 1;
  
  // Detectar parcelas na resposta: "mercado em 3x", "celular 12x", "tv 6 vezes"
  const matchParcelas = resposta.match(/(.+?)\s+(?:em\s+)?(\d+)\s*(?:x|vezes|parcelas?)/i);
  if (matchParcelas) {
    descricao = matchParcelas[1].trim();
    parcelas = parseInt(matchParcelas[2]);
  }
  
  // Capitalizar primeira letra
  descricao = descricao.charAt(0).toUpperCase() + descricao.slice(1);
  
  if (descricao.length < 2) {
    return '❓ Descrição muito curta. O que você comprou?\n\n_Ex: "almoço", "gasolina", "mercado em 3x"_';
  }
  
  // Registrar a compra
  const { registrarCompraCartao } = await import('./cartao-credito.ts');
  
  const resultado = await registrarCompraCartao(userId, {
    valor: dados.valor,
    parcelas: parcelas,
    cartao_id: dados.cartao_id,
    descricao: descricao,
    data_compra: new Date().toISOString().split('T')[0]
  });
  
  // Salvar ID da transação no contexto para exclusão posterior
  if (resultado.sucesso && resultado.transactionId) {
    await salvarContexto(userId, 'credit_card_context', {
      transacao_id: resultado.transactionId,
      transacao_tipo: 'credit_card_transaction'
    });
  } else {
    await limparContexto(userId);
  }
  
  return resultado.mensagem;
}

// ============================================
// PROCESSAR DESCRIÇÃO DA TRANSAÇÃO
// ============================================

async function processarDescricao(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string> {
  const dados = contexto.context_data?.dados_transacao as any;
  
  if (!dados) {
    await limparContexto(userId);
    return '❌ Erro: dados da transação não encontrados.';
  }
  
  const descricao = texto.trim();
  
  if (!descricao || descricao.length < 2) {
    return '❓ Descrição muito curta. Pode ser mais específico?\n\n_Exemplo: "Lanche", "Mercado", "Uber"_';
  }
  
  console.log('[DESCRIPTION] ✅ [BUG #17] Descrição fornecida pelo usuário:', descricao);
  
  // ✅ BUG #17: Detectar categoria baseado na descrição fornecida
  const { detectarCategoriaAutomatica } = await import('./transaction-mapper.ts');
  let categoryId: string | null | undefined;
  let categoriaNome = 'Outros';
  
  try {
    categoryId = await detectarCategoriaAutomatica(userId, descricao, 'expense');
    console.log('[DESCRIPTION] ✅ Categoria detectada:', categoryId, 'para descrição:', descricao);
    
    // Se encontrou categoria, buscar o nome para exibir no template
    if (categoryId) {
      const { data: categorias } = await getSupabase()
        .from('categories')
        .select('name')
        .eq('id', categoryId)
        .single();
      if (categorias?.name) {
        categoriaNome = categorias.name;
      }
    }
  } catch (err) {
    console.log('[DESCRIPTION] ⚠️ Erro ao detectar categoria:', err);
  }
  
  // Agora perguntar método de pagamento
  const { templatePerguntaMetodoPagamentoComBancos } = await import('./transaction-mapper.ts');
  const mensagem = await templatePerguntaMetodoPagamentoComBancos(descricao, dados.valor, userId);
  
  // Salvar contexto com descrição e categoria detectada
  await salvarContexto(userId, 'creating_transaction', {
    step: 'awaiting_payment_method',
    phone,
    dados_transacao: {
      valor: dados.valor,
      descricao: descricao,
      categoria: categoryId,
      conta: dados.conta,
      tipo: 'expense'
    }
  }, phone);
  
  return mensagem;
}

// ============================================
// PROCESSAR SELEÇÃO DE MÉTODO DE PAGAMENTO
// ============================================

async function processarSelecaoMetodoPagamento(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string> {
  const dados = contexto.context_data?.dados_transacao as any;
  const intencao = contexto.context_data?.intencao_pendente as any;
  
  if (!dados && !intencao) {
    await limparContexto(userId);
    return '❌ Erro: dados da transação não encontrados.';
  }
  
  const resposta = texto.toLowerCase().trim();
  
  // ✅ BUG #18: Verificar se é uma NOVA transação antes de processar como resposta
  // Usando função centralizada do context-detector.ts
  const { pareceNovaTransacao } = await import('../shared/context-detector.ts');
  
  if (pareceNovaTransacao(resposta)) {
    console.log('[PAYMENT_METHOD] ⚠️ [BUG #18] Parece nova transação, não resposta ao contexto');
    console.log('[PAYMENT_METHOD] Limpando contexto e processando como nova transação');
    await limparContexto(userId);
    // Retorna vazio para deixar o fluxo normal processar como nova transação
    return '';
  }
  
  // Cancelar
  if (resposta === 'cancelar' || resposta === 'cancela' || resposta === 'não' || resposta === 'nao') {
    await limparContexto(userId);
    return '❌ Transação cancelada.';
  }
  
  // Normalizar resposta (remover acentos, espaços extras, pontuação)
  const respostaNorm = resposta
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log('[PAYMENT_METHOD] Resposta original:', resposta);
  console.log('[PAYMENT_METHOD] Resposta normalizada:', respostaNorm);
  
  const { parsePaymentMethodReply } = await import('../shared/context-detector.ts');
  const parsedPaymentReply = parsePaymentMethodReply(resposta);
  const metodo = parsedPaymentReply
    ? { method: parsedPaymentReply.method, label: parsedPaymentReply.label }
    : null;
  
  console.log('[PAYMENT_METHOD] Método detectado:', metodo);
  
  if (!metodo) {
    return `❓ Não entendi. Responda:\n\n1️⃣ Cartão de crédito\n2️⃣ Débito\n3️⃣ PIX\n4️⃣ Dinheiro`;
  }
  
  // 🔧 NOVO: Detectar banco/conta na mesma resposta
  const respostaLower = resposta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // ✅ BUG #14: Verificar se já tem banco no contexto ANTES de detectar na resposta
  let contaDetectada: string | null =
    dados?.conta || intencao?.entidades?.conta || parsedPaymentReply?.bankAlias || null;
  if (contaDetectada) {
    console.log('[PAYMENT_METHOD] 🏦 Banco do contexto:', contaDetectada);
  }
  
  // Se não tinha no contexto, tentar detectar na resposta atual
  if (!contaDetectada) {
    contaDetectada = detectarBancoPorAlias(respostaLower);
    if (contaDetectada) {
      console.log('[PAYMENT_METHOD] 🏦 Banco detectado na resposta:', contaDetectada);
    }
  }
  
  // Se escolheu CARTÃO DE CRÉDITO → fluxo de cartões
  if (metodo.method === 'credit') {
    const { buscarCartoesUsuario } = await import('./cartao-credito.ts');
    const cartoes = await buscarCartoesUsuario(userId);
    
    if (cartoes.length === 0) {
      await limparContexto(userId);
      return `❌ Você não tem cartões de crédito cadastrados.\n\n💡 Cadastre no app primeiro!`;
    }
    
    // 🔧 NOVO: Verificar se o nome do cartão já foi mencionado na resposta
    let cartaoSelecionado = null;
    const respostaLower = resposta.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    for (const cartao of cartoes) {
      const bankNameLower = cartao.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      // Verifica se o nome do banco está na resposta (ex: "nubank" em "cartao nubank")
      if (respostaLower.includes(bankNameLower)) {
        cartaoSelecionado = cartao;
        console.log('🎯 [CARD_DETECTION] Cartão detectado na resposta:', cartao.name);
        break;
      }
    }
    
    // ✅ BUG #15: Se não encontrou na resposta, verificar se tem no contexto
    if (!cartaoSelecionado && contaDetectada) {
      console.log('[PAYMENT_METHOD] 🏦 Verificando cartão do contexto:', contaDetectada);
      for (const cartao of cartoes) {
        const bankNameLower = cartao.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (bankNameLower.includes(contaDetectada)) {
          cartaoSelecionado = cartao;
          console.log('🎯 [CARD_DETECTION] Cartão encontrado no contexto:', cartao.name);
          break;
        }
      }
    }
    
    // Se encontrou cartão específico (na resposta ou no contexto), registrar direto
    if (cartaoSelecionado) {
      const { registrarCompraCartao } = await import('./cartao-credito.ts');
      const resultado = await registrarCompraCartao(userId, {
        valor: dados?.valor || intencao?.entidades?.valor,
        parcelas: 1,
        cartao_id: cartaoSelecionado.id,
        descricao: dados?.descricao || intencao?.entidades?.descricao || 'Via WhatsApp',
        data_compra: new Date().toISOString().split('T')[0]
      });
      // ✅ Salvar ID da transação no contexto para exclusão posterior
      if (resultado.sucesso && resultado.transactionId) {
        await limparContexto(userId);
        await salvarContexto(userId, 'credit_card_context', {
          transacao_id: resultado.transactionId,
          transacao_tipo: 'credit_card_transaction'
        });
      } else {
        await limparContexto(userId);
      }
      return resultado.mensagem;
    }
    
    if (cartoes.length === 1) {
      // Registrar direto no único cartão
      const { registrarCompraCartao } = await import('./cartao-credito.ts');
      const resultado = await registrarCompraCartao(userId, {
        valor: dados?.valor || intencao?.entidades?.valor,
        parcelas: 1,
        cartao_id: cartoes[0].id,
        descricao: dados?.descricao || intencao?.entidades?.descricao || 'Via WhatsApp',
        data_compra: new Date().toISOString().split('T')[0]
      });
      // ✅ Salvar ID da transação no contexto para exclusão posterior
      if (resultado.sucesso && resultado.transactionId) {
        await limparContexto(userId);
        await salvarContexto(userId, 'credit_card_context', {
          transacao_id: resultado.transactionId,
          transacao_tipo: 'credit_card_transaction'
        });
      } else {
        await limparContexto(userId);
      }
      return resultado.mensagem;
    }
    
    // Múltiplos cartões → perguntar qual
    const { getEmojiBanco } = await import('./utils.ts');
    await salvarContexto(userId, 'confirming_action', {
      step: 'awaiting_card_selection',
      phone,
      dados_cartao: {
        valor: dados?.valor || intencao?.entidades?.valor,
        parcelas: 1,
        descricao: dados?.descricao || intencao?.entidades?.descricao,
        cartoes: cartoes.map((c: any) => ({ id: c.id, name: c.name }))
      }
    }, phone);
    
    let msg = `💳 *Qual cartão?*\n\n`;
    cartoes.forEach((c: any, i: number) => {
      msg += `${i + 1}️⃣ ${getEmojiBanco(c.name)} ${c.name}\n`;
    });
    msg += `\n_Responda com o número ou nome_`;
    return msg;
  }
  
  // DÉBITO, PIX ou DINHEIRO → registrar em transactions
  const supabase = getSupabase();
  
  // Buscar contas do usuário
  const { data: contas } = await supabase
    .from('accounts')
    .select('id, name, icon')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('name');
  
  if (!contas || contas.length === 0) {
    await limparContexto(userId);
    return `❌ Você não tem contas cadastradas.`;
  }
  
  const valor = dados?.valor || intencao?.entidades?.valor;
  const descricao = dados?.descricao || intencao?.entidades?.descricao || 'Via WhatsApp';
  
  // 🔧 Se detectou banco na resposta, tentar encontrar a conta
  let contaSelecionada: typeof contas[0] | null = null;
  if (contaDetectada) {
    // Buscar conta que corresponde ao banco detectado
    for (const conta of contas) {
      const contaNorm = conta.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (contaNorm.includes(contaDetectada)) {
        contaSelecionada = conta;
        console.log('[PAYMENT_METHOD] ✅ Conta encontrada para banco:', contaDetectada, '→', conta.name);
        break;
      }
    }
  }
  
  // Se encontrou conta, registrar direto!
  if (contaSelecionada) {
    // ✅ BUG #12: Detectar categoria antes de registrar
    const { detectarCategoriaAutomatica, buscarCategoriaPorNome } = await import('./transaction-mapper.ts');
    let categoryId: string | null | undefined;
    let categoriaNome = 'Outros';
    try {
      categoryId = await detectarCategoriaAutomatica(userId, descricao, 'expense');
      console.log('[PAYMENT_METHOD] ✅ Categoria detectada:', categoryId, 'para descrição:', descricao);
      
      // Se encontrou categoria, buscar o nome para exibir no template
      if (categoryId) {
        const { data: categorias } = await getSupabase()
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();
        if (categorias?.name) {
          categoriaNome = categorias.name;
        }
      }
    } catch (err) {
      console.log('[PAYMENT_METHOD] ⚠️ Erro ao detectar categoria:', err);
    }
    
    const { registrarTransacao } = await import('./transaction-mapper.ts');
    const resultado = await registrarTransacao({
      user_id: userId,
      amount: valor,
      type: 'expense',
      account_id: contaSelecionada.id,
      category_id: categoryId || undefined,
      description: descricao,
      payment_method: metodo.method
    });
    
    await limparContexto(userId);
    
    // ✅ BUG #11: Usar template correto com saldo
    if (resultado.success) {
      // Buscar saldo atualizado
      const { data: contaAtualizada } = await getSupabase()
        .from('accounts')
        .select('current_balance')
        .eq('id', contaSelecionada.id)
        .single();
      
      return templateTransacaoRegistrada({
        type: 'expense',
        amount: valor,
        description: descricao,
        category: categoriaNome,
        account: contaSelecionada.name,
        data: new Date(),
        paymentMethod: metodo.method,
        saldoConta: contaAtualizada?.current_balance
      });
    }
    return resultado.mensagem;
  }
  
  if (contas.length === 1) {
    // Registrar direto na única conta
    // ✅ BUG #12: Detectar categoria antes de registrar
    const { detectarCategoriaAutomatica } = await import('./transaction-mapper.ts');
    let categoryId: string | null | undefined;
    let categoriaNome = 'Outros';
    try {
      categoryId = await detectarCategoriaAutomatica(userId, descricao, 'expense');
      console.log('[PAYMENT_METHOD] ✅ Categoria detectada:', categoryId, 'para descrição:', descricao);
      
      // Se encontrou categoria, buscar o nome para exibir no template
      if (categoryId) {
        const { data: categorias } = await getSupabase()
          .from('categories')
          .select('name')
          .eq('id', categoryId)
          .single();
        if (categorias?.name) {
          categoriaNome = categorias.name;
        }
      }
    } catch (err) {
      console.log('[PAYMENT_METHOD] ⚠️ Erro ao detectar categoria:', err);
    }
    
    const { registrarTransacao } = await import('./transaction-mapper.ts');
    const resultado = await registrarTransacao({
      user_id: userId,
      amount: valor,
      type: 'expense',
      account_id: contas[0].id,
      category_id: categoryId || undefined,
      description: descricao,
      payment_method: metodo.method
    });
    
    await limparContexto(userId);
    
    // ✅ BUG #11: Usar template correto com saldo
    if (resultado.success) {
      // Buscar saldo atualizado
      const { data: contaAtualizada } = await getSupabase()
        .from('accounts')
        .select('current_balance')
        .eq('id', contas[0].id)
        .single();
      
      return templateTransacaoRegistrada({
        type: 'expense',
        amount: valor,
        description: descricao,
        category: categoriaNome,
        account: contas[0].name,
        data: new Date(),
        paymentMethod: metodo.method,
        saldoConta: contaAtualizada?.current_balance
      });
    }
    return resultado.mensagem;
  }
  
  // Múltiplas contas → perguntar qual
  const { getEmojiBanco } = await import('./utils.ts');
  
  // Atualizar contexto com método de pagamento e ir para seleção de conta
  await salvarContexto(userId, 'creating_transaction', {
    step: 'awaiting_account',
    phone,
    intencao_pendente: {
      ...intencao,
      entidades: {
        ...intencao?.entidades,
        forma_pagamento: metodo.method === 'debit' ? 'debito' : 
                         metodo.method === 'pix' ? 'pix' : 
                         metodo.method === 'cash' ? 'dinheiro' : 'other'
      }
    }
  }, phone);
  
  let msg = `💳 *${metodo.label}*\n\n`;
  msg += `🏦 De qual conta?\n\n`;
  contas.forEach((c: any, i: number) => {
    msg += `${i + 1}️⃣ ${getEmojiBanco(c.name)} ${c.name}\n`;
  });
  msg += `\n_Responda com o número ou nome_`;
  return msg;
}

// ============================================
// ✅ BUG #21: PROCESSAR SELEÇÃO DE CONTA PARA TRANSFERÊNCIA
// ============================================

async function processarSelecaoContaTransferencia(
  texto: string,
  contexto: ContextoConversa,
  userId: string,
  phone: string
): Promise<string> {
  const supabase = getSupabase();
  const dados = contexto.context_data?.dados_transacao as any;
  
  if (!dados) {
    await limparContexto(userId);
    return '❌ Erro: dados da transferência não encontrados.';
  }
  
  const resposta = texto.toLowerCase().trim();
  
  // Cancelar
  if (resposta === 'cancelar' || resposta === 'cancela' || resposta === 'não' || resposta === 'nao') {
    await limparContexto(userId);
    return '❌ Transferência cancelada.';
  }
  
  // Buscar contas do usuário
  const { data: contas } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('user_id', userId);
  
  if (!contas || contas.length === 0) {
    await limparContexto(userId);
    return '❌ Você não tem contas cadastradas.';
  }
  
  // Tentar encontrar a conta por número ou nome
  let contaSelecionada: { id: string; name: string } | null = null;
  
  // Por número
  const numero = parseInt(resposta);
  if (!isNaN(numero) && numero >= 1 && numero <= contas.length) {
    contaSelecionada = contas[numero - 1];
  }
  
  // Por nome
  if (!contaSelecionada) {
    const respostaNorm = resposta.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    contaSelecionada = contas.find((c: any) => {
      const nomeNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return nomeNorm.includes(respostaNorm) || respostaNorm.includes(nomeNorm);
    }) || null;
  }
  
  if (!contaSelecionada) {
    let msg = `❓ Não encontrei essa conta.\n\n🏦 Escolha uma:\n\n`;
    contas.forEach((c: any, i: number) => {
      msg += `${i + 1}. ${c.name}\n`;
    });
    return msg;
  }
  
  console.log('[TRANSFER-CONTEXT] ✅ Conta selecionada:', contaSelecionada.name);
  
  // Registrar a transferência
  const dataTransacao = dados.data || new Date().toISOString().split('T')[0];
  const { data: transacao, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: contaSelecionada.id,
      amount: dados.valor,
      type: 'transfer',
      payment_method: 'transfer',
      description: `Transferência para ${dados.descricao}`,
      transaction_date: dataTransacao,
      category_id: null
    })
    .select('id');
  
  if (error) {
    console.error('[TRANSFER-CONTEXT] ❌ Erro ao registrar:', error);
    await limparContexto(userId);
    return '❌ Erro ao registrar transferência. Tente novamente.';
  }
  
  console.log('[TRANSFER-CONTEXT] ✅ Transferência registrada:', transacao?.[0]?.id);
  
  // Limpar contexto
  await limparContexto(userId);
  
  // Usar template formatado
  const { templateTransferenciaRegistrada } = await import('./response-templates.ts');
  return templateTransferenciaRegistrada({
    amount: dados.valor,
    destinatario: dados.descricao || 'Não especificado',
    contaOrigem: contaSelecionada.name,
    data: dataTransacao,
    status: 'completed'
  });
}

// ============================================
// FASE 3.2: HANDLERS DE CADASTRO DE CONTAS
// ============================================

// Handler para dia de vencimento
async function processarDiaVencimento(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  const dados = contexto.context_data || {};
  
  // DEBUG: Verificar dados recuperados do contexto
  console.log('[CADASTRAR-CONTA-DIA] Dados recuperados do contexto:', {
    descricao: dados.descricao,
    valor: dados.valor,
    tipo: dados.tipo,
    recorrencia: dados.recorrencia
  });
  
  // Extrair dia do texto
  const diaMatch = texto.match(/\d+/);
  if (!diaMatch) {
    return `❓ Por favor, informe um número de 1 a 31.\n\n📅 Qual o dia do vencimento?`;
  }
  
  const dia = parseInt(diaMatch[0]);
  if (dia < 1 || dia > 31) {
    return `❓ Dia inválido. Informe um número de 1 a 31.\n\n📅 Qual o dia do vencimento?`;
  }
  
  // Atualizar dados com o dia
  dados.diaVencimento = dia;
  
  // Usar continuarFluxoCadastro para verificar TODOS os campos faltantes (incluindo parcelas para parcelamentos)
  return await continuarFluxoCadastro(supabase, userId, dados);
}

// Handler LEGADO para dia de vencimento (mantido para referência)
async function processarDiaVencimentoLegado(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  const dados = contexto.context_data || {};
  
  const diaMatch = texto.match(/\d+/);
  if (!diaMatch) {
    return `❓ Por favor, informe um número de 1 a 31.`;
  }
  
  const dia = parseInt(diaMatch[0]);
  if (dia < 1 || dia > 31) {
    return `❓ Dia inválido.`;
  }
  
  // Calcular due_date
  const hoje = new Date();
  let dueDate = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
  if (dueDate < hoje) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  
  const descricao = dados.descricao as string || 'Conta';
  let valor = dados.valor as number | undefined;
  
  // CRÍTICO: Se valor foi perdido, tentar recuperar do textoOriginal
  if (!valor && dados.textoOriginal) {
    const textoOriginal = dados.textoOriginal as string;
    console.log('[CADASTRAR-CONTA-DIA] ⚠️ Valor perdido! Tentando recuperar do textoOriginal:', textoOriginal);
    const valorRecuperado = converterExtensoParaNumero(textoOriginal);
    if (valorRecuperado) {
      valor = valorRecuperado;
      console.log('[CADASTRAR-CONTA-DIA] ✅ Valor recuperado:', valor);
    }
  }
  
  const tipoInterno = (dados.tipo as string) || (valor ? 'fixed' : 'variable');
  const parcelas = dados.parcelas as number | undefined;
  
  // Determinar recorrência: pelo campo recorrencia OU pelo tipo (subscription/fixed/variable são recorrentes)
  const recorrenciaStr = dados.recorrencia as string;
  const isRecorrente = recorrenciaStr === 'mensal' || 
                       tipoInterno === 'subscription' || 
                       tipoInterno === 'fixed' || 
                       tipoInterno === 'variable';
  
  console.log(`[CADASTRAR-CONTA-CONTEXTO] recorrencia do contexto: ${recorrenciaStr}`);
  console.log(`[CADASTRAR-CONTA-CONTEXTO] isRecorrente calculado: ${isRecorrente}`);
  
  // Mapear tipo para bill_type do banco usando função inteligente
  const { mapearBillTypeParaBanco } = await import('./contas-pagar.ts');
  const billTypeDb = mapearBillTypeParaBanco(tipoInterno as any, descricao);
  
  console.log(`[CADASTRAR-CONTA-CONTEXTO] Tipo interno: ${tipoInterno}`);
  console.log(`[CADASTRAR-CONTA-CONTEXTO] Descrição: ${descricao}`);
  console.log(`[CADASTRAR-CONTA-CONTEXTO] bill_type mapeado: ${billTypeDb}`);
  
  // Inserir no banco
  const { error } = await supabase
    .from('payable_bills')
    .insert({
      user_id: userId,
      description: descricao,
      amount: valor || 0,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      is_recurring: isRecorrente && !parcelas,
      bill_type: billTypeDb,
      recurrence_config: isRecorrente && !parcelas ? { type: 'monthly', day: dia } : null,
      installment_number: parcelas ? 1 : null,
      installment_total: parcelas || null,
    });
  
  if (error) {
    console.error('Erro ao cadastrar conta:', error);
    await limparContexto(userId);
    return `❌ Erro ao cadastrar conta. Tente novamente.`;
  }
  
  await limparContexto(userId);
  
  const emoji = getEmojiConta(descricao);
  const textoOriginal = dados.textoOriginal as string || '';
  
  // Importar função para verificar se é variável
  const { isContaVariavel } = await import('./contas-pagar.ts');
  const isVariavel = tipoInterno === 'variable' || isContaVariavel(tipoInterno as any, textoOriginal);
  
  // Formatar valor baseado no tipo
  let valorStr: string;
  if (!valor) {
    valorStr = '💰 Valor variável _(informar ao pagar)_';
  } else if (isVariavel) {
    valorStr = `💰 R$ ${valor.toFixed(2).replace('.', ',')} _(valor médio)_`;
  } else {
    valorStr = `💰 R$ ${valor.toFixed(2).replace('.', ',')}`;
  }
  
  // Determinar tipo de exibição
  let tipoExibicao: string;
  if (parcelas) {
    tipoExibicao = `🔢 Parcela 1/${parcelas}`;
  } else if (tipoInterno === 'subscription') {
    tipoExibicao = '🔄 Assinatura mensal';
  } else if (isVariavel) {
    tipoExibicao = '📊 Valor variável _(informe quando chegar)_';
  } else if (isRecorrente) {
    tipoExibicao = '🔄 Recorrente mensal';
  } else {
    tipoExibicao = '📌 Pagamento único';
  }
  
  let msg = `✅ *Conta cadastrada!*\n\n`;
  msg += `${emoji} *${descricao}*\n`;
  msg += `${valorStr}\n`;
  msg += `📅 Vence dia ${dia}\n`;
  msg += `${tipoExibicao}\n`;
  msg += `\n🔔 _Vou te lembrar 1 dia antes!_`;
  
  // Dica para contas variáveis
  if (isVariavel || !valor) {
    msg += `\n\n💡 _Quando chegar a conta: "${descricao.toLowerCase()} veio 185"_`;
  }
  
  return msg;
}

// Handler para decisão de duplicata
async function processarDecisaoDuplicata(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  const dados = contexto.context_data || {};
  const contaId = dados.conta_existente_id as string;
  const novoValor = dados.novo_valor as number | undefined;
  
  const resposta = texto.toLowerCase().trim();
  
  // Opção 1: Atualizar valor
  if (resposta === '1' || resposta.includes('sim') || resposta.includes('atualizar')) {
    if (novoValor && contaId) {
      const { error } = await supabase
        .from('payable_bills')
        .update({ amount: novoValor })
        .eq('id', contaId);
      
      if (error) {
        await limparContexto(userId);
        return `❌ Erro ao atualizar. Tente novamente.`;
      }
      
      await limparContexto(userId);
      return `✅ Valor atualizado para R$ ${novoValor.toFixed(2).replace('.', ',')}!`;
    }
    await limparContexto(userId);
    return `💡 Use _"mudar valor da luz para 180"_ para editar.`;
  }
  
  // Opção 2: Manter como está
  if (resposta === '2' || resposta.includes('manter') || resposta.includes('não')) {
    await limparContexto(userId);
    return `👍 Ok, mantive a conta como estava.`;
  }
  
  // Opção 3: Criar nova conta separada IMEDIATAMENTE
  if (resposta === '3' || resposta.includes('criar') || resposta.includes('nova')) {
    // Recuperar dados originais do contexto e criar a conta
    const descricao = dados.descricao as string;
    const valor = dados.valor as number | undefined;
    const diaVencimento = dados.diaVencimento as number;
    const tipo = dados.tipo as string;
    const phone = dados.phone as string;
    
    if (!descricao || !diaVencimento) {
      await limparContexto(userId);
      return `❌ Dados incompletos. Por favor, cadastre novamente.\n\nExemplo: _"Netflix 55 reais dia 17"_`;
    }
    
    // Importar e chamar a função de cadastro diretamente (sem verificar duplicatas)
    const { criarContaDiretamente } = await import('./contas-pagar.ts');
    const resultado = await criarContaDiretamente(userId, {
      descricao,
      valor,
      diaVencimento,
      tipo: tipo as any, // Cast necessário pois vem do contexto como string
      textoOriginal: dados.textoOriginal as string
    });
    
    await limparContexto(userId);
    return resultado.mensagem;
  }
  
  return `❓ Não entendi. Digite:\n\n1️⃣ Atualizar valor\n2️⃣ Manter como está\n3️⃣ Criar nova conta`;
}

// Handler para confirmação de exclusão de CONTA A PAGAR
async function processarConfirmacaoExclusaoConta(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const dados = contexto.context_data || {};
  const contaId = dados.conta_id as string;
  const contaNome = dados.conta_nome as string;
  
  const resposta = texto.toLowerCase().trim();
  
  if (resposta === 'sim' || resposta === 's' || resposta === 'confirmar') {
    const resultado = await executarExclusaoConta(userId, contaId);
    await limparContexto(userId);
    
    if (resultado.sucesso) {
      return templateContaExcluida(contaNome);
    }
    return resultado.mensagem;
  }
  
  if (resposta === 'não' || resposta === 'nao' || resposta === 'n' || resposta === 'cancelar') {
    await limparContexto(userId);
    return `👍 Ok, exclusão cancelada.`;
  }
  
  return `❓ Digite *SIM* para confirmar ou *NÃO* para cancelar.`;
}

// Handler para valor da conta
async function processarValorConta(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  const dados = contexto.context_data || {};
  const textoLower = texto.toLowerCase().trim();
  
  // Verificar se é parcelamento e usuário informou valor TOTAL
  const totalParcelas = dados.totalParcelas as number | undefined;
  const matchTotal = textoLower.match(/^total\s*r?\$?\s*(\d+(?:[.,]\d+)?)/i);
  
  if (matchTotal && totalParcelas && totalParcelas > 1) {
    const valorTotal = parseFloat(matchTotal[1].replace(',', '.'));
    const valorParcela = valorTotal / totalParcelas;
    
    console.log(`[VALOR] Usuário informou valor TOTAL: R$ ${valorTotal} / ${totalParcelas}x = R$ ${valorParcela.toFixed(2)} por parcela`);
    
    dados.valor = Math.round(valorParcela * 100) / 100; // Arredondar para 2 casas
    
    return await continuarFluxoCadastro(supabase, userId, dados);
  }
  
  // Tentar converter valor (suporta números e extenso)
  const valor = converterExtensoParaNumero(texto);
  
  if (!valor) {
    return `❓ Não entendi o valor. Digite o número ou por extenso.\n\n_Exemplos: "150", "R$ 21,90" ou "vinte e um e noventa"_`;
  }
  
  if (isNaN(valor) || valor <= 0) {
    return `❓ Valor inválido. Informe um valor maior que zero.\n\n_Exemplo: "150" ou "R$ 150,00"_`;
  }
  
  // Atualizar dados com o valor recebido
  dados.valor = valor;
  
  // Usar continuarFluxoCadastro para verificar TODOS os campos faltantes (incluindo parcelas)
  return await continuarFluxoCadastro(supabase, userId, dados);
}

// Handler LEGADO para valor da conta (mantido para referência)
async function processarValorContaLegado(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  const dados = contexto.context_data || {};
  
  const valor = converterExtensoParaNumero(texto);
  if (!valor || isNaN(valor) || valor <= 0) {
    return `❓ Valor inválido.`;
  }
  
  dados.valor = valor;
  
  const descricao = dados.descricao as string || 'Conta';
  const diaVencimento = dados.diaVencimento as number | undefined;
  const recorrente = dados.recorrente as boolean || false;
  const parcelas = dados.parcelas as number | undefined;
  
  // VERIFICAR SE AINDA FALTA O DIA DE VENCIMENTO
  if (!diaVencimento) {
    console.log('[CADASTRAR-CONTA-VALOR] Valor recebido, mas falta DIA - perguntando...');
    
    // Salvar contexto com o valor e perguntar o dia
    await salvarContexto(userId, 'awaiting_due_day' as ContextType, {
      ...dados,
      valor: valor
    });
    
    const emoji = getEmojiConta(descricao);
    return `📝 Vou cadastrar *${descricao}* por R$ ${valor.toFixed(2).replace('.', ',')}.\n\n${emoji}📅 Qual o dia do vencimento? (1-31)\n\n_Ex: "10", "dia 15", "todo dia 20"_`;
  }
  
  // Calcular due_date
  const hoje = new Date();
  let dueDate = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
  if (dueDate < hoje) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  
  // Mapear tipo para bill_type do banco usando função inteligente
  const tipoInterno = (dados.tipo as string) || 'fixed';
  const { mapearBillTypeParaBanco: mapearBillType2 } = await import('./contas-pagar.ts');
  const billType = mapearBillType2(tipoInterno as any, descricao);
  
  console.log(`[CADASTRAR-CONTA-VALOR] Tipo interno: ${tipoInterno}`);
  console.log(`[CADASTRAR-CONTA-VALOR] Descrição: ${descricao}`);
  console.log(`[CADASTRAR-CONTA-VALOR] bill_type mapeado: ${billType}`);
  
  // Inserir no banco
  const { error } = await supabase
    .from('payable_bills')
    .insert({
      user_id: userId,
      description: descricao,
      amount: valor,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      is_recurring: recorrente,
      bill_type: billType,
      recurrence_config: recorrente ? { type: 'monthly', day: diaVencimento } : null,
      installment_number: parcelas ? 1 : null,
      installment_total: parcelas || null,
    });
  
  if (error) {
    console.error('Erro ao cadastrar conta:', error);
    await limparContexto(userId);
    return `❌ Erro ao cadastrar conta. Tente novamente.`;
  }
  
  await limparContexto(userId);
  
  const emoji = getEmojiConta(descricao);
  const recorrenciaStr = parcelas 
    ? `🔢 Parcela 1/${parcelas}`
    : recorrente 
      ? '🔄 Recorrente mensal' 
      : '📌 Pagamento único';
  
  let msg = `✅ *Conta cadastrada!*\n\n`;
  msg += `${emoji} *${descricao}*\n`;
  msg += `💰 R$ ${valor.toFixed(2).replace('.', ',')}\n`;
  msg += `📅 Vence dia ${diaVencimento}\n`;
  msg += `${recorrenciaStr}\n`;
  msg += `\n🔔 _Vou te lembrar 1 dia antes!_`;
  
  return msg;
}

// Handler para valor médio de conta variável (luz, água, gás)
async function processarValorMedio(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  const dados = contexto.context_data || {};
  
  // Tentar converter valor (suporta números e extenso)
  const valorMedio = converterExtensoParaNumero(texto);
  
  if (!valorMedio) {
    return `❓ Não entendi o valor. Digite o número ou por extenso.\n\n_Exemplos: "80 reais", "R$ 21,90" ou "vinte e um e noventa"_`;
  }
  
  if (isNaN(valorMedio) || valorMedio <= 0) {
    return `❓ Valor inválido. Informe um valor maior que zero.\n\n_Exemplo: "80 reais" ou "em média 120"_`;
  }
  
  const descricao = dados.descricao as string || 'Conta';
  const diaVencimento = dados.diaVencimento as number;
  
  // Calcular due_date
  const hoje = new Date();
  let dueDate = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento);
  if (dueDate < hoje) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  
  // Mapear tipo para bill_type do banco
  const { mapearBillTypeParaBanco } = await import('./contas-pagar.ts');
  const billType = mapearBillTypeParaBanco('variable' as any, descricao);
  
  console.log(`[CADASTRAR-CONTA-VALOR-MEDIO] Descrição: ${descricao}`);
  console.log(`[CADASTRAR-CONTA-VALOR-MEDIO] Valor médio: ${valorMedio}`);
  console.log(`[CADASTRAR-CONTA-VALOR-MEDIO] bill_type mapeado: ${billType}`);
  
  // Inserir no banco
  const { error } = await supabase
    .from('payable_bills')
    .insert({
      user_id: userId,
      description: descricao,
      amount: valorMedio,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending',
      is_recurring: true,
      bill_type: billType,
      recurrence_config: { type: 'monthly', day: diaVencimento },
      notes: 'Valor médio estimado - informe o valor real quando chegar a conta',
    });
  
  if (error) {
    console.error('Erro ao cadastrar conta variável:', error);
    await limparContexto(userId);
    return `❌ Erro ao cadastrar conta. Tente novamente.`;
  }
  
  await limparContexto(userId);
  
  const emoji = getEmojiConta(descricao);
  
  let msg = `✅ *Conta cadastrada!*\n\n`;
  msg += `${emoji} *${descricao}*\n`;
  msg += `💰 R$ ${valorMedio.toFixed(2).replace('.', ',')} _(valor médio)_\n`;
  msg += `📅 Vence dia ${diaVencimento}\n`;
  msg += `📊 Valor variável _(informe quando chegar)_\n`;
  msg += `\n🔔 _Vou te lembrar 1 dia antes!_\n`;
  msg += `\n💡 _Quando chegar a conta: "${descricao.toLowerCase()} veio 95"_`;
  
  return msg;
}

// ============================================
// NOVOS HANDLERS - SISTEMA ROBUSTO DE CADASTRO
// ============================================

// Handler para tipo de conta (fixa, variável, assinatura, etc)
async function processarTipoConta(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  const dados = contexto.context_data || {};
  
  // Importar função de extração (nova versão que também retorna descrição)
  const { extrairTipoEDescricaoDeResposta, getCamposObrigatorios, validarCamposConta, getPerguntaParaCampo, getStateForField } = await import('./contas-pagar.ts');
  
  const resultado = extrairTipoEDescricaoDeResposta(texto);
  
  if (!resultado.tipo) {
    return `❌ Não entendi. Por favor, escolha:

1️⃣ Fixa  2️⃣ Variável  3️⃣ Assinatura  4️⃣ Parcelamento  5️⃣ Avulsa

_Digite o número ou o nome da conta (ex: Luz, Netflix, Aluguel)_`;
  }
  
  dados.tipo = resultado.tipo;
  
  // Se usuário respondeu com nome de conta (ex: "Luz"), atualizar descrição
  if (resultado.descricao) {
    const descricaoAtual = (dados.descricao as string || '').toLowerCase();
    // Só substituir se descrição atual é genérica
    if (!descricaoAtual || descricaoAtual === 'conta' || descricaoAtual === '') {
      dados.descricao = resultado.descricao;
      console.log(`[TIPO-CONTA] Descrição atualizada: "${descricaoAtual}" → "${resultado.descricao}"`);
    }
  }
  
  // Verificar próximo campo faltante
  const camposObrigatorios = getCamposObrigatorios(resultado.tipo);
  const camposFaltantes = validarCamposConta(dados as any, camposObrigatorios);
  
  if (camposFaltantes.length > 0) {
    const proximoCampo = camposFaltantes[0];
    
    // CORRIGIDO: assinatura é (userId, contextType, contextData)
    await salvarContexto(userId, getStateForField(proximoCampo) as ContextType, dados);
    
    return getPerguntaParaCampo(proximoCampo, dados as any);
  }
  
  // Tudo OK, cadastrar
  await limparContexto(userId);
  return await finalizarCadastroConta(supabase, userId, dados);
}

// Handler para descrição da conta
async function processarDescricaoConta(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  const dados = contexto.context_data || {};
  
  const descricao = texto.trim();
  
  if (descricao.length < 2) {
    return `❌ Descrição muito curta. Qual é a conta?

_Ex: luz, Netflix, aluguel..._`;
  }
  
  const { identificarTipoConta, getCamposObrigatorios, validarCamposConta, getPerguntaParaCampo, getStateForField } = await import('./contas-pagar.ts');
  
  // IMPORTANTE: Manter descrição ORIGINAL do usuário, apenas capitalizar
  // normalizarNomeConta só deve ser usada para COMPARAÇÃO de duplicatas
  dados.descricao = descricao.charAt(0).toUpperCase() + descricao.slice(1).toLowerCase();
  
  // Se não tem tipo ainda, tentar identificar pela descrição
  if (!dados.tipo || dados.tipo === 'unknown') {
    dados.tipo = identificarTipoConta(descricao, {});
  }
  
  return await continuarFluxoCadastro(supabase, userId, dados);
}

// Handler para info de parcelas
async function processarInfoParcelas(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  const dados = contexto.context_data || {};
  
  const { extrairParcelasTexto } = await import('./contas-pagar.ts');
  
  const parcelas = extrairParcelasTexto(texto);
  
  if (!parcelas) {
    return `❌ Não entendi. Informe a parcela atual e o total.

_Ex: "3 de 10", "parcela 5 de 12", "5/12"_`;
  }
  
  dados.parcelaAtual = parcelas.atual;
  dados.totalParcelas = parcelas.total;
  
  return await continuarFluxoCadastro(supabase, userId, dados);
}

// Função auxiliar para continuar o fluxo após receber uma resposta
async function continuarFluxoCadastro(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  dados: Record<string, unknown>
): Promise<string> {
  const { getCamposObrigatorios, validarCamposConta, getPerguntaParaCampo, getStateForField } = await import('./contas-pagar.ts');
  
  const tipo = (dados.tipo as string) || 'unknown';
  const camposObrigatorios = getCamposObrigatorios(tipo as any);
  const camposFaltantes = validarCamposConta(dados as any, camposObrigatorios);
  
  if (camposFaltantes.length > 0) {
    const proximoCampo = camposFaltantes[0];
    
    // CORRIGIDO: assinatura é (userId, contextType, contextData)
    await salvarContexto(userId, getStateForField(proximoCampo) as ContextType, dados);
    
    return getPerguntaParaCampo(proximoCampo, dados as any);
  }
  
  // VERIFICAÇÃO EXTRA: Se é parcelamento, perguntar método de pagamento
  const totalParcelas = dados.totalParcelas as number | undefined;
  const paymentMethod = dados.paymentMethod as string | undefined;
  
  if (totalParcelas && totalParcelas > 1 && !paymentMethod) {
    const descricao = dados.descricao as string;
    console.log('[FLUXO] Parcelamento sem método de pagamento. Perguntando...');
    
    await salvarContexto(userId, 'awaiting_installment_payment_method' as ContextType, dados);
    
    return `📝 Vou cadastrar o parcelamento de *${descricao}*.

💳 Esse parcelamento é no *cartão* ou no *boleto*?

1️⃣ Cartão de crédito
2️⃣ Boleto/Carnê

_Digite 1 ou 2_`;
  }
  
  // Todos os campos preenchidos, cadastrar!
  await limparContexto(userId);
  return await finalizarCadastroConta(supabase, userId, dados);
}

// Função para finalizar o cadastro
async function finalizarCadastroConta(
  supabase: ReturnType<typeof getSupabase>,
  userId: string,
  dados: Record<string, unknown>
): Promise<string> {
  const { getEmojiConta } = await import('./contas-pagar.ts');
  
  const descricao = dados.descricao as string;
  const valor = dados.valor as number | undefined;
  const diaVencimento = dados.diaVencimento as number;
  const tipo = dados.tipo as string;
  const parcelaAtual = dados.parcelaAtual as number | undefined;
  const totalParcelas = dados.totalParcelas as number | undefined;
  
  if (!descricao || !diaVencimento) {
    return '❌ Dados incompletos. Tente novamente.';
  }
  
  // Calcular due_date - suporta número (15) ou string ("15/03")
  const dueDate = calcularDataVencimento(diaVencimento);
  
  if (!dueDate) {
    console.error(`[CADASTRAR-CONTA] Data inválida: ${diaVencimento}`);
    return `❓ Não entendi a data "${diaVencimento}".

📅 Qual o dia do vencimento? (1-31)

_Ex: "15", "dia 10"_`;
  }
  
  // Mapear tipo para bill_type do banco usando função inteligente
  const { mapearBillTypeParaBanco } = await import('./contas-pagar.ts');
  const billTypeDb = mapearBillTypeParaBanco(tipo as any, descricao);
  const isRecurring = tipo === 'fixed' || tipo === 'subscription' || tipo === 'variable';
  const isInstallment = tipo === 'installment';
  
  console.log(`[CADASTRAR-CONTA] Tipo interno: ${tipo}`);
  console.log(`[CADASTRAR-CONTA] Descrição: ${descricao}`);
  console.log(`[CADASTRAR-CONTA] bill_type mapeado: ${billTypeDb}`);
  console.log(`[CADASTRAR-CONTA] Parcelas: ${parcelaAtual}/${totalParcelas}`);
  
  // Gerar installment_group_id se for parcelamento
  // IMPORTANTE: A constraint do banco exige installment_group_id quando is_installment = true
  const installmentGroupId = isInstallment ? crypto.randomUUID() : null;
  
  // Se é parcelamento com múltiplas parcelas, criar todas as parcelas restantes
  if (isInstallment && totalParcelas && totalParcelas > 1) {
    const parcelas = [];
    const baseDate = new Date(dueDate);
    
    // Parcela inicial = a que o usuário informou (ou 1 se não informou)
    const parcelaInicial = parcelaAtual || 1;
    // Quantidade a criar = total - inicial + 1 (ex: 36 - 1 + 1 = 36 parcelas)
    const quantidadeParcelas = totalParcelas - parcelaInicial + 1;
    
    console.log(`[CADASTRAR-CONTA] Criando ${quantidadeParcelas} parcelas (${parcelaInicial} até ${totalParcelas})`);
    
    for (let i = 0; i < quantidadeParcelas; i++) {
      const numeroParcela = parcelaInicial + i;
      const parcelaDate = new Date(baseDate);
      parcelaDate.setMonth(parcelaDate.getMonth() + i);
      
      parcelas.push({
        user_id: userId,
        description: descricao,
        amount: valor || null,
        due_date: parcelaDate.toISOString().split('T')[0],
        status: 'pending',
        is_recurring: false,
        bill_type: billTypeDb,
        is_installment: true,
        installment_number: numeroParcela,
        installment_total: totalParcelas,
        installment_group_id: installmentGroupId,
      });
    }
    
    const { error } = await supabase
      .from('payable_bills')
      .insert(parcelas);
    
    if (error) {
      console.error('[CADASTRAR-CONTA] Erro ao inserir parcelas:', error);
      return '❌ Erro ao cadastrar parcelamento. Tente novamente.';
    }
    
    // Template de sucesso para parcelamento
    const emoji = getEmojiConta(descricao);
    let msg = `✅ *Parcelamento cadastrado!*\n\n`;
    msg += `${emoji} *${descricao}*\n`;
    if (valor) {
      msg += `💰 R$ ${valor.toFixed(2).replace('.', ',')} por parcela\n`;
    }
    msg += `📅 Vence dia ${diaVencimento}\n`;
    msg += `🔢 Parcela ${parcelaInicial}/${totalParcelas}\n`;
    msg += `📊 ${quantidadeParcelas} parcelas cadastradas (${parcelaInicial} a ${totalParcelas})\n`;
    msg += `\n🔔 _Vou te lembrar 1 dia antes!_`;
    
    return msg;
  }
  
  // Conta única (não parcelada)
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
      is_installment: false,
      installment_number: null,
      installment_total: null,
      installment_group_id: null,
    });
  
  if (error) {
    console.error('[CADASTRAR-CONTA] Erro ao inserir:', error);
    return '❌ Erro ao cadastrar conta. Tente novamente.';
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
  
  return msg;
}

// Handler para desambiguação "cadastrar conta" (bancária ou a pagar)
async function processarSelecaoCadastrarConta(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const { processarRespostaCadastrarContaAmbiguo, getPerguntaParaCampo } = await import('./contas-pagar.ts');
  
  const escolha = processarRespostaCadastrarContaAmbiguo(texto);
  
  if (!escolha) {
    return `❓ Não entendi. Digite:

1️⃣ Para Conta Bancária (Nubank, Itaú)
2️⃣ Para Conta a Pagar (luz, Netflix)`;
  }
  
  await limparContexto(userId);
  
  if (escolha === 'bancaria') {
    // Redirecionar para cadastro de conta bancária
    return `🏦 Para cadastrar uma conta bancária, use:

_"Adicionar conta Nubank"_
_"Nova conta Itaú"_

Ou acesse o app e vá em *Contas Bancárias*.`;
  }
  
  // Conta a pagar - iniciar fluxo de cadastro
  await salvarContexto(userId, 'awaiting_bill_description' as ContextType, {});
  
  return getPerguntaParaCampo('descricao', {});
}

// ============================================
// HANDLERS DE FATURAS DE CARTÃO DE CRÉDITO
// ============================================

// Handler para dia de vencimento da fatura
async function processarDiaVencimentoFatura(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const { extrairDiaTexto, criarOuAtualizarFaturaCartao } = await import('./contas-pagar.ts');
  
  const dia = extrairDiaTexto(texto);
  
  if (!dia) {
    return `❌ Não entendi o dia. Informe um número de 1 a 31.

Ex: "10", "dia 15", "todo dia 7"`;
  }
  
  const dados = contexto.context_data || {};
  const cartaoId = dados.cartaoId as string;
  const cartaoNome = dados.cartaoNome as string;
  const valor = dados.valor as number;
  
  // Calcular data de vencimento
  const hoje = new Date();
  let dueDate = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
  if (dueDate < hoje) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
  
  // Criar fatura
  const resultado = await criarOuAtualizarFaturaCartao(userId, cartaoId, valor, dueDateStr);
  
  await limparContexto(userId);
  
  if (resultado.sucesso) {
    return `✅ *Fatura cadastrada!*

💳 ${cartaoNome}
💰 R$ ${valor.toFixed(2).replace('.', ',')}
📅 Vence dia ${dia}
🔔 _Vou te lembrar 3 dias antes!_

💡 Acesse a página de *Cartões* para ver os detalhes.`;
  }
  
  return `❌ Erro ao cadastrar fatura: ${resultado.erro}`;
}

// Handler para valor da fatura
async function processarValorFatura(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const { extrairValorTexto, criarOuAtualizarFaturaCartao } = await import('./contas-pagar.ts');
  
  const valor = extrairValorTexto(texto);
  
  if (!valor || valor <= 0) {
    return `❌ Não entendi o valor. Informe um número válido.

Ex: "2500", "R$ 1.850,00"`;
  }
  
  const dados = contexto.context_data || {};
  const cartaoId = dados.cartaoId as string;
  const cartaoNome = dados.cartaoNome as string;
  const diaVencimento = dados.diaVencimento as string;
  
  // Criar fatura
  const resultado = await criarOuAtualizarFaturaCartao(userId, cartaoId, valor, diaVencimento);
  
  await limparContexto(userId);
  
  if (resultado.sucesso) {
    const dia = new Date(diaVencimento).getDate();
    return `✅ *Fatura cadastrada!*

💳 ${cartaoNome}
💰 R$ ${valor.toFixed(2).replace('.', ',')}
📅 Vence dia ${dia}
🔔 _Vou te lembrar 3 dias antes!_

💡 Acesse a página de *Cartões* para ver os detalhes.`;
  }
  
  return `❌ Erro ao cadastrar fatura: ${resultado.erro}`;
}

// Handler para seleção de cartão (faturas)
async function processarSelecaoCartaoFatura(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const { criarOuAtualizarFaturaCartao } = await import('./contas-pagar.ts');
  
  const dados = contexto.context_data || {};
  const cartoes = dados.cartoes as Array<{ id: string; name: string }> || [];
  const valor = dados.valor as number;
  const diaVencimento = dados.diaVencimento as string;
  
  // Tentar interpretar a resposta
  const textoLimpo = texto.trim().toLowerCase();
  let cartaoSelecionado: { id: string; name: string } | null = null;
  
  // Verificar se é número
  const numero = parseInt(textoLimpo);
  if (!isNaN(numero) && numero >= 1 && numero <= cartoes.length) {
    cartaoSelecionado = cartoes[numero - 1];
  } else {
    // ✅ CORREÇÃO: Usar aliases para encontrar cartão (roxinho → nubank, laranjinha → inter)
    const { buscarCartaoFuzzy } = await import('./cartao-credito.ts');
    const fuzzyResult = buscarCartaoFuzzy(texto, cartoes);
    
    if (fuzzyResult.encontrado && fuzzyResult.cartao) {
      cartaoSelecionado = fuzzyResult.cartao;
    } else {
      // Fallback: busca simples por nome
      cartaoSelecionado = cartoes.find(c => 
        c.name.toLowerCase().includes(textoLimpo) || 
        textoLimpo.includes(c.name.toLowerCase())
      ) || null;
    }
  }
  
  // Opção de criar novo cartão
  if (numero === cartoes.length + 1 || textoLimpo.includes('outro') || textoLimpo.includes('novo')) {
    await salvarContexto(userId, 'awaiting_card_creation_confirmation' as ContextType, {
      ...dados,
      criarNovoCartao: true
    });
    
    return `💳 Qual o nome do novo cartão?

Ex: "Nubank", "Itaú Platinum", "Bradesco"`;
  }
  
  if (!cartaoSelecionado) {
    let opcoes = cartoes.map((c, i) => `${i + 1}️⃣ ${c.name}`).join('\n');
    opcoes += `\n${cartoes.length + 1}️⃣ Outro cartão (cadastrar novo)`;
    
    return `❓ Não entendi. Digite o número ou nome do cartão:

${opcoes}`;
  }
  
  // Se temos valor e data, criar fatura direto
  if (valor && diaVencimento) {
    const resultado = await criarOuAtualizarFaturaCartao(userId, cartaoSelecionado.id, valor, diaVencimento);
    
    await limparContexto(userId);
    
    if (resultado.sucesso) {
      const dia = new Date(diaVencimento).getDate();
      return `✅ *Fatura cadastrada!*

💳 ${cartaoSelecionado.name}
💰 R$ ${valor.toFixed(2).replace('.', ',')}
📅 Vence dia ${dia}
🔔 _Vou te lembrar 3 dias antes!_`;
    }
    
    return `❌ Erro ao cadastrar fatura: ${resultado.erro}`;
  }
  
  // Falta valor ou data - perguntar
  if (!valor) {
    await salvarContexto(userId, 'awaiting_invoice_amount' as ContextType, {
      cartaoId: cartaoSelecionado.id,
      cartaoNome: cartaoSelecionado.name,
      diaVencimento
    });
    
    return `💳 Fatura do *${cartaoSelecionado.name}*

💰 Qual o valor da fatura?

Ex: "2500", "R$ 1.850,00"`;
  }
  
  if (!diaVencimento) {
    await salvarContexto(userId, 'awaiting_invoice_due_date' as ContextType, {
      cartaoId: cartaoSelecionado.id,
      cartaoNome: cartaoSelecionado.name,
      valor
    });
    
    return `💳 Fatura do *${cartaoSelecionado.name}*

📅 Qual o dia de vencimento?

Ex: "10", "dia 15"`;
  }
  
  return '❌ Erro inesperado. Tente novamente.';
}

// Handler para confirmação de criar cartão
async function processarConfirmacaoCriarCartao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const dados = contexto.context_data || {};
  const textoLimpo = texto.trim();
  
  // Se está criando novo cartão, o texto é o nome do cartão
  if (dados.criarNovoCartao) {
    const nomeCartao = textoLimpo;
    
    // Perguntar o limite
    await salvarContexto(userId, 'awaiting_card_limit' as ContextType, {
      ...dados,
      nomeCartao
    });
    
    return `💳 Cartão: *${nomeCartao}*

💰 Qual o limite do cartão?

Ex: "5000", "R$ 10.000"`;
  }
  
  // Opção 1 ou 2 para criar cartão ou conta avulsa
  const opcao = textoLimpo;
  
  if (opcao === '1' || opcao.includes('cartão') || opcao.includes('cartao')) {
    // Cadastrar cartão e fatura
    await salvarContexto(userId, 'awaiting_card_limit' as ContextType, {
      ...dados,
      criarCartao: true
    });
    
    const bancoNome = dados.bancoNome as string || 'Novo';
    const nomeCapitalizado = bancoNome.charAt(0).toUpperCase() + bancoNome.slice(1);
    
    return `💳 Vou cadastrar o cartão *${nomeCapitalizado}*.

💰 Qual o limite do cartão?

Ex: "5000", "R$ 10.000"`;
  }
  
  if (opcao === '2' || opcao.includes('avulsa') || opcao.includes('conta')) {
    // Cadastrar como conta avulsa (fallback)
    const valor = dados.valor as number;
    const diaVencimento = dados.diaVencimento as number;
    const bancoNome = dados.bancoNome as string || 'Cartão';
    
    await limparContexto(userId);
    
    // Calcular data de vencimento
    const hoje = new Date();
    let dueDate = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento || 10);
    if (dueDate < hoje) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
    
    const supabase = getSupabase();
    const nomeCapitalizado = bancoNome.charAt(0).toUpperCase() + bancoNome.slice(1);
    
    const { error } = await supabase
      .from('payable_bills')
      .insert({
        user_id: userId,
        description: `Fatura ${nomeCapitalizado}`,
        amount: valor || 0,
        due_date: dueDateStr,
        bill_type: 'credit_card',
        status: 'pending',
        is_recurring: false
      });
    
    if (!error) {
      let msg = `✅ *Fatura cadastrada como conta avulsa!*

💳 Fatura ${nomeCapitalizado}`;
      
      if (valor) {
        msg += `\n💰 R$ ${valor.toFixed(2).replace('.', ',')}`;
      }
      
      msg += `\n📅 Vence dia ${diaVencimento || 10}`;
      msg += `\n\n💡 _Dica: Cadastre seu cartão para ter controle completo das faturas!_`;
      
      return msg;
    }
    
    return '❌ Erro ao cadastrar fatura. Tente novamente.';
  }
  
  return `❓ Não entendi. Digite:

1️⃣ Para cadastrar o cartão e a fatura
2️⃣ Para cadastrar só a fatura como conta avulsa`;
}

// Handler para limite do cartão
async function processarLimiteCartao(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const { extrairValorTexto, criarOuAtualizarFaturaCartao } = await import('./contas-pagar.ts');
  
  const limite = extrairValorTexto(texto);
  
  if (!limite || limite <= 0) {
    return `❌ Não entendi o limite. Informe um número válido.

Ex: "5000", "R$ 10.000"`;
  }
  
  const dados = contexto.context_data || {};
  const nomeCartao = dados.nomeCartao as string || dados.bancoNome as string || 'Novo Cartão';
  const valor = dados.valor as number;
  const diaVencimento = dados.diaVencimento as number;
  
  const supabase = getSupabase();
  
  // Criar o cartão
  const { data: novoCartao, error: erroCartao } = await supabase
    .from('credit_cards')
    .insert({
      user_id: userId,
      name: nomeCartao.charAt(0).toUpperCase() + nomeCartao.slice(1),
      brand: 'visa', // Default
      credit_limit: limite,
      available_limit: limite,
      closing_day: 1, // Default
      due_day: diaVencimento || 10,
      is_active: true
    })
    .select()
    .single();
  
  if (erroCartao || !novoCartao) {
    await limparContexto(userId);
    return `❌ Erro ao criar cartão: ${erroCartao?.message || 'Erro desconhecido'}`;
  }
  
  console.log(`[FATURA-CARTAO] Cartão criado: ${novoCartao.id}`);
  
  // Se temos valor, criar a fatura também
  if (valor) {
    const hoje = new Date();
    let dueDate = new Date(hoje.getFullYear(), hoje.getMonth(), diaVencimento || 10);
    if (dueDate < hoje) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    const dueDateStr = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`;
    
    const resultado = await criarOuAtualizarFaturaCartao(userId, novoCartao.id, valor, dueDateStr);
    
    await limparContexto(userId);
    
    if (resultado.sucesso) {
      return `✅ *Cartão e fatura cadastrados!*

💳 ${novoCartao.name}
💰 Limite: R$ ${limite.toFixed(2).replace('.', ',')}
📄 Fatura: R$ ${valor.toFixed(2).replace('.', ',')}
📅 Vence dia ${diaVencimento || 10}
🔔 _Vou te lembrar 3 dias antes!_`;
    }
  }
  
  await limparContexto(userId);
  
  return `✅ *Cartão cadastrado!*

💳 ${novoCartao.name}
💰 Limite: R$ ${limite.toFixed(2).replace('.', ',')}

💡 Para adicionar a fatura, diga:
_"Fatura ${novoCartao.name} 2500 dia 10"_`;
}

// ============================================
// FASE 3.4: HANDLERS DE PARCELAMENTOS
// ============================================

// Handler para método de pagamento do parcelamento (cartão ou boleto)
async function processarMetodoPagamentoParcelamento(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const { listarCartoesUsuario, criarContaDiretamente } = await import('./contas-pagar.ts');
  
  const textoLimpo = texto.trim().toLowerCase();
  const dados = contexto.context_data || {};
  
  // Detectar escolha: 1 = cartão, 2 = boleto
  const ehCartao = textoLimpo === '1' || 
                   textoLimpo.includes('cartão') || 
                   textoLimpo.includes('cartao') ||
                   textoLimpo.includes('crédito') ||
                   textoLimpo.includes('credito');
  
  const ehBoleto = textoLimpo === '2' || 
                   textoLimpo.includes('boleto') || 
                   textoLimpo.includes('carnê') ||
                   textoLimpo.includes('carne');
  
  if (!ehCartao && !ehBoleto) {
    return `❓ Não entendi. Digite:

1️⃣ Para *cartão de crédito*
2️⃣ Para *boleto/carnê*`;
  }
  
  // Se escolheu BOLETO - cadastrar direto como conta a pagar
  if (ehBoleto) {
    const resultado = await criarContaDiretamente(userId, {
      tipo: 'installment',
      descricao: dados.descricao as string,
      valor: dados.valor as number,
      diaVencimento: dados.diaVencimento as number,
      parcelaAtual: dados.parcelaAtual as number,
      totalParcelas: dados.totalParcelas as number,
      recorrencia: 'unica',
      paymentMethod: 'boleto'
    });
    
    await limparContexto(userId);
    return resultado.mensagem;
  }
  
  // Se escolheu CARTÃO - listar cartões do usuário
  const cartoes = await listarCartoesUsuario(userId);
  
  if (cartoes.length === 0) {
    // Usuário não tem cartões - cadastrar como boleto mesmo
    const resultado = await criarContaDiretamente(userId, {
      tipo: 'installment',
      descricao: dados.descricao as string,
      valor: dados.valor as number,
      diaVencimento: dados.diaVencimento as number,
      parcelaAtual: dados.parcelaAtual as number,
      totalParcelas: dados.totalParcelas as number,
      recorrencia: 'unica',
      paymentMethod: 'boleto'
    });
    
    await limparContexto(userId);
    return `⚠️ Você não tem cartões cadastrados.

${resultado.mensagem}

💡 _Cadastrei como boleto. Para adicionar cartões, acesse a página de Cartões no app._`;
  }
  
  // ✅ NOVO: Verificar se o usuário já mencionou qual cartão na resposta
  // Ex: "Cartão no Nubank" → detectar "Nubank" e usar direto
  const cartaoMencionado = cartoes.find(cartao => {
    const nomeCartao = cartao.name.toLowerCase();
    // Verificar se o nome do cartão está na resposta
    return textoLimpo.includes(nomeCartao) ||
           // Variações comuns de bancos
           (nomeCartao.includes('nubank') && (textoLimpo.includes('nubank') || textoLimpo.includes('nu '))) ||
           (nomeCartao.includes('itau') && (textoLimpo.includes('itau') || textoLimpo.includes('itaú'))) ||
           (nomeCartao.includes('bradesco') && textoLimpo.includes('bradesco')) ||
           (nomeCartao.includes('santander') && textoLimpo.includes('santander')) ||
           (nomeCartao.includes('inter') && textoLimpo.includes('inter')) ||
           (nomeCartao.includes('c6') && textoLimpo.includes('c6'));
  });
  
  if (cartaoMencionado) {
    // ✅ Cartão já identificado na resposta - pular pergunta!
    console.log(`[FLUXO] Cartão "${cartaoMencionado.name}" detectado na resposta do usuário`);
    
    const resultado = await criarContaDiretamente(userId, {
      tipo: 'installment',
      descricao: dados.descricao as string,
      valor: dados.valor as number,
      diaVencimento: dados.diaVencimento as number,
      parcelaAtual: dados.parcelaAtual as number,
      totalParcelas: dados.totalParcelas as number,
      recorrencia: 'unica',
      paymentMethod: 'credit_card',
      creditCardId: cartaoMencionado.id,
      creditCardName: cartaoMencionado.name
    });
    
    await limparContexto(userId);
    return resultado.mensagem;
  }
  
  // Se só tem 1 cartão, usa esse automaticamente
  if (cartoes.length === 1) {
    console.log(`[FLUXO] Usuário tem apenas 1 cartão: ${cartoes[0].name}`);
    
    const resultado = await criarContaDiretamente(userId, {
      tipo: 'installment',
      descricao: dados.descricao as string,
      valor: dados.valor as number,
      diaVencimento: dados.diaVencimento as number,
      parcelaAtual: dados.parcelaAtual as number,
      totalParcelas: dados.totalParcelas as number,
      recorrencia: 'unica',
      paymentMethod: 'credit_card',
      creditCardId: cartoes[0].id,
      creditCardName: cartoes[0].name
    });
    
    await limparContexto(userId);
    return resultado.mensagem;
  }
  
  // Múltiplos cartões e não mencionou qual - perguntar
  await salvarContexto(userId, 'awaiting_installment_card_selection', {
    ...dados,
    cartoes
  });
  
  let opcoes = cartoes.map((c, i) => `${i + 1}️⃣ ${c.name}`).join('\n');
  
  return `💳 Em qual cartão está esse parcelamento?

${opcoes}

_Digite o número ou nome do cartão_`;
}

// Handler para seleção de cartão no parcelamento
async function processarSelecaoCartaoParcelamento(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const { criarContaDiretamente } = await import('./contas-pagar.ts');
  
  const dados = contexto.context_data || {};
  const cartoes = dados.cartoes as Array<{ id: string; name: string }> || [];
  const textoLimpo = texto.trim().toLowerCase();
  
  // Tentar encontrar o cartão pela resposta
  let cartaoSelecionado: { id: string; name: string } | null = null;
  
  // Por número (1, 2, 3...)
  const numero = parseInt(textoLimpo);
  if (!isNaN(numero) && numero >= 1 && numero <= cartoes.length) {
    cartaoSelecionado = cartoes[numero - 1];
  }
  
  // Por nome ou alias
  if (!cartaoSelecionado) {
    // ✅ CORREÇÃO: Usar aliases para encontrar cartão (roxinho → nubank, laranjinha → inter)
    const { buscarCartaoFuzzy } = await import('./cartao-credito.ts');
    const fuzzyResult = buscarCartaoFuzzy(texto, cartoes);
    
    if (fuzzyResult.encontrado && fuzzyResult.cartao) {
      cartaoSelecionado = fuzzyResult.cartao;
    } else {
      // Fallback: busca simples por nome
      cartaoSelecionado = cartoes.find(c => 
        c.name.toLowerCase().includes(textoLimpo) ||
        textoLimpo.includes(c.name.toLowerCase())
      ) || null;
    }
  }
  
  if (!cartaoSelecionado) {
    let opcoes = cartoes.map((c, i) => `${i + 1}️⃣ ${c.name}`).join('\n');
    return `❓ Não encontrei esse cartão. Escolha:

${opcoes}`;
  }
  
  // Cadastrar parcelamento vinculado ao cartão (em payable_bills)
  const resultado = await criarContaDiretamente(userId, {
    tipo: 'installment',
    descricao: dados.descricao as string,
    valor: dados.valor as number,
    diaVencimento: dados.diaVencimento as number,
    parcelaAtual: dados.parcelaAtual as number,
    totalParcelas: dados.totalParcelas as number,
    recorrencia: 'unica',
    paymentMethod: 'credit_card',
    creditCardId: cartaoSelecionado.id
  });
  
  // TAMBÉM criar transações em credit_card_transactions para aparecer na fatura
  const supabase = getSupabase();
  const valor = dados.valor as number;
  const totalParcelas = dados.totalParcelas as number || 1;
  const parcelaAtual = dados.parcelaAtual as number || 1;
  const descricao = dados.descricao as string;
  
  const installmentGroupId = crypto.randomUUID();
  const transacoes = [];
  
  for (let i = 0; i < (totalParcelas - parcelaAtual + 1); i++) {
    const numeroParcela = parcelaAtual + i;
    transacoes.push({
      user_id: userId,
      credit_card_id: cartaoSelecionado.id,
      amount: valor,
      description: totalParcelas > 1 
        ? `${descricao} (${numeroParcela}/${totalParcelas})` 
        : descricao,
      purchase_date: new Date().toISOString().split('T')[0],
      is_installment: totalParcelas > 1,
      total_installments: totalParcelas,
      installment_number: numeroParcela,
      installment_group_id: totalParcelas > 1 ? installmentGroupId : null,
      source: 'whatsapp'
    });
  }
  
  const { error: insertError } = await supabase
    .from('credit_card_transactions')
    .insert(transacoes);
  
  if (insertError) {
    console.error('[PARCELAMENTO] Erro ao criar transações de cartão:', insertError);
  } else {
    console.log(`[PARCELAMENTO] ${transacoes.length} transações criadas em credit_card_transactions`);
  }
  
  await limparContexto(userId);
  
  // Adicionar info do cartão na mensagem
  if (resultado.mensagem.includes('✅')) {
    return resultado.mensagem.replace('✅', `✅ 💳 *${cartaoSelecionado.name}*\n`);
  }
  
  return resultado.mensagem;
}

// ============================================
// FASE 3.3: HANDLERS DE REGISTRO DE PAGAMENTOS
// ============================================

// Handler para valor do pagamento (conta variável)
async function processarValorPagamento(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const { marcarComoPago } = await import('./contas-pagar.ts');
  
  const dados = contexto.context_data || {};
  const billId = dados.billId as string;
  const descricao = dados.descricao as string;
  
  // Converter valor
  const valor = converterExtensoParaNumero(texto);
  
  if (!valor || isNaN(valor) || valor <= 0) {
    return `❓ Valor inválido. Digite o valor da conta de *${descricao}*.\n\n_Exemplo: "185" ou "R$ 185,00"_`;
  }
  
  // Marcar como pago
  const resultado = await marcarComoPago(userId, billId, valor);
  
  await limparContexto(userId);
  return resultado.mensagem;
}

// Handler para nome da conta para pagamento
async function processarNomeContaPagamento(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const { buscarContaPendente, marcarComoPago } = await import('./contas-pagar.ts');
  
  const nomeConta = texto.trim();
  
  if (!nomeConta) {
    return `❓ Qual conta você pagou?\n\n💡 Exemplos:\n• _"luz"_\n• _"aluguel"_\n• _"netflix"_`;
  }
  
  // Buscar conta pendente
  const conta = await buscarContaPendente(userId, nomeConta);
  
  if (!conta) {
    await limparContexto(userId);
    return `❓ Não encontrei conta de *${nomeConta}* pendente.\n\n💡 Verifique:\n• _"contas a pagar"_ para ver suas contas`;
  }
  
  // Se tem valor, marcar como pago direto
  if (conta.amount) {
    const resultado = await marcarComoPago(userId, conta.id, conta.amount);
    await limparContexto(userId);
    return resultado.mensagem;
  }
  
  // Se não tem valor (conta variável), perguntar
  await salvarContexto(userId, 'awaiting_payment_value' as ContextType, {
    billId: conta.id,
    descricao: conta.description
  });
  
  return `💰 Quanto veio a conta de *${conta.description}*?\n\n_Digite o valor, ex: "185" ou "R$ 185,00"_`;
}

// Handler para seleção de conta bancária para pagamento
async function processarSelecaoContaPagamento(
  texto: string,
  contexto: ContextoConversa,
  userId: string
): Promise<string> {
  const supabase = getSupabase();
  
  const dados = contexto.context_data || {};
  const billId = dados.billId as string;
  const descricao = dados.descricao as string;
  const valorFinal = dados.valorFinal as number;
  const metodoPagamento = dados.metodoPagamento as string | undefined;
  const contasDisponiveis = dados.contasDisponiveis as Array<{ id: string; name: string }> || [];
  
  if (!billId || !valorFinal) {
    await limparContexto(userId);
    return '❌ Erro no contexto. Por favor, tente novamente.';
  }
  
  // Tentar identificar a conta pela resposta
  const textoLower = texto.toLowerCase().trim();
  let contaSelecionada: { id: string; name: string } | null = null;
  
  // Verificar se é um número (1, 2, 3...)
  const numero = parseInt(textoLower, 10);
  if (!isNaN(numero) && numero >= 1 && numero <= contasDisponiveis.length) {
    contaSelecionada = contasDisponiveis[numero - 1];
  }
  
  // Se não é número, tentar por nome
  if (!contaSelecionada) {
    for (const conta of contasDisponiveis) {
      if (conta.name.toLowerCase().includes(textoLower) || textoLower.includes(conta.name.toLowerCase())) {
        contaSelecionada = conta;
        break;
      }
    }
  }
  
  // Aliases de bancos
  if (!contaSelecionada) {
    const aliases: Record<string, string[]> = {
      'nubank': ['nu', 'roxinho', 'roxo'],
      'itau': ['itaú', 'ita', 'laranjinha'],
      'bradesco': ['brades', 'vermelhinho'],
      'inter': ['laranjão'],
      'c6': ['pretinho', 'carbono'],
    };
    
    for (const [banco, aliasesList] of Object.entries(aliases)) {
      if (textoLower.includes(banco) || aliasesList.some(a => textoLower.includes(a))) {
        for (const conta of contasDisponiveis) {
          const contaNome = conta.name.toLowerCase();
          if (contaNome.includes(banco) || aliasesList.some(a => contaNome.includes(a))) {
            contaSelecionada = conta;
            break;
          }
        }
        if (contaSelecionada) break;
      }
    }
  }
  
  if (!contaSelecionada) {
    let msg = `❓ Não entendi. Digite o *número* ou *nome* da conta:\n\n`;
    contasDisponiveis.forEach((c: { id: string; name: string }, i: number) => {
      msg += `${i + 1}️⃣ ${c.name}\n`;
    });
    return msg;
  }
  
  // Importar função de marcar como pago com transação
  const { marcarComoPago } = await import('./contas-pagar.ts');
  
  // Buscar a conta a pagar
  const { data: conta } = await supabase
    .from('payable_bills')
    .select('*')
    .eq('id', billId)
    .eq('user_id', userId)
    .single();
  
  if (!conta) {
    await limparContexto(userId);
    return '❌ Conta não encontrada.';
  }
  
  const agora = new Date().toISOString();
  
  // 1. Atualizar status para pago
  await supabase
    .from('payable_bills')
    .update({
      status: 'paid',
      paid_at: agora,
      paid_amount: valorFinal,
      payment_method: metodoPagamento || conta.payment_method,
      payment_account_id: contaSelecionada.id,
      updated_at: agora
    })
    .eq('id', billId);
  
  // 2. Registrar no histórico
  await supabase.from('bill_payment_history').insert({
    bill_id: billId,
    user_id: userId,
    payment_date: agora,
    amount_paid: valorFinal,
    payment_method: metodoPagamento || conta.payment_method,
    account_from_id: contaSelecionada.id
  });
  
  // 3. Criar transação de despesa
  await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: contaSelecionada.id,
      type: 'expense',
      amount: valorFinal,
      description: `Pagamento: ${conta.description}`,
      category_id: conta.category_id,
      transaction_date: agora.split('T')[0],
      is_recurring: false,
      is_paid: true,
      source: 'whatsapp'
    });
  
  // 4. Atualizar saldo da conta (decrementa)
  const { data: contaBancaria } = await supabase
    .from('accounts')
    .select('current_balance')
    .eq('id', contaSelecionada.id)
    .single();
  
  const novoSaldo = contaBancaria ? contaBancaria.current_balance - valorFinal : 0;
  
  if (contaBancaria) {
    await supabase
      .from('accounts')
      .update({ current_balance: novoSaldo })
      .eq('id', contaSelecionada.id);
  }
  
  // 5. Buscar estatísticas do mês
  const mesAtual = new Date().toISOString().slice(0, 7);
  const { data: contasMes } = await supabase
    .from('payable_bills')
    .select('id, status')
    .eq('user_id', userId)
    .gte('due_date', `${mesAtual}-01`)
    .lte('due_date', `${mesAtual}-31`);
  
  const totalContas = contasMes?.length || 0;
  const contasPagas = contasMes?.filter((c: any) => c.status === 'paid').length || 0;
  
  // 6. Calcular total pago no mês
  const { data: pagamentosMes } = await supabase
    .from('payable_bills')
    .select('paid_amount')
    .eq('user_id', userId)
    .eq('status', 'paid')
    .gte('paid_at', `${mesAtual}-01`);
  
  const totalPagoMes = pagamentosMes?.reduce((sum: number, p: any) => sum + (p.paid_amount || 0), 0) || 0;
  
  await limparContexto(userId);
  
  const emoji = getEmojiConta(conta.description);
  const emojiBanco = getEmojiBanco(contaSelecionada.name);
  const mesNome = new Date().toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  
  // Formatar valor
  const formatarMoeda = (valor: number) => `R$ ${valor.toFixed(2).replace('.', ',')}`;
  
  // Template completo
  let msg = `✅ *Pagamento registrado!*\n\n`;
  msg += `${emoji} *${conta.description}*\n`;
  msg += `💰 ${formatarMoeda(valorFinal)}\n`;
  
  // Info de parcelas se for parcelamento/financiamento
  if (conta.is_installment && conta.installment_number && conta.installment_total) {
    msg += `📋 Parcela ${conta.installment_number}/${conta.installment_total}\n`;
    const restante = (conta.installment_total - conta.installment_number) * valorFinal;
    const parcelasRestantes = conta.installment_total - conta.installment_number;
    msg += `💵 Restante: ${formatarMoeda(restante)} (${parcelasRestantes} parcelas)\n`;
  }
  
  msg += `🏦 Conta: ${contaSelecionada.name}\n`;
  
  if (conta.due_date) {
    const vencimento = new Date(conta.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    msg += `📅 Vencimento: ${vencimento}\n`;
  }
  
  if (metodoPagamento) {
    const metodoNomes: Record<string, string> = {
      'pix': 'PIX', 'debit': 'Débito', 'credit': 'Crédito', 'boleto': 'Boleto',
      'transfer': 'Transferência', 'cash': 'Dinheiro', 'auto_debit': 'Débito Automático'
    };
    msg += `💳 Via: ${metodoNomes[metodoPagamento] || metodoPagamento}\n`;
  }
  
  msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💳 Saldo ${contaSelecionada.name}: ${formatarMoeda(novoSaldo)}\n`;
  msg += `📊 Contas pagas este mês: ${contasPagas}/${totalContas}\n`;
  msg += `💸 Total pago em ${mesNome}: ${formatarMoeda(totalPagoMes)}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━\n`;
  
  // Próxima parcela se for parcelamento
  if (conta.is_installment && conta.installment_number && conta.installment_total && conta.installment_number < conta.installment_total) {
    const proximaData = new Date(conta.due_date);
    proximaData.setMonth(proximaData.getMonth() + 1);
    const proximaFormatada = proximaData.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    msg += `\n🔄 Próxima: ${proximaFormatada}`;
  }
  
  return msg;
}

// Mapeia bill_type para categoria de transação
function mapBillTypeToCategory(billType: string): string {
  const mapping: Record<string, string> = {
    'service': 'Serviços',
    'housing': 'Moradia',
    'telecom': 'Telecomunicações',
    'subscription': 'Assinaturas',
    'loan': 'Empréstimos',
    'insurance': 'Seguros',
    'healthcare': 'Saúde',
    'education': 'Educação',
    'tax': 'Impostos',
    'credit_card': 'Cartão de Crédito',
    'other': 'Outros'
  };
  return mapping[billType] || 'Contas a Pagar';
}
