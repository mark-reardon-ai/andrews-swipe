import { useRef } from 'react';
import type { AppPerson, Deck } from '../types';
import { imageSrcSet } from '../types';
import type { Files } from '../state';
export default function StartScreen({ deck, files, onChoose }: {
    deck: Deck;
    files: Files;
    onChoose: (p: AppPerson) => void;
}) {
    const taps = useRef(0);
    return <main className="start screen">
        <img className="hero" src={deck.cards[0].image.file} srcSet={imageSrcSet(deck.cards[0].image)} sizes="100vw" alt="" />
        <div className="hero-shade" />
        <header>
            <button className="house-logo" aria-label="House logo" onClick={() => {
                taps.current += 1;
                if (taps.current >= 5)
                    location.hash = '/admin';
            }}>⌂</button>
            <span className="eyebrow">31 ANDREWS · OUR MAINE HOME</span>{/sample/i.test(deck.deck_id) && <span className="ribbon">SAMPLE</span>}<h1>{deck.intro ?? 'Your new kitchen, one picture at a time'}</h1>
        </header>
        <section className="welcome">
            <p>Swipe right if you love it, left if not, up if you’re not sure. Or just tap the buttons.</p>
            <div className="people">{(['tom', 'jane', 'both'] as AppPerson[]).map(p => {
                const count = deck.cards.filter(c => files[p]?.answers.some(a => a.card_id === c.id)).length;
                return <button className={p === 'both' ? 'together' : 'primary'} key={p} onClick={() => onChoose(p)}>
                    <span>{p === 'both' ? 'We’re doing it together' : `I’m ${p === 'tom' ? 'Tom' : 'Jane'}`}</span>
                    <small>{count === deck.cards.length ? 'All done!' : count ? `${count} of ${deck.cards.length} done` : 'Not started'}</small>
                </button>;
            })}</div>
        </section>
    </main>;
}
