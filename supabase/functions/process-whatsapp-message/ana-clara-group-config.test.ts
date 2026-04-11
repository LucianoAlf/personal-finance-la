import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';
import {
  isDismissPhrase,
  isEnabledGroupJid,
  isParticipantAllowed,
  mergeConfig,
  textContainsAgentTrigger,
} from './ana-clara-group-config.ts';

Deno.test('isParticipantAllowed matches phone suffix and name', () => {
  const rules = [
    { kind: 'phone' as const, value: '5521981278047' },
    { kind: 'name_contains' as const, value: 'Alfredo' },
  ];
  assertEquals(isParticipantAllowed('5521981278047', null, rules), true);
  assertEquals(isParticipantAllowed('5511981278047', null, rules), false);
  assertEquals(isParticipantAllowed('0', 'Alfredo Silva', rules), true);
});

Deno.test('textContainsAgentTrigger handles accents', () => {
  const triggers = ['ana clara', 'aninha'];
  assertEquals(textContainsAgentTrigger('Oi Ana Clara, tá aí?', triggers), true);
  assertEquals(textContainsAgentTrigger('fala aninha', triggers), true);
  assertEquals(textContainsAgentTrigger('@107508014252114 explica pra Ana Clara como faz', triggers), false);
  assertEquals(textContainsAgentTrigger('o Alfredo falou com a Ana Clara ontem', triggers), false);
  assertEquals(textContainsAgentTrigger('só oi', triggers), false);
});

Deno.test('isDismissPhrase', () => {
  const phrases = ['valeu ana clara'];
  assertEquals(isDismissPhrase('Valeu Ana Clara!', phrases), true);
  assertEquals(isDismissPhrase('preciso pagar luz', phrases), false);
});

Deno.test('isEnabledGroupJid is case-insensitive on list', () => {
  assertEquals(
    isEnabledGroupJid('5521981278047-1555326211@g.us', [
      '5521981278047-1555326211@g.us',
    ]),
    true,
  );
});

Deno.test('mergeConfig preserves defaults when row empty', () => {
  const c = mergeConfig(null);
  assertEquals(c.enabled_group_jids.includes('5521981278047-1555326211@g.us'), true);
});
