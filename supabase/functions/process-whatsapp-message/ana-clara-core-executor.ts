import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

import {
  buscarContexto,
  limparContexto,
  processarNoContexto,
  salvarContexto,
  type ContextType,
} from './context-manager.ts';
import type { IntencaoClassificada } from './nlp-classifier.ts';
import { processarIntencaoCartao } from './cartao-credito.ts';
import { processarIntencaoContaPagar, type TipoIntencaoContaPagar } from './contas-pagar.ts';
import {
  generateAccountsHealthCheckResponse,
  isExplicitAccountsHealthCheckRequest as detectExplicitAccountsHealthCheckRequest,
  listAccountsDiagnosableAnomalies,
} from './accounts-diagnostic.ts';
import {
  createAccountsDiagnosticInvitationContext,
  detectDirectAccountsDiagnosticPrompt as detectAccountsDiagnosticPrompt,
  startAccountsDiagnosticConversation,
} from './accounts-diagnostic-conversations.ts';
import {
  excluirTransacaoPorId,
  excluirUltimaTransacao,
  listarContas,
  mudarContaUltimaTransacao,
  consultarSaldo,
} from './command-handlers.ts';
import {
  consultarFinancasUnificada,
  consultarSaldoEspecifico,
  extrairMetodoDoTexto,
  extrairModoDoTexto,
  extrairPeriodoDoTexto,
  type PeriodoConfig,
} from './consultas.ts';
import {
  detectResumoFinanceiroPeriodo,
} from './agent-routing.ts';
import {
  processarEdicao,
  processarIntencaoTransacao,
  processarIntencaoTransferencia,
  processarTransferenciaEntreContas,
} from './transaction-mapper.ts';
import {
  buildSoulAboutSystem,
  buildSoulFallbackReply,
  buildSoulGreeting,
  buildSoulHelpReply,
  type SoulConfig,
  type UserContext,
} from '../_shared/ana-clara-soul.ts';
import { saveAgentMemoryEpisode } from '../_shared/agent-memory-context.ts';
import {
  templateAgradecimento,
  templateAjuda,
  templateBoasVindas,
  templateSaudacaoPrimeiraVez,
  templateSaudacaoRetorno,
} from './templates-humanizados.ts';

export type AnaClaraCoreRoute =
  | 'account_selection'
  | 'card'
  | 'contas_pagar'
  | 'greeting'
  | 'help'
  | 'balance'
  | 'income'
  | 'financial_summary'
  | 'expenses'
  | 'list_accounts'
  | 'delete'
  | 'edit_value'
  | 'edit_account'
  | 'thanks'
  | 'other'
  | 'transfer'
  | 'transaction'
  | 'low_confidence'
  | 'unknown';

export interface ExecuteAnaClaraCoreFlowParams {
  supabase: SupabaseClient;
  user: { id: string; full_name: string; email: string };
  message: { id: string };
  phone: string;
  content: string;
  intencaoNLP: IntencaoClassificada;
  primeiraVezAbsoluta: boolean;
  primeiraVezHoje: boolean;
  nomeUsuario: string;
  soulConfig: SoulConfig;
  userContext: UserContext;
  sendReply: (text: string) => Promise<void>;
}

function recordEpisode(
  supabase: SupabaseClient,
  userId: string,
  summary: string,
  options: {
    importance?: number;
    source?: string;
    outcome?: string;
    entities?: Record<string, unknown>;
    expiresInHours?: number;
  } = {},
): void {
  saveAgentMemoryEpisode(supabase, {
    userId,
    summary,
    importance: options.importance,
    source: options.source ?? 'whatsapp',
    outcome: options.outcome,
    entities: options.entities,
    expiresInHours: options.expiresInHours,
  }).catch((e) => console.warn('[episode-memory] non-blocking error:', e));
}

export const INTENCOES_CARTAO = [
  'COMPRA_CARTAO',
  'COMPRA_PARCELADA',
  'CONSULTAR_FATURA',
  'CONSULTAR_FATURA_VENCIDA',
  'CONSULTAR_LIMITE',
  'LISTAR_CARTOES',
  'PAGAR_FATURA',
];

export const INTENCOES_GASTOS = [
  'CONSULTAR_EXTRATO',
  'CONSULTAR_GASTOS',
  'RELATORIO_DIARIO',
  'RELATORIO_SEMANAL',
  'RELATORIO_MENSAL',
  'VER_GASTOS',
  'MEUS_GASTOS',
];

export const INTENCOES_CONVERSACIONAIS = [
  'SAUDACAO',
  'AGRADECIMENTO',
  'OUTRO',
];

export const INTENCOES_CONTAS_PAGAR: TipoIntencaoContaPagar[] = [
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
];

export function detectBalanceAccountFilter(
  text: string,
  rawConta?: string | null,
): string | null {
  if (rawConta?.trim()) return rawConta.trim();

  const textoLower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const bancosConhecidos = [
    { nome: 'nubank', aliases: ['nubank', 'roxinho', 'roxo', 'nu'] },
    { nome: 'itau', aliases: ['itau', 'itaú', 'laranjinha'] },
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

export function resolveAnaClaraCoreRoute(
  intencaoNLP: Pick<IntencaoClassificada, 'intencao' | 'confianca' | 'entidades'>,
  content: string,
): AnaClaraCoreRoute {
  if (
    intencaoNLP.confianca < 0.6 &&
    !INTENCOES_CONVERSACIONAIS.includes(intencaoNLP.intencao)
  ) {
    return 'low_confidence';
  }

  if (intencaoNLP.intencao === 'SELECIONAR_CONTA' && intencaoNLP.entidades.conta) {
    return 'account_selection';
  }

  if (INTENCOES_CARTAO.includes(intencaoNLP.intencao)) return 'card';
  if (INTENCOES_CONTAS_PAGAR.includes(intencaoNLP.intencao as TipoIntencaoContaPagar)) return 'contas_pagar';
  if (intencaoNLP.intencao === 'SAUDACAO') return 'greeting';
  if (intencaoNLP.intencao === 'AJUDA') return 'help';
  if (intencaoNLP.intencao === 'CONSULTAR_SALDO') return 'balance';
  if (intencaoNLP.intencao === 'CONSULTAR_RECEITAS') return 'income';
  if (detectResumoFinanceiroPeriodo(content)) return 'financial_summary';
  if (INTENCOES_GASTOS.includes(intencaoNLP.intencao)) return 'expenses';
  if (intencaoNLP.intencao === 'LISTAR_CONTAS') return 'list_accounts';
  if (intencaoNLP.intencao === 'EXCLUIR_TRANSACAO') return 'delete';
  if (intencaoNLP.intencao === 'EDITAR_VALOR') return 'edit_value';
  if (intencaoNLP.intencao === 'EDITAR_TRANSACAO' && intencaoNLP.entidades.valor) return 'edit_value';
  if (
    (intencaoNLP.intencao === 'EDITAR_CONTA' && intencaoNLP.entidades.nova_conta) ||
    (intencaoNLP.intencao === 'MUDAR_CONTA' && intencaoNLP.entidades.conta)
  ) {
    return 'edit_account';
  }
  if (intencaoNLP.intencao === 'AGRADECIMENTO') return 'thanks';
  if (intencaoNLP.intencao === 'OUTRO') return 'other';
  if (intencaoNLP.intencao === 'REGISTRAR_TRANSFERENCIA') return 'transfer';
  if (
    intencaoNLP.intencao === 'REGISTRAR_RECEITA' ||
    intencaoNLP.intencao === 'REGISTRAR_DESPESA'
  ) {
    return 'transaction';
  }

  return 'unknown';
}

export function shouldUseUnifiedExpenseQuery(params: {
  periodType?: PeriodoConfig['tipo'];
  hasMethod: boolean;
  hasCategory: boolean;
  hasEstablishment: boolean;
}): boolean {
  if (params.hasMethod || params.hasCategory || params.hasEstablishment) {
    return true;
  }

  const templateFriendlyPeriods = new Set<PeriodoConfig['tipo']>([
    'mes_atual',
    'semana_atual',
    'hoje',
    'ontem',
  ]);

  return !templateFriendlyPeriods.has(params.periodType ?? 'mes_atual');
}

export function isExplicitAccountsHealthCheckRequest(text: string): boolean {
  return detectExplicitAccountsHealthCheckRequest(text);
}

export function detectDirectAccountsDiagnosticPrompt(text: string): boolean {
  return detectAccountsDiagnosticPrompt(text);
}

export async function executeAnaClaraCoreFlow(
  params: ExecuteAnaClaraCoreFlowParams,
): Promise<Response | null> {
  const {
    supabase,
    user,
    message,
    phone,
    content,
    intencaoNLP,
    primeiraVezAbsoluta,
    primeiraVezHoje,
    nomeUsuario,
    soulConfig,
    userContext,
    sendReply,
  } = params;

  const route = resolveAnaClaraCoreRoute(intencaoNLP, content);

  const markMessage = async (intent: string, type: string) => {
    await supabase.from('whatsapp_messages').update({
      processing_status: 'completed',
      intent,
      processed_at: new Date().toISOString(),
    }).eq('id', message.id);

    return new Response(JSON.stringify({ success: true, type }), {
      headers: { 'Content-Type': 'application/json' },
    });
  };

  if (isExplicitAccountsHealthCheckRequest(content)) {
    const anomalies = await listAccountsDiagnosableAnomalies(user.id);
    const diagnosticContext = createAccountsDiagnosticInvitationContext({
      anomalies,
      source: 'explicit_health_check',
    });
    const resposta = await generateAccountsHealthCheckResponse(user.id);
    const mensagem = diagnosticContext
      ? `${resposta}\n\nSe quiser, eu posso te ajudar a entender o que pode estar acontecendo na mais urgente.`
      : resposta;
    await sendReply(mensagem);
    if (diagnosticContext) {
      await salvarContexto(user.id, 'accounts_diagnostic_context' as ContextType, diagnosticContext, phone);
    }
    return await markMessage('accounts_health_check', 'contas_pagar_health_check');
  }

  if (detectDirectAccountsDiagnosticPrompt(content)) {
    const anomalies = await listAccountsDiagnosableAnomalies(user.id);
    const transition = startAccountsDiagnosticConversation({
      anomalies,
      source: 'direct_diagnostic_prompt',
      userText: content,
    });

    await sendReply(transition.message);
    if (transition.nextState !== 'IDLE') {
      await salvarContexto(user.id, 'accounts_diagnostic_context' as ContextType, transition.contextData, phone);
    }
    return await markMessage('accounts_diagnostic_prompt', 'contas_pagar_diagnostic');
  }

  const intencao = {
    intencao: intencaoNLP.intencao,
    confianca: intencaoNLP.confianca,
    entidades: {
      valor: intencaoNLP.entidades.valor,
      categoria: intencaoNLP.entidades.categoria,
      descricao: intencaoNLP.entidades.descricao,
      conta: intencaoNLP.entidades.conta,
      data: intencaoNLP.entidades.data,
      forma_pagamento: intencaoNLP.entidades.forma_pagamento,
      status_pagamento: intencaoNLP.entidades.status_pagamento,
      tipo: intencaoNLP.entidades.tipo,
    },
    comando_original: content,
    texto_original: content,
    resposta_conversacional: intencaoNLP.resposta_conversacional,
  } as any;

  switch (route) {
    case 'low_confidence': {
      const respostaClarificacao = `🤔 Não tenho certeza se entendi bem...

Você quis:
• Registrar um gasto ou receita?
• Ver seu saldo?
• Outra coisa?

Me explica melhor que eu te ajudo! 😊

_Ana Clara • Personal Finance_ 🙋🏻‍♀️`;
      await sendReply(respostaClarificacao);
      return await markMessage('low_confidence_clarification', 'clarification');
    }

    case 'account_selection': {
      const contextoAtual = await buscarContexto(user.id);
      if (contextoAtual && contextoAtual.context_type === 'creating_transaction') {
        const resposta = await processarNoContexto(intencaoNLP.entidades.conta, contextoAtual, user.id, phone);
        if (resposta) await sendReply(resposta);
      }
      return new Response(JSON.stringify({ success: true, type: 'account_selection' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    case 'card': {
      const entidadesCheck = intencaoNLP.entidades as any;
      const bancoDetectado = entidadesCheck.conta || entidadesCheck.cartao;

      if (
        intencaoNLP.intencao === 'COMPRA_CARTAO' &&
        !entidadesCheck.forma_pagamento &&
        bancoDetectado
      ) {
        const comandoLower = (intencaoNLP.comando_original || content)
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

        const temCreditoExplicito =
          comandoLower.includes('credito') ||
          comandoLower.includes('cartao') ||
          comandoLower.includes('parcel');

        if (!temCreditoExplicito) {
          const { templatePerguntaMetodoPagamentoComBancos } = await import('./transaction-mapper.ts');
          const mensagem = await templatePerguntaMetodoPagamentoComBancos(
            entidadesCheck.descricao || 'Despesa',
            entidadesCheck.valor,
            user.id,
          );

          await salvarContexto(user.id, 'creating_transaction', {
            step: 'awaiting_payment_method',
            phone,
            dados_transacao: {
              valor: entidadesCheck.valor,
              descricao: entidadesCheck.descricao,
              categoria: entidadesCheck.categoria,
              conta: bancoDetectado,
              tipo: 'expense',
            },
          }, phone);

          await sendReply(mensagem);
          return new Response(JSON.stringify({
            success: true,
            type: 'ambiguidade_metodo',
            redirecionado: 'awaiting_payment_method',
          }), { headers: { 'Content-Type': 'application/json' } });
        }
      }

      const cartaoExtraido = entidadesCheck.cartao || entidadesCheck.conta;
      const tipoCartao = intencaoNLP.intencao === 'COMPRA_CARTAO' ? 'compra_cartao' :
        intencaoNLP.intencao === 'COMPRA_PARCELADA' ? 'compra_parcelada' :
        intencaoNLP.intencao === 'CONSULTAR_FATURA' ? 'consulta_fatura' :
        intencaoNLP.intencao === 'CONSULTAR_FATURA_VENCIDA' ? 'consulta_fatura_vencida' :
        intencaoNLP.intencao === 'CONSULTAR_LIMITE' ? 'consulta_limite' :
        intencaoNLP.intencao === 'LISTAR_CARTOES' ? 'listar_cartoes' :
        intencaoNLP.intencao === 'PAGAR_FATURA' ? 'pagar_fatura' :
        'compra_cartao';

      const intencaoCartao = {
        tipo: tipoCartao as any,
        valor: entidadesCheck.valor,
        cartao: cartaoExtraido,
        parcelas: entidadesCheck.parcelas || 1,
        descricao: entidadesCheck.descricao,
        mes_referencia: entidadesCheck.mes_referencia,
      };

      const resultado = await processarIntencaoCartao(intencaoCartao, user.id, phone);

      if (resultado.precisaConfirmacao && resultado.dados) {
        const step = resultado.dados.tipo === 'compra_cartao_aguardando_descricao'
          ? 'awaiting_card_purchase_description'
          : 'awaiting_card_selection';

        await salvarContexto(user.id, 'confirming_action', {
          step,
          phone,
          dados_cartao: resultado.dados,
        }, phone);
      } else if (resultado.dados?.transacao_id) {
        await salvarContexto(user.id, 'transaction_registered', {
          transacao_id: resultado.dados.transacao_id,
          transacao_tipo: resultado.dados.transacao_tipo,
          phone,
        }, phone);
      }

      await sendReply(resultado.mensagem);
      return await markMessage(`cartao_${tipoCartao}`, 'cartao_nlp');
    }

    case 'contas_pagar': {
      const entidadesComOriginal = {
        ...intencaoNLP.entidades,
        comando_original: content,
      };

      const resultado = await processarIntencaoContaPagar(
        intencaoNLP.intencao as TipoIntencaoContaPagar,
        user.id,
        phone,
        entidadesComOriginal,
      );

      await sendReply(resultado.mensagem);

      const contextStep = (resultado.dados?.contextType || resultado.dados?.step) as ContextType;
      if (resultado.precisaConfirmacao && contextStep) {
        try {
          await salvarContexto(user.id, contextStep, {
            ...resultado.dados,
            phone,
          }, phone);
        } catch (ctxError) {
          console.error(`📋 [CONTAS-PAGAR] ❌ Erro ao salvar contexto:`, ctxError);
        }
      }

      return await markMessage(intencaoNLP.intencao.toLowerCase(), 'contas_pagar');
    }

    case 'greeting': {
      let resposta: string;

      if (primeiraVezAbsoluta) {
        resposta = templateBoasVindas(nomeUsuario);
      } else if (intencaoNLP.resposta_conversacional?.trim()) {
        resposta = intencaoNLP.resposta_conversacional.trim();
      } else {
        resposta = buildSoulGreeting(soulConfig, userContext, nomeUsuario, {
          firstContactEver: primeiraVezAbsoluta,
          firstContactToday: primeiraVezHoje,
          userMessage: content,
        }) || (primeiraVezHoje
          ? templateSaudacaoPrimeiraVez(nomeUsuario)
          : templateSaudacaoRetorno(nomeUsuario));
      }

      await sendReply(resposta);
      return await markMessage('saudacao', 'greeting');
    }

    case 'help': {
      const respostaConversacional = intencaoNLP.resposta_conversacional?.trim();
      const ajudaSoaRobotica =
        !!respostaConversacional &&
        /como sua personal finance|simplificar sua vida financeira|como posso te apoiar hoje|gerenciar suas contas a pagar/i.test(
          respostaConversacional,
        );
      const resposta =
        (!ajudaSoaRobotica && respostaConversacional) ||
        buildSoulHelpReply(soulConfig, userContext, nomeUsuario) ||
        templateAjuda(nomeUsuario, primeiraVezHoje);
      await sendReply(resposta);
      return await markMessage('ajuda', 'help');
    }

    case 'balance': {
      const contaFiltro = detectBalanceAccountFilter(
        content,
        typeof intencaoNLP.entidades?.conta === 'string' ? intencaoNLP.entidades.conta : null,
      );

      const resposta = contaFiltro
        ? await consultarSaldoEspecifico(user.id, contaFiltro)
        : await consultarSaldo(user.id);

      await sendReply(resposta);
      recordEpisode(
        supabase,
        user.id,
        contaFiltro
          ? `Consultou saldo filtrado da conta ${contaFiltro}.`
          : 'Consultou saldo consolidado das contas.',
        {
          importance: 0.35,
          outcome: 'balance_query_answered',
          entities: { account_filter: contaFiltro || null },
          expiresInHours: 72,
        },
      );
      return await markMessage('consultar_saldo', 'balance');
    }

    case 'income': {
      const entidadesNLP = intencaoNLP.entidades as any;
      const periodoConfig = extrairPeriodoDoTexto(content);
      const { modo, agrupar_por } = extrairModoDoTexto(content);
      const metodoNLP = entidadesNLP?.metodo;
      const metodoTexto = extrairMetodoDoTexto(content);
      const metodo = metodoNLP || metodoTexto;

      let contaFiltro: string | undefined = entidadesNLP?.conta?.toLowerCase()?.normalize('NFD')?.replace(/[\u0300-\u036f]/g, '');
      if (!contaFiltro) {
        const textoLower = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const bancosConhecidos = ['nubank', 'itau', 'bradesco', 'inter', 'c6', 'santander', 'caixa', 'bb', 'roxinho', 'roxo'];

        for (const banco of bancosConhecidos) {
          if (textoLower.includes(banco)) {
            contaFiltro = banco;
            break;
          }
        }
      }

      const resposta = await consultarFinancasUnificada(user.id, {
        periodo: periodoConfig,
        conta: contaFiltro,
        metodo: metodo as any,
        tipo: 'income',
        modo: entidadesNLP?.modo || modo,
        agrupar_por: entidadesNLP?.agrupar_por || agrupar_por,
      });

      await sendReply(resposta);
      recordEpisode(
        supabase,
        user.id,
        'Respondeu uma consulta de receitas com filtros de período e conta.',
        {
          importance: 0.32,
          outcome: 'income_query_answered',
          entities: {
            period: periodoConfig,
            account_filter: contaFiltro || null,
            payment_method: metodo || null,
          },
          expiresInHours: 72,
        },
      );
      return await markMessage('consultar_receitas', 'income');
    }

    case 'financial_summary': {
      const { gerarResumoFinanceiro } = await import('./insights-ana-clara.ts');
      const resumoPeriodo = detectResumoFinanceiroPeriodo(content);

      let periodo: 'hoje' | 'semana' | 'mes' | 'trimestre' = 'hoje';
      let intentLabel = 'resumo_diario';

      if (resumoPeriodo === 'trimestre') {
        periodo = 'trimestre';
        intentLabel = 'resumo_trimestre';
      } else if (resumoPeriodo === 'mes') {
        periodo = 'mes';
        intentLabel = 'resumo_mensal';
      } else if (resumoPeriodo === 'semana') {
        periodo = 'semana';
        intentLabel = 'resumo_semanal';
      }

      const resposta = await gerarResumoFinanceiro(user.id, periodo);
      await sendReply(resposta);
      recordEpisode(
        supabase,
        user.id,
        `Entregou resumo financeiro de ${periodo}.`,
        {
          importance: 0.42,
          outcome: 'financial_summary_answered',
          entities: {
            period: periodo,
            source: 'insights_ana_clara',
          },
          expiresInHours: 96,
        },
      );
      return await markMessage(intentLabel, intentLabel);
    }

    case 'expenses': {
      const entidadesNLP = intencaoNLP.entidades as any;
      const periodoConfig = extrairPeriodoDoTexto(content);
      const { modo, agrupar_por } = extrairModoDoTexto(content);
      const metodoNLP = entidadesNLP?.metodo;
      const metodoTexto = extrairMetodoDoTexto(content);
      const metodo = metodoNLP || metodoTexto;

      let contaFiltro: string | undefined = entidadesNLP?.conta?.toLowerCase()?.normalize('NFD')?.replace(/[\u0300-\u036f]/g, '');
      let cartaoFiltro: string | undefined = entidadesNLP?.cartao?.toLowerCase()?.normalize('NFD')?.replace(/[\u0300-\u036f]/g, '');

      if (!contaFiltro && !cartaoFiltro) {
        const textoLower = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const bancosConhecidos = ['nubank', 'itau', 'bradesco', 'inter', 'c6', 'santander', 'caixa', 'bb', 'roxinho', 'roxo'];
        for (const banco of bancosConhecidos) {
          if (textoLower.includes(banco)) {
            contaFiltro = banco;
            break;
          }
        }
      }

      const categoriaFiltro = entidadesNLP?.categoria;
      let estabelecimentoFiltro: string | undefined;
      const textoLowerEstab = content.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const estabelecimentosConhecidos = [
        'ifood', 'uber', 'rappi', '99', 'spotify', 'netflix', 'amazon', 'disney',
        'hbo', 'youtube', 'google', 'apple', 'mercado livre', 'magalu', 'americanas',
        'casas bahia', 'shopee', 'shein', 'aliexpress', 'starbucks', 'mcdonalds',
        'burger king', 'subway', 'outback', 'madero', 'habib',
      ];
      const padroesEstabelecimento = [
        /(?:quanto|qual)\s+(?:gastei|foi|paguei)\s+(?:de|com|no|na|em)\s+(\w+)/,
        /(?:quanto|qual)\s+(?:meu[s]?|o)\s+gasto[s]?\s+(?:de|com|no|na|em)\s+(\w+)/,
        /meu[s]?\s+gasto[s]?\s+(?:de|com|no|na|em)\s+(\w+)/,
        /gasto[s]?\s+(?:de|com|no|na|em)\s+(\w+)/,
        /(?:de|com|no|na)\s+(uber|ifood|rappi|99|spotify|netflix|amazon|disney)/,
      ];

      for (const padrao of padroesEstabelecimento) {
        const match = textoLowerEstab.match(padrao);
        if (match && match[1]) {
          const termoDetectado = match[1].trim();
          const isEstabelecimento = estabelecimentosConhecidos.some((e) =>
            termoDetectado.includes(e) || e.includes(termoDetectado)
          );
          const isBanco = ['nubank', 'itau', 'bradesco', 'inter', 'c6', 'santander', 'caixa', 'bb', 'roxinho'].includes(termoDetectado);
          const isTermoCartao = ['cartao', 'cartão', 'credito', 'crédito', 'debito', 'débito'].includes(termoDetectado);
          if (isEstabelecimento || (!isBanco && !isTermoCartao && termoDetectado.length >= 3)) {
            estabelecimentoFiltro = termoDetectado;
            break;
          }
        }
      }

      const shouldUseUnified = shouldUseUnifiedExpenseQuery({
        periodType: periodoConfig?.tipo,
        hasMethod: Boolean(metodo),
        hasCategory: Boolean(categoriaFiltro),
        hasEstablishment: Boolean(estabelecimentoFiltro),
      });
      let resposta: string;
      const isCartaoQuery = cartaoFiltro ||
        content.toLowerCase().includes('cartão') ||
        content.toLowerCase().includes('cartao') ||
        content.toLowerCase().includes('crédito') ||
        content.toLowerCase().includes('credito');

      if (!shouldUseUnified) {
        const { gerarRelatorioGastosMes, gerarRelatorioGastosConta, gerarRelatorioGastosCartao } = await import('./insights-ana-clara.ts');

        let usarRelatorioCartao = false;
        const filtroParaCartao = cartaoFiltro || (isCartaoQuery ? contaFiltro : undefined);

        if (filtroParaCartao && isCartaoQuery) {
          const { data: cartoes } = await supabase
            .from('credit_cards')
            .select('id, name')
            .eq('user_id', user.id)
            .eq('is_active', true);

          const nomeNorm = filtroParaCartao.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const cartaoEncontrado = cartoes?.find((c: any) => {
            const cartaoNorm = c.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return cartaoNorm.includes(nomeNorm) || nomeNorm.includes(cartaoNorm);
          });

          usarRelatorioCartao = !!cartaoEncontrado;
          if (usarRelatorioCartao) cartaoFiltro = filtroParaCartao;
        }

        if (usarRelatorioCartao && cartaoFiltro) {
          resposta = await gerarRelatorioGastosCartao(user.id, cartaoFiltro!, periodoConfig);
        } else if (contaFiltro || (cartaoFiltro && !usarRelatorioCartao)) {
          const filtro = contaFiltro || cartaoFiltro;
          resposta = await gerarRelatorioGastosConta(user.id, filtro!, periodoConfig);
        } else if (!contaFiltro && !cartaoFiltro) {
          resposta = await gerarRelatorioGastosMes(user.id, periodoConfig);
        } else {
          resposta = await consultarFinancasUnificada(user.id, {
            periodo: periodoConfig,
            conta: contaFiltro,
            cartao: cartaoFiltro,
            metodo: metodo as any,
            tipo: 'expense',
            modo: entidadesNLP?.modo || modo,
            agrupar_por: entidadesNLP?.agrupar_por || agrupar_por,
            categoria: categoriaFiltro,
            estabelecimento: estabelecimentoFiltro,
          });
        }
      } else {
        resposta = await consultarFinancasUnificada(user.id, {
          periodo: periodoConfig,
          conta: contaFiltro,
          cartao: cartaoFiltro,
          metodo: metodo as any,
          tipo: 'expense',
          modo: entidadesNLP?.modo || modo,
          agrupar_por: entidadesNLP?.agrupar_por || agrupar_por,
          categoria: categoriaFiltro,
          estabelecimento: estabelecimentoFiltro,
        });
      }

      await sendReply(resposta);
      return await markMessage('consultar_gastos', 'expenses');
    }

    case 'list_accounts': {
      const textoOriginal = content.toLowerCase().trim();
      const isMinhasContasAmbiguo = /^minhas?\s*contas?\??$/i.test(textoOriginal);

      if (isMinhasContasAmbiguo) {
        const resultado = await processarIntencaoContaPagar('CONTAS_AMBIGUO', user.id, phone, {});
        await sendReply(resultado.mensagem);
        await salvarContexto(user.id, 'awaiting_account_type_selection', {
          step: 'awaiting_account_type_selection',
          phone,
        }, phone);
        return await markMessage('contas_ambiguo', 'contas_ambiguo');
      }

      const resposta = await listarContas(user.id);
      await sendReply(resposta);
      return await markMessage('listar_contas', 'list_accounts');
    }

    case 'delete': {
      const contexto = await buscarContexto(user.id);
      let resposta: string;

      if (contexto?.context_data?.transacao_id) {
        const isCartao = contexto.context_data.transacao_tipo === 'credit_card_transaction';
        resposta = await excluirTransacaoPorId(user.id, contexto.context_data.transacao_id, isCartao);
        await limparContexto(user.id);
      } else {
        resposta = await excluirUltimaTransacao(user.id);
      }

      await sendReply(resposta);
      return await markMessage('excluir_transacao', 'delete');
    }

    case 'edit_value': {
      const novoValor = intencaoNLP.entidades.novo_valor ?? intencaoNLP.entidades.valor;
      const resultado = await processarEdicao(user.id, { valor: novoValor });
      const resposta = intencaoNLP.intencao === 'EDITAR_VALOR' && intencaoNLP.resposta_conversacional
        ? intencaoNLP.resposta_conversacional
        : resultado.mensagem;
      await sendReply(resposta);
      return await markMessage(
        intencaoNLP.intencao === 'EDITAR_VALOR' ? 'editar_valor' : 'editar_transacao',
        intencaoNLP.intencao === 'EDITAR_VALOR' ? 'edit_value' : 'edit',
      );
    }

    case 'edit_account': {
      const conta = intencaoNLP.entidades.nova_conta || intencaoNLP.entidades.conta;
      const resposta = await mudarContaUltimaTransacao(user.id, conta);
      await sendReply(resposta);
      return await markMessage(
        intencaoNLP.intencao === 'EDITAR_CONTA' ? 'editar_conta' : 'mudar_conta',
        intencaoNLP.intencao === 'EDITAR_CONTA' ? 'edit_account' : 'change_account',
      );
    }

    case 'thanks': {
      const resposta = intencaoNLP.resposta_conversacional?.trim() || templateAgradecimento(nomeUsuario);
      await sendReply(resposta);
      return await markMessage('agradecimento', 'thanks');
    }

    case 'other': {
      const contentLower = content.toLowerCase();
      const isPerguntaSobreSistema =
        contentLower.includes('o que você faz') ||
        contentLower.includes('o que vc faz') ||
        contentLower.includes('quem é você') ||
        contentLower.includes('quem é vc') ||
        contentLower.includes('como funciona') ||
        contentLower.includes('como você funciona') ||
        contentLower.includes('o que você pode fazer') ||
        contentLower.includes('me apresenta') ||
        contentLower.includes('se apresenta');

      const resposta = isPerguntaSobreSistema
        ? intencaoNLP.resposta_conversacional?.trim() ||
          buildSoulAboutSystem(soulConfig, userContext, nomeUsuario)
        : intencaoNLP.resposta_conversacional ||
          buildSoulFallbackReply(soulConfig, userContext, nomeUsuario);

      await sendReply(resposta);
      return await markMessage(isPerguntaSobreSistema ? 'sobre_sistema' : 'outro', isPerguntaSobreSistema ? 'about' : 'outro');
    }

    case 'transfer': {
      const entidadesTransfer = intencaoNLP.entidades as any;

      if (entidadesTransfer.conta && entidadesTransfer.conta_destino && entidadesTransfer.valor) {
        const resultado = await processarTransferenciaEntreContas(
          user.id,
          entidadesTransfer.valor,
          entidadesTransfer.conta,
          entidadesTransfer.conta_destino,
          entidadesTransfer.data,
        );
        await sendReply(resultado.mensagem);
        return await markMessage('transferencia_entre_contas', 'transfer_between_accounts');
      }

      const resultado = await processarIntencaoTransferencia(intencao, user.id, phone);
      if (resultado.precisaConfirmacao) {
        await salvarContexto(user.id, 'creating_transaction', {
          step: (resultado.dados?.step as string) || 'awaiting_transfer_account',
          phone,
          dados_transacao: resultado.dados,
        }, phone);
      }

      await sendReply(resultado.mensagem);
      return await markMessage('registrar_transferencia', 'transfer');
    }

    case 'transaction': {
      const resultado = await processarIntencaoTransacao(intencao, user.id, phone);

      if (resultado.success && !resultado.precisaConfirmacao && intencaoNLP.resposta_conversacional?.trim()) {
        const gptLine = intencaoNLP.resposta_conversacional.trim();
        const templateStart = resultado.mensagem.indexOf('⭐');
        if (templateStart > 0) {
          resultado.mensagem = `${gptLine}\n\n${resultado.mensagem.substring(templateStart)}`;
        }
      }

      if (resultado.precisaConfirmacao) {
        await sendReply(resultado.mensagem);
        const step = (resultado.dados?.step as string) || 'awaiting_account';
        await salvarContexto(user.id, 'creating_transaction', {
          step,
          intencao_pendente: intencao,
          dados_transacao: resultado.dados,
          phone,
        }, phone);
      } else {
        await sendReply(resultado.mensagem);
      }

      return await markMessage(intencao.intencao.toLowerCase(), 'transaction');
    }

    case 'unknown':
    default: {
      return null;
    }
  }
}
