import { describe, expect, it } from 'vitest';
import { classifySwipe } from '../swipe';
describe('classifySwipe', () => {
    it.each([
        [113, 0, 0, 0, 'yes'],
        [-113, 0, 0, 0, 'no'],
        [0, -89, 0, 0, 'skip'],
        [20, 0, 0.51, 0, 'yes'],
        [-20, 0, -0.51, 0, 'no'],
        [112.5, 0, 0.5, 0, null],
        [0, -88, 0, -1, null],
        [0, 150, 0, 1, null],
        [10, -100, 0.6, -1, 'skip'],
        [160, -90, 0, 0, 'yes'],
        [0, 0, 0, 0, null],
    ] as const)('classifies (%s, %s) with velocity (%s, %s)', (dx, dy, vx, vy, expected) => {
        expect(classifySwipe(dx, dy, vx, vy, 375, 400)).toBe(expected);
    });
    it('uses the actual card size', () => {
        expect(classifySwipe(120, 0, 0, 0, 430, 600)).toBeNull();
        expect(classifySwipe(130, 0, 0, 0, 430, 600)).toBe('yes');
    });
    it('rejects invalid measurements', () => {
        expect(classifySwipe(120, 0, 0, 0, 0, 400)).toBeNull();
        expect(classifySwipe(NaN, 0, 0, 0, 375, 400)).toBeNull();
    });
});
