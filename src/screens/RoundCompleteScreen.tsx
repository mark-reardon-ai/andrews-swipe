import { useEffect, useState } from 'react';
import type { Deck, SwipeAnswer, SwipeAnswersFile } from '../types';
import { exportAnswers } from '../export';
import { compareAnswers, personName, answerLabel } from '../compare';
import { filePerson, safeStorage } from '../storage';
import ComparisonList from '../components/ComparisonList';
interface Props {
    deck: Deck;
    file: SwipeAnswersFile;
    files: SwipeAnswersFile[];
    endpoint?: string;
    newRound: boolean;
    onNew: () => void;
    onSwitch: () => void;
    onRevise: (id: string, swipe: SwipeAnswer['swipe']) => void;
    onFavorite: (id: string) => void;
}
export default function RoundCompleteScreen({ deck, file, files, endpoint, newRound, onNew, onSwitch, onRevise, onFavorite }: Props) {
    const [review, setReview] = useState(false);
    const [pending, setPending] = useState(true);
    useEffect(() => {
        const check = () => {
            try {
                const queue = JSON.parse(safeStorage.get(`31andrews.outbox.${endpoint}`) ?? '{}');
                setPending(!!queue[`${file.deck_id}.${filePerson(file)}`]);
            }
            catch {
                setPending(true);
            }
        };
        check();
        const timer = setInterval(check, 1500);
        return () => clearInterval(timer);
    }, [endpoint, file]);
    const loved = file.answers.filter(a => a.swipe === 'yes').sort((a, b) => (b.strength ?? 0) - (a.strength ?? 0));
    const comparison = compareAnswers(deck, files);
    return <main className="summary screen">
        <div className="confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <span key={i} style={{ left: `${i * 7}%`, animationDelay: `${i * .3}s` }}>{i % 2 ? '♥' : '❧'}</span>)}</div>
        <p className="eyebrow">A LITTLE CLOSER TO HOME</p>
        <h1>You did it, {personName(filePerson(file))}!</h1>
        <p>A lovely start to your new kitchen. Tap a heart to save your favorites.</p>
        <h2>What you loved</h2>
        <div className="loved-grid">{loved.map(answer => {
            const card = deck.cards.find(c => c.id === answer.card_id);
            if (!card)
                return null;
            return <article key={card.id}>
                <img src={card.image.file} alt={card.image.alt} style={{ objectFit: card.image.fit ?? 'cover' }} />{answer.strength === 3 && <span className="star" aria-label="Loved strongly">★</span>}<button aria-label={`Favorite: ${card.question}`} aria-pressed={file.favorites?.includes(card.id) ?? false} onClick={() => onFavorite(card.id)}>{file.favorites?.includes(card.id) ? '♥' : '♡'}</button>
                <p>{card.question}</p>
            </article>;
        })}</div>
        {!loved.length && <p>No loved pictures this time. That helps Mark too.</p>}
        <p>Not for us: {file.answers.filter(a => a.swipe === 'no').length} · Not sure: {file.answers.filter(a => a.swipe === 'skip').length}</p>
        {comparison.some(c => c.conflict) && <section>
            <h2>Let’s talk about these</h2>
            <ComparisonList rows={comparison.filter(c => c.conflict)} />
        </section>}
        {comparison.some(c => c.agreedYes) && <section>
            <h2>You both loved</h2>
            <ComparisonList rows={comparison.filter(c => c.agreedYes)} />
        </section>}
        <div className="actions">
            <button className="primary" onClick={() => void exportAnswers(file)}>Send my answers to Mark</button>
            {endpoint && <p role="status">{pending ? 'Waiting to send to Mark…' : 'Already sent to Mark'}</p>}
            <button onClick={() => setReview(!review)}>Look at my answers again</button>
        </div>
        {review && <section>
            <h2>Your answers</h2>{deck.cards.map(card => <article className="review-card" key={card.id}>
                <p>{card.question}</p>
                <div className="review-buttons">{(['no', 'skip', 'yes'] as const).map(value => <button key={value} aria-pressed={file.answers.find(a => a.card_id === card.id)?.swipe === value} onClick={() => onRevise(card.id, value)}>{answerLabel(value)}</button>)}</div>
            </article>)}</section>}
        {newRound && <button className="primary" onClick={onNew}>A new round is ready!</button>}
        <p>Mark is putting together the next round. We’ll have it here soon.</p>
        <button onClick={onSwitch}>Back to start</button>
    </main>;
}
