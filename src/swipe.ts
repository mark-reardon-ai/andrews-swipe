import type { SwipeAnswer } from './types';
/** Vertical drags always return to the card. */
export function classifySwipe(dx: number, dy: number, vx: number, vy: number, width: number, height: number): SwipeAnswer['swipe'] | null {
  if (![dx, dy, vx, vy, width, height].every(Number.isFinite) || width <= 0 || height <= 0)
    return null;
  if (Math.abs(dx) >= Math.abs(dy) && (dx > width * 0.3 || vx > 0.5))
    return 'yes';
  if (Math.abs(dx) >= Math.abs(dy) && (dx < -width * 0.3 || vx < -0.5))
    return 'no';
  return null;
}
