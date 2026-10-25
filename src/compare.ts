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
        const agreedYes = answers.some(a => a.person === 'tom' && a.swipe === 'yes') && answers.some(a => a.person === 'jane' && a.swipe === 'yes');
        return { card, answers, conflict, agreedYes };
    });
}
export const personName = (person: AppPerson) => person === 'both' ? 'Tom & Jane' : person === 'tom' ? 'Tom' : 'Jane';
export const answerLabel = (value: string) => value === 'yes' ? 'Love it' : value === 'no' ? 'No' : 'Not sure';
