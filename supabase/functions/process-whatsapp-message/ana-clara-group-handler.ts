/**
 * Modo grupo Ana Clara — silêncio, gatilhos, sessão curta, comprovante, resposta via grupo.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { buscarUltimaInteracao, enviarViaEdgeFunction } from './utils.ts';
import * as imageReader from './image-reader.ts';
import {
  loadAnaClaraGroupConfig,
  groupSessionPhoneKey,
  isParticipantAllowed,
  textContainsAgentTrigger,
  isDismissPhrase,
  isEnabledGroupJid,
  normalizeForTriggerMatch,
  type AnaClaraGroupRuntimeConfig,
} from './ana-clara-group-config.ts';
import { insertGroupPassiveMemory, fetchRecentGroupMemoryLines } from './ana-clara-group-memory.ts';
import { salvarContexto } from './context-manager.ts';
import { classificarIntencaoNLP, type AgentEnrichment } from './nlp-classifier.ts';
import { marcarComoPago, type TipoIntencaoContaPagar } from './contas-pagar.ts';
import {
  executeAnaClaraCoreFlow,
  resolveAnaClaraCoreRoute,
  type AnaClaraCoreRoute,
} from './ana-clara-core-executor.ts';
import {
  buildSoulPromptBlock,
  resolvePreferredFirstName,
  type SoulConfig,
  type UserContext,
  type AutonomyRules,
} from '../_shared/ana-clara-soul.ts';
import { isPrimeiraInteracaoDia } from './humanization.ts';

export interface AnaClaraGroupInboundParams {
  supabase: SupabaseClient;
  user: { id: string; full_name: string; email: string };
  message: { id: string };
  groupJid: string;
  participantPhone: string;
  participantName: string | null;
  groupName: string | null;
  content: string;
  messageType: string;
  isAudio: boolean;
  isImage: boolean;
  imageMessageId?: string;
  soulConfig: SoulConfig;
  userContext: UserContext;
  autonomyConfig: AutonomyRules;
}

const GROUP_CONTAS_PAGAR_INTENTS = new Set<TipoIntencaoContaPagar>([
  'LISTAR_CONTAS_PAGAR',
  'CONTAS_VENCENDO',
  'CONTAS_VENCIDAS',
  'CONTAS_DO_MES',
  'RESUMO_CONTAS_MES',
  'CADASTRAR_CONTA_PAGAR',
  'EDITAR_CONTA_PAGAR',
  'EXCLUIR_CONTA_PAGAR',
  'MARCAR_CONTA_PAGA',
  'VALOR_CONTA_VARIAVEL',
  'HISTORICO_CONTA',
  'PAGAR_FATURA_CARTAO',
  'DESFAZER_PAGAMENTO',
  'RESUMO_PAGAMENTOS_MES',
  'CONTAS_AMBIGUO',
  'CADASTRAR_CONTA_AMBIGUO',
]);

export function getGroupReplyStrategy(
  nlp: { intencao: string; resposta_conversacional?: string | null },
): AnaClaraCoreRoute | 'conversation' {
  const route = resolveAnaClaraCoreRoute(
    { intencao: nlp.intencao, confianca: 0.99, entidades: {} as Record<string, unknown> },
    '',
  );
  return route === 'other' || route === 'unknown' ? 'conversation' : route;
}

const GROUP_COMMON_NON_NAMES = new Set([
  'sim', 'nao', 'não', 'ok', 'beleza', 'blz', 'bom', 'boa', 'bem', 'mal',
  'mas', 'pois', 'entao', 'então', 'tipo', 'cara', 'mano', 'pow', 'po', 'pô',
  'legal', 'show', 'top', 'massa', 'verdade', 'claro', 'certo', 'isso', 'aquilo',
  'esse', 'essa', 'este', 'esta', 'aqui', 'ali', 'bora', 'vamos', 'pode',
  'pronto', 'feito', 'tudo', 'nada', 'algo', 'obrigado', 'obrigada', 'valeu',
  'brigado', 'brigada', 'tmj', 'vlw', 'ah', 'ahh', 'eita', 'uai', 'ue', 'ué',
  'hum', 'hmm', 'aham', 'uhum', 'pera', 'perai', 'calma', 'espera', 'olha',
  'veja', 'enfim', 'inclusive', 'porem', 'porém', 'contudo', 'todavia',
]);

export function removeAgentTriggerNames(text: string, triggerNames: string[]): string {
  let out = text;
  for (const trigger of triggerNames) {
    const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    out = out.replace(new RegExp(escaped, 'ig'), ' ');
  }
  return out.replace(/\s+/g, ' ').replace(/\s+([,!.?;:])/g, '$1').trim();
}

export function isCallingAnotherPerson(text: string, triggerNames: string[]): boolean {
  if (!text) return false;
  const lower = normalizeForTriggerMatch(text).trim();
  const callingPatterns = [
    /^(?:fala|oi|e\s*a[ií]|opa|hey|ei|salve|ola)\s+([a-záàâãéèêíïóôõöúçñ]+)/i,
    /^([a-záàâãéèêíïóôõöúçñ]{2,})\s*,/i,
  ];

  for (const pattern of callingPatterns) {
    const match = lower.match(pattern);
    if (!match) continue;
    const calledName = match[1].trim();
    if (GROUP_COMMON_NON_NAMES.has(calledName)) continue;
    const isAgent = triggerNames.some((n) => normalizeForTriggerMatch(n) === calledName);
    if (!isAgent && calledName.length >= 2) return true;
  }

  return false;
}

export function isSimpleGroupGreeting(text: string): boolean {
  const normalized = normalizeForTriggerMatch(text)
    .replace(/[!?.,;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return true;

  const greetings = new Set(['fala', 'oi', 'e ai', 'opa', 'hey', 'ei', 'salve', 'ola']);
  if (greetings.has(normalized)) return true;

  const words = normalized.split(' ').filter(Boolean);
  if (words.length <= 3 && words.includes('aqui')) return true;

  return false;
}

export function buildDeterministicGroupGreeting(): string {
  return 'Oi. Tô por aqui. Manda o que você precisa.';
}

export function sanitizeGroupReply(reply: string): string {
  let out = reply.trim();
  out = out.replace(/_?\s*Ana Clara\s*•\s*Personal Finance_?\s*🙋🏻‍♀️?/gi, '');
  out = out.replace(/🙋🏻‍♀️/g, '');
  out = out.replace(/^co[eé],?\s+/i, 'Oi, ');
  out = out.replace(/^fala,?\s+/i, 'Oi, ');
  out = out.replace(/^e aí,?\s+/i, 'Oi, ');
  out = out.replace(/me chama no privado pra detalhar\.?/gi, 'se precisar, eu continuo por aqui.');
  out = out.replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

export function detectBalanceAccountFilter(
  text: string,
  nlpConta?: string | null,
): string | null {
  if (nlpConta?.trim()) return nlpConta.trim();

  const textoLower = normalizeForTriggerMatch(text);
  const bancosConhecidos = [
    { nome: 'nubank', aliases: ['nubank', 'roxinho', 'roxo', 'nu'] },
    { nome: 'itau', aliases: ['itau', 'laranjinha'] },
    { nome: 'bradesco', aliases: ['bradesco', 'brades'] },
    { nome: 'santander', aliases: ['santander', 'san'] },
    { nome: 'inter', aliases: ['inter', 'banco inter'] },
    { nome: 'c6', aliases: ['c6', 'c6 bank'] },
    { nome: 'caixa', aliases: ['caixa', 'cef'] },
    { nome: 'bb', aliases: ['bb', 'banco do brasil', 'brasil'] },
    { nome: 'original', aliases: ['original'] },
    { nome: 'next', aliases: ['next'] },
    { nome: 'picpay', aliases: ['picpay'] },
    { nome: 'mercadopago', aliases: ['mercadopago', 'mercado pago'] },
  ];

  for (const banco of bancosConhecidos) {
    if (banco.aliases.some((alias) => textoLower.includes(alias))) return banco.nome;
  }

  return null;
}

export function isSessionOwnedByParticipant(
  priorData: Record<string, unknown> | null,
  participantPhone: string,
): boolean {
  const sessionPhone = String(priorData?.activated_by_phone || '').replace(/\D/g, '');
  const currentPhone = String(participantPhone || '').replace(/\D/g, '');

  if (!sessionPhone || !currentPhone) return true;

  return (
    sessionPhone === currentPhone ||
    sessionPhone.endsWith(currentPhone) ||
    currentPhone.endsWith(sessionPhone)
  );
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function markMessage(
  supabase: SupabaseClient,
  messageId: string,
  intent: string,
) {
  await supabase
    .from('whatsapp_messages')
    .update({
      processing_status: 'completed',
      intent,
      processed_at: new Date().toISOString(),
    })
    .eq('id', messageId);
}

async function loadGroupSession(
  supabase: SupabaseClient,
  userId: string,
  groupKey: string,
) {
  const { data } = await supabase
    .from('conversation_context')
    .select('id, context_data, expires_at, context_type')
    .eq('user_id', userId)
    .eq('phone', groupKey)
    .eq('context_type', 'ana_clara_group_session')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  return data;
}

async function clearGroupSession(
  supabase: SupabaseClient,
  userId: string,
  groupKey: string,
) {
  await supabase
    .from('conversation_context')
    .delete()
    .eq('user_id', userId)
    .eq('phone', groupKey)
    .eq('context_type', 'ana_clara_group_session');
}

async function persistGroupSession(
  userId: string,
  groupKey: string,
  groupJid: string,
  groupName: string | null,
  participantPhone: string,
  participantName: string | null,
  reason:
    | 'text_trigger'
    | 'audio_trigger'
    | 'receipt_trigger'
    | 'session_continue',
  cfg: AnaClaraGroupRuntimeConfig,
  priorData: Record<string, unknown> | null,
) {
  const now = new Date().toISOString();
  let merged: Record<string, unknown>;

  if (reason === 'session_continue' && priorData) {
    merged = {
      ...priorData,
      last_interaction_at: now,
      phone: groupKey,
    };
  } else {
    merged = {
      group_jid: groupJid,
      group_name: groupName,
      activated_by_phone: participantPhone,
      activated_by_name: participantName,
      activation_reason: reason === 'session_continue'
        ? (priorData?.activation_reason as string) || 'text_trigger'
        : reason,
      activated_at: (priorData?.activated_at as string) || now,
      last_interaction_at: now,
      phone: groupKey,
    };
  }

  await salvarContexto(
    userId,
    'ana_clara_group_session',
    merged,
    groupKey,
    { expirationMinutes: cfg.group_session_timeout_minutes },
  );
}

async function tryAutoMarkSingleBillByAmount(
  supabase: SupabaseClient,
  userId: string,
  valor: number,
  cfg: AnaClaraGroupRuntimeConfig,
): Promise<{ executed: boolean; summary: string; ambiguous: boolean }> {
  if (!cfg.auto_execute_high_confidence_bill_payments) {
    return { executed: false, summary: '', ambiguous: false };
  }

  const { data: bills, error } = await supabase
    .from('payable_bills')
    .select('id, description, amount, status')
    .eq('user_id', userId)
    .neq('status', 'paid')
    .order('due_date', { ascending: true })
    .limit(50);

  if (error || !bills?.length) {
    return { executed: false, summary: '', ambiguous: false };
  }

  const tol = 0.02;
  const matches = bills.filter((b) => {
    const a = Number(b.amount);
    if (!Number.isFinite(a)) return false;
    return Math.abs(a - valor) <= tol;
  });

  if (matches.length === 0) {
    return { executed: false, summary: '', ambiguous: false };
  }
  if (matches.length > 1) {
    return { executed: false, summary: '', ambiguous: true };
  }

  const bill = matches[0];
  const result = await marcarComoPago(userId, bill.id, valor, 'pix');
  if (!result.sucesso) {
    return { executed: false, summary: '', ambiguous: false };
  }
  return { executed: true, summary: result.mensagem, ambiguous: false };
}

export async function handleAnaClaraGroupInbound(
  ctx: AnaClaraGroupInboundParams,
): Promise<{ handled: boolean; response: Response }> {
  const {
    supabase,
    user,
    message,
    groupJid,
    participantPhone,
    participantName,
    groupName,
    content,
    messageType,
    isAudio,
    isImage,
    imageMessageId,
    soulConfig,
    userContext,
    autonomyConfig,
  } = ctx;

  const cfg = await loadAnaClaraGroupConfig(supabase, user.id);
  const groupKey = groupSessionPhoneKey(groupJid);

  const finishSilent = async (intent: string) => {
    await markMessage(supabase, message.id, intent);
    return { handled: true, response: jsonResponse({ ok: true, type: intent }) };
  };

  if (!cfg.is_enabled) {
    return finishSilent('group_mode_disabled');
  }

  if (!isEnabledGroupJid(groupJid, cfg.enabled_group_jids)) {
    return finishSilent('group_not_enabled_for_jid');
  }

  if (!isParticipantAllowed(participantPhone, participantName, cfg.allowed_participants)) {
    return finishSilent('group_participant_denied');
  }

  const sessionRow = await loadGroupSession(supabase, user.id, groupKey);
  const sessionActive = Boolean(sessionRow);
  const priorData = (sessionRow?.context_data as Record<string, unknown>) ?? null;
  const sessionOwnedByParticipant = isSessionOwnedByParticipant(priorData, participantPhone);

  const hasUsefulText = Boolean(
    content?.trim() && !content.startsWith('[ÁUDIO'),
  );
  const hasTextTrigger =
    hasUsefulText &&
    textContainsAgentTrigger(content, cfg.agent_trigger_names);
  const isReceipt =
    cfg.auto_process_receipts &&
    isImage &&
    Boolean(imageMessageId) &&
    (messageType === 'image' || messageType === 'media');

  const triggerDetected = Boolean(hasTextTrigger || isReceipt);

  await insertGroupPassiveMemory(
    supabase,
    {
      userId: user.id,
      groupJid,
      participantPhone,
      participantName,
      messageType,
      content: content || null,
      mediaSummary: isReceipt ? 'image:inbound' : null,
      triggerDetected,
      metadata: { session_active: sessionActive, session_owned: sessionOwnedByParticipant },
    },
    cfg,
  );

  if (isDismissPhrase(content, cfg.dismiss_phrases) && sessionActive && sessionOwnedByParticipant) {
    await clearGroupSession(supabase, user.id, groupKey);
    await enviarViaEdgeFunction(
      participantPhone,
      'Combinado! Qualquer coisa é só chamar. 🙋🏻‍♀️',
      user.id,
      { chatJid: groupJid },
    );
    await markMessage(supabase, message.id, 'group_session_dismiss');
    return { handled: true, response: jsonResponse({ ok: true, type: 'group_session_dismiss' }) };
  }

  const isFailedAudio = isAudio && !hasUsefulText;

  if (!sessionActive) {
    if (isFailedAudio) {
      return finishSilent('group_audio_silent_hibernating');
    }
    if (!hasTextTrigger && !isReceipt) {
      return finishSilent('group_hibernating_silent');
    }
  }

  const processedText = hasUsefulText
    ? removeAgentTriggerNames(content, cfg.agent_trigger_names)
    : content;

  if (sessionActive && !sessionOwnedByParticipant && !hasTextTrigger && !isReceipt) {
    return finishSilent('group_session_other_participant_silent');
  }

  if (sessionActive && isCallingAnotherPerson(content, cfg.agent_trigger_names)) {
    await clearGroupSession(supabase, user.id, groupKey);
    return finishSilent('group_session_calling_other_person');
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (isReceipt && imageMessageId) {
    let reply = '';

    const tipo = await imageReader.detectarTipoImagem(imageMessageId, user.id);

    if (tipo.tipo === 'comprovante_pix') {
      const leitura = await imageReader.lerComprovantePix(imageMessageId, user.id);
      if (leitura.sucesso && leitura.dados) {
        const d = leitura.dados;
        const tipoTxt = d.tipo === 'enviado' ? 'enviado' : 'recebido';
        reply =
          `💸 *Comprovante PIX (${tipoTxt})*\n\n` +
          `💰 Valor: R$ ${d.valor.toFixed(2).replace('.', ',')}\n` +
          (d.destinatario ? `👤 Para: ${d.destinatario}\n` : '') +
          (d.remetente ? `👤 De: ${d.remetente}\n` : '') +
          (d.banco ? `🏦 Banco: ${d.banco}\n` : '');

        const auto = await tryAutoMarkSingleBillByAmount(
          supabase,
          user.id,
          d.valor,
          cfg,
        );
        if (auto.executed) {
          reply += `\n${auto.summary}`;
        } else if (auto.ambiguous) {
          reply +=
            `\n_Encontrei mais de uma conta a pagar com esse valor — não marquei automaticamente. Diz o nome da conta?_`;
        } else {
          reply +=
            `\n_Se quiser, diga qual conta a pagar isso fecha que eu registro._`;
        }
      }
    } else if (tipo.tipo === 'comprovante_pagamento') {
      const leitura = await imageReader.lerComprovantePagamento(imageMessageId, user.id);
      if (leitura.sucesso && leitura.dados) {
        const d = leitura.dados;
        reply =
          `💳 *Comprovante de pagamento*\n\n` +
          `💰 Valor: R$ ${d.valor_total.toFixed(2).replace('.', ',')}\n` +
          (d.estabelecimento ? `🏪 Local: ${d.estabelecimento}\n` : '');
        const auto = await tryAutoMarkSingleBillByAmount(
          supabase,
          user.id,
          d.valor_total,
          cfg,
        );
        if (auto.executed) reply += `\n${auto.summary}`;
        else if (auto.ambiguous) {
          reply +=
            `\n_Mais de uma conta com esse valor — qual foi?_`;
        } else {
          reply += `\n_Se bater com alguma conta a pagar, me diz qual._`;
        }
      }
    }

    if (!reply.trim()) {
      reply =
        '📷 Recebi a imagem no grupo. Não deu pra ler como comprovante com confiança — manda outra foto mais nítida ou diz o que foi pago.';
    }

    await persistGroupSession(
      user.id,
      groupKey,
      groupJid,
      groupName,
      participantPhone,
      participantName,
      'receipt_trigger',
      cfg,
      priorData,
    );

    await enviarViaEdgeFunction(participantPhone, reply, user.id, {
      chatJid: groupJid,
    });

    await markMessage(supabase, message.id, 'group_receipt_handled');
    return { handled: true, response: jsonResponse({ ok: true, type: 'group_receipt' }) };
  }

  if (sessionActive && sessionOwnedByParticipant && hasUsefulText) {
    await persistGroupSession(
      user.id,
      groupKey,
      groupJid,
      groupName,
      participantPhone,
      participantName,
      'session_continue',
      cfg,
      priorData,
    );
  } else if (hasTextTrigger && hasUsefulText) {
    await persistGroupSession(
      user.id,
      groupKey,
      groupJid,
      groupName,
      participantPhone,
      participantName,
      isAudio ? 'audio_trigger' : 'text_trigger',
      cfg,
      priorData,
    );
  }

  if (hasUsefulText) {
    const lines = await fetchRecentGroupMemoryLines(supabase, user.id, groupJid, cfg);
    const enrichment: AgentEnrichment = {
      soulBlock: buildSoulPromptBlock(soulConfig, userContext, autonomyConfig),
      memoriasRelevantes: lines
        ? `## Canal: grupo WhatsApp (${cfg.group_label})\n${lines}\nRegras do grupo: responda curto e objetivo; nao invente apelidos; nao assuma nome de quem escreveu; se nao tiver certeza do nome, nao use nome; no maximo 1 emoji e nunca assinatura; nao use "coé" nem giria forcada; nao ofereca privado por padrao; foque em resolver o pedido.`
        : `## Canal: grupo WhatsApp (${cfg.group_label})\nResponda curto e objetivo; sem assinatura; sem apelidos; sem "coé"; no maximo 1 emoji.`,
    };

    const nlp = await classificarIntencaoNLP(
      processedText || content,
      user.id,
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      enrichment,
    );
    const ultimaInteracao = await buscarUltimaInteracao(user.id);
    const primeiraVezAbsoluta = ultimaInteracao === null;
    const primeiraVezHoje = isPrimeiraInteracaoDia(ultimaInteracao);
    const nomeUsuario = resolvePreferredFirstName(userContext, user.full_name);

    const response = await executeAnaClaraCoreFlow({
      supabase,
      user,
      message,
      phone: participantPhone,
      content: processedText || content,
      intencaoNLP: nlp,
      primeiraVezAbsoluta,
      primeiraVezHoje,
      nomeUsuario,
      soulConfig,
      userContext,
      sendReply: async (text) => {
        await enviarViaEdgeFunction(participantPhone, sanitizeGroupReply(text), user.id, {
          chatJid: groupJid,
        });
      },
    });

    if (response) {
      return { handled: true, response };
    }
  }

  await markMessage(supabase, message.id, 'group_message_handled');
  return { handled: true, response: jsonResponse({ ok: true, type: 'group_message_handled' }) };
}
