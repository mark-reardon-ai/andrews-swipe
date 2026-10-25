import { describe, it, expect, beforeEach } from 'vitest';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import common from '../../schema/common.schema.json';
import answerSchema from '../../schema/swipe_answer.schema.json';
import cardSchema from '../../schema/swipe_card.schema.json';
import sample from '../../public/decks/R01-sample/deck.json';
import type { Deck } from '../types';
import { buildAnswersFile } from '../export';
import { LocalStorageStore } from '../storage/localStorageStore';
import { mergeFiles } from '../storage/compositeStore';
const ajv = new Ajv2020();
addFormats(ajv);
ajv.addSchema(common);
const validate = ajv.compile(answerSchema);
const deck = sample as unknown as Deck;
beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) } });
});
describe('official formats and storage', () => {
  it('sample deck conforms to official schema', () => {
    expect(ajv.compile(cardSchema)(sample)).toBe(true);
  });
  it.each(['tom', 'jane', 'both'] as const)('builds schema-valid %s answers', p => {
    const f = buildAnswersFile(deck, p, [{ card_id: deck.cards[0].id, swipe: 'no', at: new Date().toISOString(), dwell_ms: 42 }]);
    expect(validate(f), JSON.stringify(validate.errors)).toBe(true);
    expect(f.session?.finished).toBeUndefined();
    if (p === 'both') {
      expect(f.person).toBe('other');
      expect(f.x_joint).toBe(true);
    }
  });
  it('records completion only after all cards', () => {
    const f = buildAnswersFile(deck, 'tom', deck.cards.map(c => ({ card_id: c.id, swipe: 'yes', at: new Date().toISOString() })));
    expect(f.session?.finished).toBeDefined();
    expect(validate(f)).toBe(true);
  });
  it('round trips and isolates all people and rounds', async () => {
    const store = new LocalStorageStore('R01');
    const f = buildAnswersFile(deck, 'both', []);
    await store.save(f);
    expect(await store.load(deck.deck_id, 'both')).toEqual(f);
    expect(await store.load(deck.deck_id, 'tom')).toBeNull();
    expect(await new LocalStorageStore('R02').load(deck.deck_id, 'both')).toBeNull();
    expect(await store.listPeople(deck.deck_id)).toEqual(['both']);
    await store.clear(deck.deck_id, 'both');
    expect(await store.load(deck.deck_id, 'both')).toBeNull();
  });
  it('survives storage exceptions', async () => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true, get() {
        throw new Error('private mode');
      }
    });
    const store = new LocalStorageStore('private');
    const f = buildAnswersFile(deck, 'jane', []);
    await store.save(f);
    expect(await store.load(deck.deck_id, 'jane')).toEqual(f);
  });
  it('merges newest timestamps per card', () => {
    const a = buildAnswersFile(deck, 'tom', [{ card_id: 'a', swipe: 'yes', at: '2026-10-25T12:00:00Z' }]);
    const b = buildAnswersFile(deck, 'tom', [{ card_id: 'a', swipe: 'no', at: '2026-10-25T13:00:00Z' }, { card_id: 'b', swipe: 'no', at: '2026-10-25T13:00:00Z' }]);
    expect(mergeFiles(a, b)?.answers.map(x => x.swipe)).toEqual(['no', 'no']);
  });
});
it('keeps undo removed across remote restore, allowing a later replacement', () => {
  const remote = buildAnswersFile(deck, 'tom', [{ card_id: 'a', swipe: 'yes', at: '2026-10-25T12:00:00Z' }]);
  const local = buildAnswersFile(deck, 'tom', []);
  local.x_removed = { a: '2026-10-25T13:00:00Z' };
  expect(mergeFiles(local, remote)?.answers).toEqual([]);
  remote.answers[0].at = '2026-10-25T14:00:00Z';
  expect(mergeFiles(local, remote)?.answers).toHaveLength(1);
});
