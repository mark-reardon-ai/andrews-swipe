import { actionFor } from './actions';
import { useRef, useState } from 'react';
import type { AppPerson, Deck, SwipeAnswer, SwipeAnswersFile, Sitting } from './types';
import type { AnswerStore } from './storage';
import { buildAnswersFile } from './export';
export type Files = Partial<Record<AppPerson, SwipeAnswersFile>>;
export const firstUnanswered = (deck: Deck, file?: SwipeAnswersFile) => deck.cards.findIndex(c => !file?.answers.some(a => a.card_id === c.id));
export function useAnswers(deck: Deck, store: AnswerStore, initial: Files, size: number, initialPerson: AppPerson | null, test = false) {
  const [files, setFiles] = useState(initial);
  const filesRef = useRef(initial);
  const [person, setPerson] = useState<AppPerson | null>(initialPerson);
  const [pause, setPause] = useState(false);
  const sitting = useRef<Sitting | null>(null);
  const shown = useRef(Date.now());
  const history = useRef<{
    person: AppPerson;
    file: SwipeAnswersFile | undefined;
  }[]>([]);
  const index = person ? firstUnanswered(deck, files[person]) : 0;
  function choose(p: AppPerson | null) {
    setPerson(p);
    setPause(false);
    sitting.current = null;
    shown.current = Date.now();
  }
  function commit(p: AppPerson, file: SwipeAnswersFile) {
    file = { ...file, x_test: test || p === 'mark' };
    filesRef.current = { ...filesRef.current, [p]: file };
    setFiles(filesRef.current);
    void store.save(file);
  }
  function answer(swipe: SwipeAnswer['swipe']) {
    if (!person || index < 0 || pause)
      return;
    const previous = filesRef.current[person];
    const activeIndex = firstUnanswered(deck, previous);
    if (activeIndex < 0)
      return;
    const now = new Date().toISOString();
    history.current.push({ person, file: previous });
    if (!sitting.current)
      sitting.current = { started: now, cards: [] };
    sitting.current = { ...sitting.current, cards: [...sitting.current.cards, deck.cards[activeIndex].id] };
    const answers = [...(previous?.answers ?? []), { card_id: deck.cards[activeIndex].id, ...actionFor(deck.cards[activeIndex], swipe), ...(previous?.x_removed?.[deck.cards[activeIndex].id] ? { revisited: true } : {}), at: now, dwell_ms: Math.max(0, Date.now() - shown.current) }];
    const count = deck.cards.filter(c => answers.some(a => a.card_id === c.id)).length;
    const boundary = count % size === 0 || count === deck.cards.length;
    if (boundary)
      sitting.current.finished = now;
    const sessions = [...(previous?.x_sessions ?? []).filter(s => s.started !== sitting.current!.started), sitting.current];
    commit(person, buildAnswersFile(deck, person, answers, previous, sessions));
    if (boundary && count < deck.cards.length)
      setPause(true);
    if (boundary)
      sitting.current = null;
    shown.current = Date.now();
  }
  function undo() {
    if (!person)
      return;
    const pos = history.current.findLastIndex(h => h.person === person);
    let file: SwipeAnswersFile;
    if (pos >= 0) {
      const [last] = history.current.splice(pos, 1);
      file = last.file ?? buildAnswersFile(deck, person, []);
    }
    else {
      const previous = filesRef.current[person];
      if (!previous?.answers.length)
        return;
      const answers = [...previous.answers];
      const removed = answers.sort((a, b) => a.at.localeCompare(b.at)).pop()!;
      file = buildAnswersFile(deck, person, answers, previous, previous.x_sessions?.map(s => ({ ...s, finished: undefined, cards: s.cards.filter(c => c !== removed.card_id) })));
    }
    const current = filesRef.current[person];
    const removed = current?.answers.filter(a => !file.answers.some(b => b.card_id === a.card_id)) ?? [];
    file.x_removed = { ...current?.x_removed, ...file.x_removed, ...Object.fromEntries(removed.map(a => [a.card_id, new Date().toISOString()])) };
    commit(person, file);
    sitting.current = null;
    setPause(false);
    shown.current = Date.now();
  }
  function revise(cardId: string, swipe: SwipeAnswer['swipe']) {
    if (!person)
      return;
    const previous = filesRef.current[person];
    if (!previous)
      return;
    const answers = previous.answers.map(a => a.card_id === cardId ? { ...a, ...actionFor(deck.cards.find(c => c.id === cardId)!, swipe), revisited: true, at: new Date().toISOString() } : a);
    commit(person, buildAnswersFile(deck, person, answers, previous));
  }
  function favorite(cardId: string) {
    if (!person)
      return;
    const previous = filesRef.current[person];
    if (!previous)
      return;
    const favorites = previous.favorites ?? [];
    commit(person, { ...previous, favorites: favorites.includes(cardId) ? favorites.filter(id => id !== cardId) : [...favorites, cardId] });
  }
  return {
    revise, favorite, files, person, index, pause, choose, answer, undo, keepGoing: () => {
      setPause(false);
      shown.current = Date.now();
    }
  };
}
