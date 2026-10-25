import { copy } from '../copy';
import { useEffect, useRef, useState } from 'react';
import { imageSrcSet, type AppPerson, type Deck, type SwipeAnswer } from '../types';
import { safeStorage } from '../storage';
import SwipeCard, { type Choice } from '../components/SwipeCard';
export { default as SwipeCard } from '../components/SwipeCard';
interface Props {
  deck: Deck;
  index: number;
  size: number;
  person: AppPerson;
  onAnswer: (s: SwipeAnswer['swipe'], extras?: Pick<SwipeAnswer, 'note' | 'strength'>) => void;
  onNote: (id: string, note: string) => void;
  onSwitch: () => void;
  onUndo: () => void;
  canUndo: boolean;
  hint: string | null;
  dismissHint: () => void;
}
export default function CardScreen({ deck, index, size, person, onAnswer, onNote, onSwitch, onUndo, canUndo, hint, dismissHint }: Props) {
  const card = deck.cards[index];
  const name = person === 'both' ? 'Tom & Jane' : person === 'tom' ? 'Tom' : 'Jane';
  const offset = Math.floor(index / size) * size;
  const total = Math.min(size, deck.cards.length - offset);
  const coachKey = `31andrews.coach.${person}`;
  const [coach, setCoach] = useState(index === 0 && !safeStorage.get(coachKey));
  const [request, setRequest] = useState<Choice | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState('');
  const [sheet, setSheet] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [toast, setToast] = useState(false);
  const last = useRef<string | null>(null);
  const longPress = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const held = useRef(false);
  const noteButton = useRef<HTMLButtonElement>(null);
  const zoomButton = useRef<HTMLButtonElement>(null);
  function interact() {
    setCoach(false);
    safeStorage.set(coachKey, 'seen');
  }
  function choose(choice: Choice) {
    if (!busy && !request) {
      interact();
      setRequest(choice);
    }
  }
  function answered(choice: Choice) {
    last.current = card.id;
    onAnswer(choice.swipe, { ...(note ? { note } : {}), ...(choice.strength ? { strength: choice.strength } : {}) });
    setNote('');
    setRequest(null);
    setBusy(false);
  }
  function undo() {
    if (!busy) {
      interact();
      last.current = null;
      setNote('');
      onUndo();
    }
  }
  function cancelHold() {
    clearTimeout(longPress.current);
  }
  useEffect(() => {
    const scrollY = window.scrollY;
    const oldTop = document.body.style.top;
    document.body.style.top = `-${scrollY}px`;
    document.body.classList.add('in-card');
    return () => {
      document.body.classList.remove('in-card');
      document.body.style.top = oldTop;
      window.scrollTo(0, scrollY);
      clearTimeout(longPress.current);
    };
  }, []);
  useEffect(() => {
    deck.cards.slice(index + 1, index + 3).forEach(c => {
      [false, true].forEach(second => {
        const source = second ? c.image.file_b : c.image.file;
        if (!source)
          return;
        const img = new Image();
        img.sizes = '100vw';
        img.srcset = imageSrcSet(c.image, second) ?? '';
        img.src = source;
      });
    });
    if (index > 0 && index % 5 === 0) {
      setToast(true);
      const timer = setTimeout(() => setToast(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [deck, index]);
  useEffect(() => {
    if (!sheet && !zoom && !detailOpen)
      return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSheet(false);
        setZoom(false);
        setDetailOpen(false);
      }
      if (event.key === 'Tab') {
        const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
        const controls = dialog?.querySelectorAll<HTMLElement>('button, textarea');
        if (!controls?.length)
          return;
        const first = controls[0];
        const final = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          final.focus();
        }
        if (!event.shiftKey && document.activeElement === final) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [sheet, zoom, detailOpen]);
  return <main className="card-screen screen">
    <div className="card-content" inert={sheet || zoom || detailOpen}>
      <header className="card-top">
        <button
          className="person-chip"
          disabled={busy}
          onClick={onSwitch}

        >{name}<small>Switch</small>
        </button>
        <div className="top-progress">
          <span>{index - offset + 1} of {total}</span>
          <progress
            value={index - offset + 1}
            max={total}
            aria-label="Round progress"

          />
        </div>
        <button
          className="text-button"
          disabled={!canUndo || busy}
          onClick={undo}

        >↶ Back</button>
      </header>
      <div className="card-stack">
        {deck.cards[index + 1] && <SwipeCard
          key={`${deck.cards[index + 1].id}-under`}
          card={deck.cards[index + 1]}
          underneath

        />}
        <SwipeCard
          key={`${person}-${card.id}`}
          card={card}
          request={request}
          onAnswer={answered}
          onBusy={setBusy}
          onInteract={interact}
          onUndo={undo}
          onZoom={() => {
            interact();
            setZoom(true);
          }}

        />
        {card.image.fit === 'contain' && <button
          ref={zoomButton}
          className="zoom-access"
          onClick={() => {
            interact();
            setZoom(true);
          }}

        >Tap to zoom</button>}
        {coach && <aside className="coach">
          <span aria-hidden="true">☝</span>
          <p>{copy.coach}</p>
        </aside>}
      </div>
      <section className="question" aria-live="polite">
        <h1>{card.question}</h1>{card.detail && <div className="detail-preview">
          <p>{card.detail}</p>
          <button onClick={() => setDetailOpen(true)}>More</button>
        </div>}</section>
      <footer className="answer-footer">
        <button
          ref={noteButton}
          className="note-pill"
          disabled={busy}
          onClick={() => {
            interact();
            setTarget(null);
            setDraft(note);
            setSheet(true);
          }}

        >{note ? 'Edit your note' : 'Add a note'}</button>
        <div className="answer-buttons">
          <button
            aria-label="No"
            className="no"
            disabled={busy}
            onClick={() => choose({ swipe: 'no' })}

          >
            <b aria-hidden="true">✕</b>
            <span>{copy.no}</span>
          </button>
          <button
            aria-label="Not sure"
            className="skip"
            disabled={busy}
            onClick={() => choose({ swipe: 'skip' })}

          >
            <b aria-hidden="true">?</b>
            <span>{copy.skip}</span>
          </button>
          <button
            aria-label="Love it"
            className="yes"
            disabled={busy}
            onPointerDown={e => {
              if (!e.isPrimary || e.button !== 0)
                return;
              e.currentTarget.setPointerCapture(e.pointerId);
              held.current = false;
              longPress.current = setTimeout(() => {
                held.current = true;
                choose({ swipe: 'yes', strength: 3 });
              }, 600);
            }}
            onPointerUp={cancelHold}
            onPointerCancel={cancelHold}
            onContextMenu={e => e.preventDefault()}
            onClick={() => {
              cancelHold();
              if (!held.current)
                choose({ swipe: 'yes' });
              held.current = false;
            }}

          >
            <b aria-hidden="true">♥</b>
            <span>{copy.yes}</span>
          </button>
        </div>
      </footer>
      {last.current && <button
        className="last-note"
        disabled={busy}
        onClick={() => {
          setTarget(last.current);
          setDraft('');
          setSheet(true);
        }}

      >Note on previous picture</button>}
      {toast && <aside className="encouragement" role="status">{copy.encouragement(name)}</aside>}
      {hint && <aside className="home-hint">
        <p>{hint}</p>
        <button onClick={dismissHint}>{copy.gotIt}</button>
      </aside>}
    </div>
    {detailOpen && <div className="modal-backdrop">
      <section
        className="note-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"

      >
        <h2 id="detail-title">{card.question}</h2>
        <p>{card.detail}</p>
        <button autoFocus onClick={() => setDetailOpen(false)}>Close</button>
      </section>
    </div>}
    {sheet && <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-title"
        className="note-sheet"

      >
        <h2 id="note-title">Your thoughts</h2>
        <textarea
          autoFocus
          aria-label="Your note"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="What would you like Mark to know?"

        />
        <div>
          <button onClick={() => {
            setSheet(false);
            noteButton.current?.focus();
          }}>Cancel</button>
          <button className="primary" onClick={() => {
            if (target)
              onNote(target, draft);
            else
              setNote(draft);
            setSheet(false);
            noteButton.current?.focus();
          }}>Save note</button>
        </div>
      </section>
    </div>}
    {zoom && <div
      className="zoom-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Floor plan viewer"

    >
      <button autoFocus onClick={() => {
        setZoom(false);
        zoomButton.current?.focus();
      }}>✕ Close</button>
      <div className="zoom-scroll">
        <img src={card.image.file} alt={card.image.alt} />
      </div>
      <p>Pinch with two fingers to zoom</p>
    </div>}
  </main>;
}
