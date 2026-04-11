import { assertEquals, assertNotEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  buildDeterministicGroupGreeting,
  detectBalanceAccountFilter,
  getGroupReplyStrategy,
  isCallingAnotherPerson,
  isGroupCalendarCommand,
  isDirectedToAnotherAgentOrPerson,
  isSimpleGroupGreeting,
  isSessionOwnedByParticipant,
  removeAgentTriggerNames,
  sanitizeGroupReply,
} from './ana-clara-group-handler.ts';

Deno.test('getGroupReplyStrategy uses contas-pagar handler for structured bill intents', () => {
  assertEquals(
    getGroupReplyStrategy({
      intencao: 'RESUMO_PAGAMENTOS_MES',
      resposta_conversacional: '',
    }),
    'contas_pagar',
  );
});

Deno.test('getGroupReplyStrategy routes greetings to the shared greeting handler', () => {
  assertEquals(
    getGroupReplyStrategy({
      intencao: 'SAUDACAO',
      resposta_conversacional: 'Coé, Alf!',
    }),
    'greeting',
  );
});

Deno.test('isCallingAnotherPerson detects direct greeting to someone else', () => {
  assertEquals(isCallingAnotherPerson('Oi Anne, responde isso', ['Ana Clara', 'Clarinha']), true);
  assertEquals(isCallingAnotherPerson('Oi Clarinha, responde isso', ['Ana Clara', 'Clarinha']), false);
  assertEquals(isCallingAnotherPerson('@107508014252114 Tem conta pra pagar hoje?', ['Ana Clara', 'Clarinha']), true);
});

Deno.test('removeAgentTriggerNames strips trigger mentions before NLP', () => {
  assertEquals(
    removeAgentTriggerNames('Oi Clarinha. Anne aqui', ['Ana Clara', 'Clarinha']),
    'Oi. Anne aqui',
  );
});

Deno.test('isSimpleGroupGreeting treats short self-introductions as greeting only', () => {
  assertEquals(isSimpleGroupGreeting('Anne aqui'), true);
  assertEquals(isSimpleGroupGreeting('Oi'), true);
  assertEquals(isSimpleGroupGreeting('contas pagas hoje'), false);
});

Deno.test('sanitizeGroupReply removes signature emoji and forced slang', () => {
  assertEquals(
    sanitizeGroupReply('Coé, Anne!\n\n_Ana Clara • Personal Finance_ 🙋🏻‍♀️'),
    'Oi, Anne!',
  );
});

Deno.test('buildDeterministicGroupGreeting keeps greeting neutral', () => {
  assertEquals(buildDeterministicGroupGreeting(), 'Oi. Tô por aqui. Manda o que você precisa.');
});

Deno.test('getGroupReplyStrategy routes balance intents away from conversational fallback', () => {
  assertEquals(
    getGroupReplyStrategy({
      intencao: 'CONSULTAR_SALDO',
      resposta_conversacional: 'Oi! Sou a Ana Clara.',
    }),
    'balance',
  );
});

Deno.test('detectBalanceAccountFilter finds explicit bank aliases in text', () => {
  assertEquals(detectBalanceAccountFilter('Quanto tem na conta do Nubank?', null), 'nubank');
  assertEquals(detectBalanceAccountFilter('saldo geral', null), null);
});

Deno.test('isSessionOwnedByParticipant only continues session for the activator', () => {
  assertEquals(
    isSessionOwnedByParticipant({ activated_by_phone: '5521981278047' }, '5521981278047'),
    true,
  );
  assertEquals(
    isSessionOwnedByParticipant({ activated_by_phone: '5521981278047' }, '5521998250178'),
    false,
  );
});

Deno.test('isDirectedToAnotherAgentOrPerson catches raw WhatsApp mentions to others', () => {
  assertEquals(
    isDirectedToAnotherAgentOrPerson('@107508014252114 Tem conta pra pagar hoje?', ['Ana Clara', 'Clarinha']),
    true,
  );
  assertEquals(
    isDirectedToAnotherAgentOrPerson('Ana Clara, tem conta pra pagar hoje?', ['Ana Clara', 'Clarinha']),
    false,
  );
});

Deno.test('getGroupReplyStrategy should not treat income queries as generic conversation', () => {
  assertNotEquals(
    getGroupReplyStrategy({
      intencao: 'CONSULTAR_RECEITAS',
      resposta_conversacional: 'Oi! Sou a Ana Clara.',
    }),
    'conversation',
  );
});

Deno.test('getGroupReplyStrategy should not treat expense reports as generic conversation', () => {
  assertNotEquals(
    getGroupReplyStrategy({
      intencao: 'CONSULTAR_EXTRATO',
      resposta_conversacional: 'Oi! Sou a Ana Clara.',
    }),
    'conversation',
  );
});

Deno.test('isGroupCalendarCommand detects agenda questions that should bypass NLP fallback', () => {
  assertEquals(isGroupCalendarCommand('qual a minha agenda essa semana?'), true);
  assertEquals(isGroupCalendarCommand('quais são as minhas mentorias dessa semana?'), true);
  assertEquals(isGroupCalendarCommand('tem conta pra pagar hoje?'), false);
});
