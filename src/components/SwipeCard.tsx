import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { imageSrcSet, type Card, type SwipeAnswer } from '../types';
import { classifySwipe } from '../swipe';
export type Choice = {
    swipe: SwipeAnswer['swipe'];
    strength?: 3;
};
interface Props {
    card: Card;
    underneath?: boolean;
    request?: Choice | null;
    onAnswer?: (choice: Choice) => void;
    onInteract?: () => void;
    onZoom?: () => void;
    onUndo?: () => void;
    onBusy?: (busy: boolean) => void;
}
export default function SwipeCard({ card, underneath, request, onAnswer, onInteract, onZoom, onUndo, onBusy }: Props) {
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
    const lastTap = useRef(0);
    const [burst, setBurst] = useState(false);
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function paint(dx: number, dy: number) {
        const node = element.current;
        if (!node)
            return;
        node.style.transform = reduced() ? '' : `translate3d(${dx}px, ${dy}px, 0) rotate(${Math.max(-12, Math.min(12, dx / 20))}deg)`;
        const width = node.clientWidth;
        const height = node.clientHeight;
        node.style.setProperty('--yes', String(Math.min(1, Math.max(0, dx / (width * 0.3)))));
        node.style.setProperty('--no', String(Math.min(1, Math.max(0, -dx / (width * 0.3)))));
        node.style.setProperty('--skip', String(Math.min(1, Math.max(0, -dy / (height * 0.22)))));
    }
    function fly(choice: Choice) {
        if (busy.current || underneath)
            return;
        busy.current = true;
        onBusy?.(true);
        onInteract?.();
        navigator.vibrate?.(choice.strength ? [25, 40, 25] : 15);
        if (choice.strength)
            setBurst(true);
        cancelAnimationFrame(frame.current);
        const node = element.current;
        if (node) {
            node.style.transition = 'transform 280ms ease-in, opacity 280ms ease-in';
            paint(choice.swipe === 'yes' ? window.innerWidth * 1.5 : choice.swipe === 'no' ? -window.innerWidth * 1.5 : 0, choice.swipe === 'skip' ? -window.innerHeight * 1.5 : 0);
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
            if (!cancelled && Math.hypot(g.dx, g.dy) < 8) {
                if (card.image.fit === 'contain')
                    onZoom?.();
                else if (lastTap.current > 0 && event.timeStamp - lastTap.current < 320)
                    fly({ swipe: 'yes', strength: 3 });
                lastTap.current = event.timeStamp;
            }
        }
    }
    return <div ref={element} className={`swipe-card ${underneath ? 'underneath' : 'top-card'}`} data-testid="swipe-card" data-card-id={card.id} tabIndex={underneath ? -1 : 0} role={underneath ? undefined : 'group'} aria-label={underneath ? undefined : `${card.question} Use arrow keys to answer.`} aria-hidden={underneath || undefined} onPointerDown={down} onPointerMove={move} onPointerUp={e => release(e)} onPointerCancel={e => release(e, true)} onKeyDown={e => {
            if (underneath || busy.current)
                return;
            const swipe = { ArrowRight: 'yes', ArrowLeft: 'no', ArrowUp: 'skip' }[e.key] as SwipeAnswer['swipe'] | undefined;
            if (swipe) {
                e.preventDefault();
                fly({ swipe });
            }
            if (e.key === 'Backspace' || e.key.toLowerCase() === 'z') {
                e.preventDefault();
                onUndo?.();
            }
            if ((e.key === 'Enter' || e.key === ' ') && card.image.fit === 'contain') {
                e.preventDefault();
                onZoom?.();
            }
        }}>
    <div className={`card-images ${card.image.file_b ? 'comparison' : ''}`}>
      {[card.image.file, card.image.file_b].filter(Boolean).map((file, i) => <div className="image-slot" key={file}>
        <img src={file} srcSet={imageSrcSet(card.image, i === 1)} sizes="100vw" alt={card.image.file_b ? `${i === 0 ? 'A' : 'B'}: ${card.image.alt}` : card.image.alt} decoding="async" fetchPriority={underneath ? 'auto' : 'high'} draggable={false} style={{ objectFit: card.image.fit ?? 'cover' }}/>
        {card.image.file_b && <span className="image-label">{card.kind === 'anchor_now' ? (i === 0 ? 'Today' : 'Model') : (i === 0 ? 'A' : 'B')}</span>}
      </div>)}
    </div>
    {!underneath && <><div className="edge yes-edge"/><div className="edge no-edge"/><div className="edge skip-edge"/><span className="stamp love-stamp">LOVE IT</span><span className="stamp no-stamp">NO THANKS</span><span className="stamp skip-stamp">NOT SURE</span>{card.image.fit === 'contain' && <span className="zoom-hint">Tap to zoom</span>}{burst && <span className="heart-burst">♥ ♥ ♥<small>LOVE LOVE</small></span>}</>}
  </div>;
}
