import { describe, expect, it } from 'vitest';
import sample from '../../public/decks/R01-sample/deck.json';
import type { AppPerson, Deck, SwipeAnswer } from '../types';
import { buildAnswersFile, answersCSV } from '../export';
import { compareAnswers } from '../compare';
const deck = sample as unknown as Deck;
function file(person: AppPerson, swipe: SwipeAnswer['swipe']) {
    return buildAnswersFile(deck, person, [{ card_id: deck.cards[0].id, swipe, at: '2026-10-25T12:00:00Z' }]);
}
describe('comparisons across participants', () => {
    it.each([['yes', 'no', true], ['yes', 'skip', true], ['no', 'skip', true], ['yes', 'yes', false], ['skip', 'skip', false]] as const)('%s versus %s', (a, b, conflict) => {
        expect(compareAnswers(deck, [file('tom', a), file('jane', b)])[0].conflict).toBe(conflict);
    });
    it('includes joint differences and requires individual yes answers for agreement', () => {
        expect(compareAnswers(deck, [file('tom', 'yes'), file('both', 'no')])[0].conflict).toBe(true);
        expect(compareAnswers(deck, [file('tom', 'yes'), file('both', 'yes')])[0].agreedYes).toBe(false);
        expect(compareAnswers(deck, [file('tom', 'yes'), file('jane', 'yes')])[0].agreedYes).toBe(true);
    });
    it('ignores absent answers, unrelated decks, and does not mutate files', () => {
        const tom = file('tom', 'yes');
        const other = { ...file('jane', 'no'), deck_id: 'another-deck' };
        expect(compareAnswers(deck, [tom, other])[0].conflict).toBe(false);
        expect(tom.answers).toHaveLength(1);
    });
});
describe('CSV and favorite exports', () => {
    it('uses answer.schema columns plus joint, and quotes CSV values', () => {
        const joint = file('both', 'yes');
        joint.answers[0].note = 'Warm, "lovely"\nroom';
        joint.answers[0].strength = 3;
        const csv = answersCSV([joint]);
        expect(csv.split('\r\n')[0]).toBe('"question","person","value","strength","note","at","channel","recorded_by","joint"');
        expect(csv).toContain(`"${deck.cards[0].id}","other","yes","3","Warm, ""lovely""\nroom"`);
        expect(csv).toContain('"swipe_app","other","true"');
    });
    it('retains only favorites that are still loved when rebuilding', () => {
        const previous = file('tom', 'yes');
        previous.favorites = [deck.cards[0].id];
        expect(buildAnswersFile(deck, 'tom', previous.answers, previous).favorites).toEqual(previous.favorites);
        expect(buildAnswersFile(deck, 'tom', [{ ...previous.answers[0], swipe: 'no' }], previous).favorites).toEqual([]);
    });
});
