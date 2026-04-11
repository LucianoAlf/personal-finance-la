/**
 * Modo grupo Ana Clara — silêncio, gatilhos, sessão curta, comprovante, resposta via grupo.
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { enviarViaEdgeFunction } from './utils.ts';
import * as imageReader from './image-reader.ts';
import {
  loadAnaClaraGroupConfig,
  groupSessionPhoneKey,
  isParticipantAllowed,
  textContainsAgentTrigger,
  isDismissPhrase,
  isEnabledGroupJid,
  type AnaClaraGroupRuntimeConfig,
} from './ana-clara-group-config.ts';
import { insertGroupPassiveMemory, fetchRecentGroupMemoryLines } from './ana-clara-group-memory.ts';
import { salvarContexto } from './context-manager.ts';
import { classificarIntencaoNLP, type AgentEnrichment } from './nlp-classifier.ts';
import { marcarComoPago } from './contas-pagar.ts';
import {
  buildSoulPromptBlock,
  type SoulConfig,
  type UserContext,
  type AutonomyRules,
} from '../_shared/ana-clara-soul.ts';

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
      metadata: { session_active: sessionActive },
    },
    cfg,
  );

  if (isDismissPhrase(content, cfg.dismiss_phrases) && sessionActive) {
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

  if (sessionActive && hasUsefulText) {
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
        ? `## Canal: grupo WhatsApp (${cfg.group_label})\n${lines}\nResponda de forma breve. É um grupo: seja objetiva.`
        : `## Canal: grupo WhatsApp (${cfg.group_label})\nResponda de forma breve.`,
    };

    const nlp = await classificarIntencaoNLP(
      content,
      user.id,
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      enrichment,
    );

    let reply = nlp.resposta_conversacional?.trim();
    if (!reply) {
      reply =
        'Oi! Sou a Ana Clara. Se precisar de algo nas finanças, diz em uma frase — ou me chama no privado pra detalhar.\n\n_Ana Clara • Personal Finance_ 🙋🏻‍♀️';
    }

    await enviarViaEdgeFunction(participantPhone, reply, user.id, {
      chatJid: groupJid,
    });
  }

  await markMessage(supabase, message.id, 'group_message_handled');
  return { handled: true, response: jsonResponse({ ok: true, type: 'group_message_handled' }) };
}
