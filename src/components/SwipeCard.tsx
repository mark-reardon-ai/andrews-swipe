import { actionsFor, buttonLabel } from '../actions';
import { copy } from '../copy';
import { useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { imageSrcSet, type Card, type SwipeAnswer } from '../types';
import { classifySwipe } from '../swipe';
export type Choice = {
  swipe: SwipeAnswer['swipe'];
};
interface Props {
  card: Card;
  underneath?: boolean;
  request?: Choice | null;
  onAnswer?: (choice: Choice) => void;
  onInteract?: () => void;
  onUndo?: () => void;
  onBusy?: (busy: boolean) => void;
}
export default function SwipeCard({ card, underneath, request, onAnswer, onInteract, onUndo, onBusy }: Props) {
  const element = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    time: number;
    last: number;
    vx: number;
    vy: number;
  } | null>(null);
  const frame = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busy = useRef(false);
  const actions = actionsFor(card);
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function paint(dx: number, dy: number) {
    const node = element.current;
    if (!node)
      return;
    node.style.transform = reduced() ? '' : `translate3d(${dx}px, ${dy}px, 0) rotate(${Math.max(-12, Math.min(12, dx / 20))}deg)`;
    node.parentElement?.classList.toggle('moving', Math.abs(dx) + Math.abs(dy) > 1);
    const width = node.clientWidth;
    node.style.setProperty('--yes', String(Math.min(1, Math.max(0, dx / (width * 0.3)))));
    node.style.setProperty('--no', String(Math.min(1, Math.max(0, -dx / (width * 0.3)))));
  }
  function fly(choice: Choice) {
    if (busy.current || underneath)
      return;
    busy.current = true;
    onBusy?.(true);
    onInteract?.();
    navigator.vibrate?.(15);
    cancelAnimationFrame(frame.current);
    const node = element.current;
    if (node) {
      node.style.transition = 'transform 280ms ease-in, opacity 280ms ease-in';
      paint(choice.swipe === 'yes' ? window.innerWidth * 1.5 : -window.innerWidth * 1.5, 0);
      node.style.opacity = '0';
    }
    timer.current = setTimeout(() => onAnswer?.(choice), reduced() ? 150 : 280);
  }
  useEffect(() => {
    if (request)
      fly(request);
    // Each request starts one flight using callbacks from that render.
  }, [request]);
  useEffect(() => {
    const node = element.current;
    if (!underneath)
      node?.focus({ preventScroll: true });
    const prevent = (event: TouchEvent) => {
      if (gesture.current)
        event.preventDefault();
    };
    node?.addEventListener('touchmove', prevent, { passive: false });
    return () => {
      node?.removeEventListener('touchmove', prevent);
      cancelAnimationFrame(frame.current);
      clearTimeout(timer.current);
    };
  }, []);
  function down(event: ReactPointerEvent<HTMLDivElement>) {
    if (underneath || busy.current || gesture.current || !event.isPrimary || event.button !== 0)
      return;
    onInteract?.();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.style.transition = 'none';
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0, time: event.timeStamp, last: event.timeStamp, vx: 0, vy: 0 };
  }
  function move(event: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId)
      return;
    const dx = event.clientX - g.x;
    const dy = event.clientY - g.y;
    const elapsed = Math.max(1, event.timeStamp - g.last);
    g.vx = (dx - g.dx) / elapsed;
    g.vy = (dy - g.dy) / elapsed;
    g.dx = dx;
    g.dy = dy;
    g.last = event.timeStamp;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => paint(dx, dy));
  }
  function release(event: ReactPointerEvent<HTMLDivElement>, cancelled = false) {
    const g = gesture.current;
    if (!g || g.id !== event.pointerId)
      return;
    gesture.current = null;
    cancelAnimationFrame(frame.current);
    const stale = event.timeStamp - g.last > 100;
    const choice = cancelled ? null : classifySwipe(g.dx, g.dy, stale ? 0 : g.vx, stale ? 0 : g.vy, event.currentTarget.clientWidth, event.currentTarget.clientHeight);
    if (choice)
      fly({ swipe: choice });
    else {
      event.currentTarget.style.transition = 'transform 300ms cubic-bezier(.2,.8,.2,1)';
      paint(0, 0);

    }
  }
  return <div
    ref={element}
    className={`swipe-card ${underneath ? 'underneath' : 'top-card'}`}
    data-testid="swipe-card"
    data-card-id={card.id}
    tabIndex={underneath ? -1 : 0}
    role={underneath ? undefined : 'group'}
    aria-label={underneath ? undefined : `${card.question} ${copy.cardKeys}`}
    aria-hidden={underneath || undefined}
    onPointerDown={down}
    onPointerMove={move}
    onPointerUp={e => release(e)}
    onPointerCancel={e => release(e, true)}
    onKeyDown={e => {
      if (underneath || busy.current)
        return;
      const swipe = e.key === 'ArrowLeft' ? actions.left.swipe : e.key === 'ArrowRight' ? actions.right.swipe : undefined;
      if (swipe) {
        e.preventDefault();
        fly({ swipe });
      }
      if (e.key === 'Backspace' || e.key.toLowerCase() === 'z') {
        e.preventDefault();
        onUndo?.();
      }

    }}

  >
    <div className={`card-images ${card.image.file_b ? 'comparison' : ''}`}>
      {[card.image.file, card.image.file_b].filter(Boolean).map((file, i) => <div className="image-slot" key={file}>
        <img
          src={file}
          srcSet={imageSrcSet(card.image, i === 1)}
          sizes="100vw"
          alt={card.image.file_b ? `${i === 0 ? 'A' : 'B'}: ${card.image.alt}` : card.image.alt}
          decoding="async"
          fetchPriority={underneath ? 'auto' : 'high'}
          draggable={false}
          style={{ objectFit: card.image.fit ?? 'cover' }}

        />
        {card.image.file_b && <span className="image-label">{card.x_ab ? buttonLabel(card, i === 0 ? 'left' : 'right') : (i === 0 ? 'A' : 'B')}</span>}
      </div>)}
    </div>
    {!underneath && <>
      <div className="edge yes-edge" />
      <div className="edge no-edge" />
      <span className="stamp love-stamp">{actions.right.label.toUpperCase()}</span>
      <span className="stamp no-stamp">{actions.left.label.toUpperCase()}</span>
    </>}
  </div>;
}
