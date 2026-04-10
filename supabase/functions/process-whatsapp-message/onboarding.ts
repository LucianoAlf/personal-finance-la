/**
 * First-contact onboarding — learns user preferences on first interaction.
 *
 * Flow:
 *   1. Ana introduces herself and asks "como quer que eu te chame?"
 *   2. User replies with name → saved, asks tone preference
 *   3. User replies with tone → saved, asks data preference
 *   4. Done → creates agent_identity record, confirms
 *
 * Each step is a context-manager state (onboarding_step_1..3).
 * The onboarding runs BEFORE the NLP classifier and short-circuits the pipeline.
 */

import { DEFAULT_SOUL, DEFAULT_AUTONOMY } from '../_shared/ana-clara-soul.ts';
import type { UserContext, SoulConfig } from '../_shared/ana-clara-soul.ts';

export interface OnboardingState {
  step: 'ask_name' | 'ask_tone' | 'ask_data_pref' | 'complete';
  collected: {
    first_name?: string;
    communication_style?: string;
    data_preference?: string;
  };
}

export function buildOnboardingGreeting(fallbackName: string): string {
  const firstName = fallbackName?.split(' ')[0] || 'amigo';
  return `E aí, ${firstName}! 🙋🏻‍♀️

Eu sou a Ana Clara, teu copiloto financeiro aqui no WhatsApp.

Antes de começar, quero te conhecer melhor pra te atender do jeito certo.

*Como quer que eu te chame?*
_(Pode ser apelido, primeiro nome, o que for)_`;
}

export function buildToneQuestion(firstName: string): string {
  return `Beleza, ${firstName}! 🤝

Agora me conta: *como você prefere conversar?*

1️⃣ *Direto e informal* — "anotei, gastou 50 no mercado"
2️⃣ *Mais formal* — "Registrado: despesa de R$ 50,00 na categoria Alimentação"
3️⃣ *Pode xingar* — "porra, mais 50 conto no mercado kkkk"
4️⃣ *Tanto faz* — eu me adapto no caminho

_(Responde com o número ou descreve do teu jeito)_`;
}

export function buildDataPrefQuestion(firstName: string): string {
  return `Show, ${firstName}! Última pergunta:

*Quando eu registrar um gasto, como quer ver a confirmação?*

1️⃣ *Completa* — com todos os detalhes (categoria, conta, saldo)
2️⃣ *Resumida* — só o essencial (valor, descrição)
3️⃣ *Tanto faz* — mantém como tá

_(Responde com o número)_`;
}

export function buildOnboardingComplete(firstName: string): string {
  return `Pronto, ${firstName}! Tô configurada pro teu jeito. 💪

Agora é só mandar:
• "gastei 50 no mercado"
• "recebi 3000 do salário"
• "o que eu tenho hoje?"
• "meu saldo"

Bora organizar essa vida financeira!`;
}

export function parseToneReply(reply: string): string {
  const norm = reply.trim().toLowerCase();

  if (norm === '1' || norm.includes('direto') || norm.includes('informal')) {
    return 'informal, direto';
  }
  if (norm === '2' || norm.includes('formal')) {
    return 'formal';
  }
  if (norm === '3' || norm.includes('xingar') || norm.includes('palavr')) {
    return 'informal, palavrao liberado, humor';
  }
  if (norm === '4' || norm.includes('tanto faz') || norm.includes('adapta')) {
    return 'adaptável';
  }

  return norm.length > 0 ? `personalizado: ${norm.slice(0, 100)}` : 'adaptável';
}

export function parseDataPrefReply(reply: string): string {
  const norm = reply.trim().toLowerCase();

  if (norm === '1' || norm.includes('complet')) return 'completa';
  if (norm === '2' || norm.includes('resumi')) return 'resumida';
  return 'completa';
}

export function buildAgentIdentityPayload(
  userId: string,
  collected: OnboardingState['collected'],
): {
  user_id: string;
  soul_config: SoulConfig;
  user_context: UserContext;
  autonomy_rules: typeof DEFAULT_AUTONOMY;
} {
  return {
    user_id: userId,
    soul_config: DEFAULT_SOUL,
    user_context: {
      first_name: collected.first_name,
      communication_style: collected.communication_style || 'adaptável',
      notes: collected.data_preference
        ? `Preferência de dados: ${collected.data_preference}`
        : undefined,
    },
    autonomy_rules: DEFAULT_AUTONOMY,
  };
}
