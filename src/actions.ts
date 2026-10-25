import { copy } from './copy';
import type { Card, SwipeAnswer } from './types';
export const isAB = (card: Card) => card.kind === 'compare' && !!card.x_ab && !!card.image.file_b;
export function actionsFor(card: Card) {
  return {
    left: { label: isAB(card) ? card.x_ab!.left : copy.no, swipe: 'no' as const, ...(isAB(card) ? { x_pick: 'a' as const } : {}) },
    right: { label: isAB(card) ? card.x_ab!.right : copy.yes, swipe: 'yes' as const, ...(isAB(card) ? { x_pick: 'b' as const } : {}) },
  };
}
export const actionFor = (card: Card, swipe: SwipeAnswer['swipe']) => actionsFor(card)[swipe === 'no' ? 'left' : 'right'];
export const buttonLabel = (card: Card, side: 'left' | 'right') => isAB(card) ? (side === 'left' ? copy.leftLabel : copy.rightLabel)(actionsFor(card)[side].label) : actionsFor(card)[side].label;
/** Whitelist app-owned answer fields, including when handling old runtime data. */
export function cleanAnswers(answers: SwipeAnswer[]): SwipeAnswer[] {
  return answers.filter(a => a.swipe === 'yes' || a.swipe === 'no').map(a => ({
    card_id: a.card_id, swipe: a.swipe, at: a.at,
    ...(a.x_pick === 'a' || a.x_pick === 'b' ? { x_pick: a.x_pick } : {}),
    ...(a.dwell_ms !== undefined ? { dwell_ms: a.dwell_ms } : {}),
    ...(a.revisited !== undefined ? { revisited: a.revisited } : {}),
  }));
}
