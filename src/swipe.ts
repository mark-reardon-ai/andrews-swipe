import type { SwipeAnswer } from './types';
/** Upward intent wins only when vertical movement dominates. */
export function classifySwipe(dx: number, dy: number, vx: number, vy: number, width: number, height: number): SwipeAnswer['swipe'] | null {
    if (![dx, dy, vx, vy, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
        return null;
    if (dy < -height * 0.22 && Math.abs(dy) > Math.abs(dx))
        return 'skip';
    if (Math.abs(dx) >= Math.abs(dy) && (dx > width * 0.3 || vx > 0.5))
        return 'yes';
    if (Math.abs(dx) >= Math.abs(dy) && (dx < -width * 0.3 || vx < -0.5))
        return 'no';
    return null;
}
