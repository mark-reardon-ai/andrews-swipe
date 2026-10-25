import { actionFor, isAB } from './actions';
import { copy } from './copy';
import type { AppPerson, Deck, SwipeAnswersFile } from './types';
import { filePerson } from './storage';
export function compareAnswers(deck: Deck, files: SwipeAnswersFile[]) {
  const people = new Map<AppPerson, SwipeAnswersFile>();
  for (const file of files) {
    if (file.deck_id === deck.deck_id)
      people.set(filePerson(file), file);
  }
  return deck.cards.map(card => {
    const answers = [...people].flatMap(([person, file]) => {
      const answer = file.answers.find(a => a.card_id === card.id);
      return answer ? [{ person, ...answer }] : [];
    });
    const conflict = answers.some((a, i) => answers.slice(i + 1).some(b => a.swipe !== b.swipe));
    const agreedYes = !isAB(card) && answers.some(a => a.person === 'tom' && a.swipe === 'yes') && answers.some(a => a.person === 'jane' && a.swipe === 'yes');
    return { card, answers, conflict, agreedYes };
  });
}
export const personName = (person: AppPerson) => person === 'both' ? 'Tom & Jane' : person === 'mark' ? 'Mark' : person === 'tom' ? 'Tom' : 'Jane';
export const answerLabel = (value: 'yes' | 'no', card?: import('./types').Card) => card ? actionFor(card, value).label : value === 'yes' ? copy.yes : copy.no;
export const conflictText = (card: import('./types').Card, answers: {person: AppPerson; swipe: 'yes' | 'no'}[]) => answers.map(a => `${personName(a.person)}: ${answerLabel(a.swipe, card)}`).join(' · ');
