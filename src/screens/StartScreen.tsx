import { copy } from '../copy';
import { useRef } from 'react';
import type { AppPerson, Deck } from '../types';
import { imageSrcSet } from '../types';
import type { Files } from '../state';
export default function StartScreen({ deck, files, onChoose, roundTitle, test = false }: {
  test?: boolean;
  deck: Deck;
  roundTitle: string;
  files: Files;
  onChoose: (p: AppPerson) => void;
}) {
  const taps = useRef(0);
  return <main className="start screen">
    <img
      className="hero"
      src={deck.cards[0].image.file}
      srcSet={imageSrcSet(deck.cards[0].image)}
      sizes="100vw"
      alt=""

    />
    <header>
      <div className="masthead"><button
        className="house-logo"
        aria-label="House logo"
        onClick={() => {
          taps.current += 1;
          if (taps.current >= 5)
            location.hash = '/admin';
        }}

      >⌂</button>
        <span className="eyebrow">{copy.home}</span>{/sample/i.test(deck.deck_id) && <span className="ribbon">SAMPLE</span>}</div><p className="round-eyebrow">{roundTitle}</p>
      <h1>{copy.headline}</h1><p className="subline">{copy.subline}</p>{deck.intro && <p className="intro">{deck.intro}</p>}
    </header>
    <section className="welcome">
      <p>{copy.helper}</p>
      <div className="people">{((test ? ['tom', 'jane', 'both', 'mark'] : ['tom', 'jane', 'both']) as AppPerson[]).map(p => {
        const count = deck.cards.filter(c => files[p]?.answers.some(a => a.card_id === c.id)).length;
        return <button
          aria-label={p === 'both' ? copy.together : `I’m ${p === 'mark' ? 'Mark (test)' : p === 'tom' ? 'Tom' : 'Jane'}`}
          className={p === 'both' ? 'together' : 'primary'}
          key={p}
          onClick={() => onChoose(p)}

        >
          <span>{p === 'both' ? copy.together : `I’m ${p === 'mark' ? 'Mark (test)' : p === 'tom' ? 'Tom' : 'Jane'}`}</span>
          <small>{count === deck.cards.length ? copy.allDone : count ? `${count} of ${deck.cards.length} done` : copy.notStarted}</small>
        </button>;
      })}</div>
    </section>
  </main>;
}
