import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import sample from '../../public/decks/R01-sample/deck.json';
import type { Deck, SwipeAnswer } from '../types';
import { actionsFor, buttonLabel, isAB } from '../actions';
import { buildAnswersFile } from '../export';
import { parseFile } from '../storage';
import { prepareDeck } from '../deck';
import { compareAnswers, conflictText } from '../compare';
import { copy } from '../copy';
import CardScreen from '../screens/CardScreen';
const deck = sample as unknown as Deck;
const card = deck.cards[0];
const ab = deck.cards[1];
describe('two actions', () => {
  it('uses Nope / Love it for ordinary and unlabeled compare cards', () => {
    expect(actionsFor(card)).toEqual({ left: { label: 'Nope', swipe: 'no' }, right: { label: 'Love it', swipe: 'yes' } });
    expect(actionsFor({ ...ab, x_ab: undefined })).toEqual(actionsFor(card));
  });
  it('maps A/B labels and picks to the two directions', () => {
    expect(actionsFor(ab)).toEqual({ left: { label: 'Counter', swipe: 'no', x_pick: 'a' }, right: { label: 'Island', swipe: 'yes', x_pick: 'b' } });
    expect(buttonLabel(ab, 'left')).toBe('← Counter');
    expect(buttonLabel(ab, 'right')).toBe('Island →');
  });
  it('drops legacy skips and strips legacy fields on load and write', () => {
    const legacy = [{ card_id: card.id, swipe: 'skip' }, { card_id: ab.id, swipe: 'yes', at: '2026-10-25T12:00:00Z', note: 'old', strength: 3 }];
    const raw = { ...buildAnswersFile(deck, 'tom', []), answers: legacy };
    const loaded = parseFile(JSON.stringify(raw), deck.deck_id, 'tom')!;
    expect(loaded.answers).toEqual([{ card_id: ab.id, swipe: 'yes', at: '2026-10-25T12:00:00Z' }]);
    const written = buildAnswersFile(deck, 'tom', legacy as unknown as SwipeAnswer[]);
    expect(written.answers).toEqual([{ card_id: ab.id, swipe: 'yes', x_pick: 'b', at: '2026-10-25T12:00:00Z' }]);
    expect(JSON.stringify(written.answers)).not.toMatch(/skip|note|strength/);
  });
  it('uses option labels in conflicts and excludes A/B agreement from loved', () => {
    const file = (person: 'tom' | 'jane', swipe: 'yes' | 'no') => buildAnswersFile(deck, person, [{ card_id: ab.id, swipe, at: '2026-10-25T12:00:00Z' }]);
    const row = compareAnswers(deck, [file('tom', 'no'), file('jane', 'yes')])[1];
    expect(row.conflict).toBe(true);
    expect(conflictText(row.card, row.answers)).toBe('Tom: Counter · Jane: Island');
    expect(compareAnswers(deck, [file('tom', 'yes'), file('jane', 'yes')])[1].agreedYes).toBe(false);
    expect(conflictText(card, [{ person: 'tom', swipe: 'yes' }, { person: 'jane', swipe: 'no' }])).toBe('Tom: Love it · Jane: Nope');
  });
  it('validates labels and the second image without requiring x_ab', () => {
    vi.stubGlobal('document', { baseURI: 'https://example.invalid/' });
    try {
      expect(prepareDeck(structuredClone(deck), document.baseURI).cards.some(isAB)).toBe(true);
      for (const extension of [{ left: '', right: 'Island' }, { left: 'Counter', right: ' ' }]) {
        const invalid = structuredClone(deck); invalid.cards[1].x_ab = extension;
        expect(() => prepareDeck(invalid, document.baseURI)).toThrow();
      }
      const invalid = structuredClone(deck); delete invalid.cards[1].image.file_b;
      expect(() => prepareDeck(invalid, document.baseURI)).toThrow();
    } finally { vi.unstubAllGlobals(); }
  });
  it('keeps participant copy and rendered cards free of removed UI', () => {
    for (const value of Object.values(copy)) {
      const text = typeof value === 'function' ? (value as (arg: never) => string)('Tom' as never) : value;
      expect(text).not.toMatch(/Not sure|\bnote\b|\bMore\b/i);
    }
    for (const index of [0, 1, 9]) {
      const changed = structuredClone(deck); changed.cards[index].detail = 'Hidden detail';
      const html = renderToStaticMarkup(<CardScreen deck={changed} index={index} size={10} person="tom" onAnswer={() => {}} onSwitch={() => {}} onUndo={() => {}} canUndo hint={null} dismissHint={() => {}} />);
      expect(html).not.toMatch(/Not sure|\bnote\b|\bMore\b|Hidden detail|Tap to zoom|LOVE LOVE/i);
      for (const id of ['swipe-card', 'btn-left', 'btn-right', 'btn-undo']) expect(html).toContain(`data-testid="${id}"`);
    }
  });
});
