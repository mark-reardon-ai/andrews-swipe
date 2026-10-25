import { useEffect, useState } from 'react';
import { copy } from '../copy';
import { actionsFor, buttonLabel, isAB } from '../actions';
import { imageSrcSet, type AppPerson, type Deck, type SwipeAnswer } from '../types';
import { personName } from '../compare';
import SwipeCard, { type Choice } from '../components/SwipeCard';
export { default as SwipeCard } from '../components/SwipeCard';
interface Props {
  deck: Deck; index: number; size: number; person: AppPerson;
  onAnswer: (swipe: SwipeAnswer['swipe']) => void;
  onSwitch: () => void; onUndo: () => void; canUndo: boolean;
  hint: string | null; dismissHint: () => void;
}
export default function CardScreen({ deck, index, size, person, onAnswer, onSwitch, onUndo, canUndo }: Props) {
  const card = deck.cards[index];
  const actions = actionsFor(card);
  const [request, setRequest] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    document.body.classList.add('in-card');
    return () => document.body.classList.remove('in-card');
  }, []);
  useEffect(() => {
    deck.cards.slice(index + 1, index + 3).forEach(c => [false, true].forEach(second => {
      const source = second ? c.image.file_b : c.image.file;
      if (!source) return;
      const image = new Image(); image.sizes = '100vw'; image.srcset = imageSrcSet(c.image, second) ?? ''; image.src = source;
    }));
  }, [deck, index]);
  function undo() { if (!busy) onUndo(); }
  return <main className="card-screen screen"><div className="card-content">
    <header className="card-top">
      <button className="person-chip" disabled={busy} onClick={onSwitch}>{personName(person)}</button>
      <span className="top-progress">{index % size + 1} of {Math.min(size, deck.cards.length - Math.floor(index / size) * size)}</span>
      <button className="text-button" disabled={!canUndo || busy} onClick={undo}>{copy.back}</button>
    </header>
    <div className="card-stack">
      {deck.cards[index + 1] && <SwipeCard key={`${deck.cards[index + 1].id}-under`} card={deck.cards[index + 1]} underneath />}
      <SwipeCard key={`${person}-${card.id}`} card={card} request={request} onBusy={setBusy} onUndo={undo} onAnswer={choice => {
        onAnswer(choice.swipe); setRequest(null); setBusy(false);
      }} />
    </div>
    <section className="question" aria-live="polite"><h1>{card.question}</h1></section>
    <footer className="answer-footer"><div className="answer-buttons">
      <button data-testid="btn-left" aria-label={buttonLabel(card, 'left')} className={isAB(card) ? 'ab-choice' : 'no'} disabled={busy || !!request} onClick={() => setRequest(actions.left)}>{buttonLabel(card, 'left')}</button>
      <button data-testid="btn-undo" aria-label={copy.undo} disabled={!canUndo || busy} onClick={undo}>↶</button>
      <button data-testid="btn-right" aria-label={buttonLabel(card, 'right')} className={isAB(card) ? 'ab-choice' : 'yes'} disabled={busy || !!request} onClick={() => setRequest(actions.right)}>{buttonLabel(card, 'right')}</button>
    </div></footer>
  </div></main>;
}
