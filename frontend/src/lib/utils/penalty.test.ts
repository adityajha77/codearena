import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { calculatePenalty } from './penalty';

describe('calculatePenalty', () => {
    const startDate = new Date('2023-01-01T00:00:00Z');

    it('should return Protected when no days are missed', () => {
        const history = {
            '2023-01-01': 1,
            '2023-01-02': 2,
        };
        const result = calculatePenalty(startDate, 1, history, true);
        expect(result.status).toBe('Protected');
        expect(result.missedDays).toBe(0);
        expect(result.todayVal).toBe(2);
    });

    it('should return Strike 1 when 1 day is missed', () => {
        const history = {
            '2023-01-01': 1,
            '2023-01-02': 0, // missed this day
            '2023-01-03': 3, // today
        };
        const result = calculatePenalty(startDate, 2, history, true);
        expect(result.status).toBe('Strike 1');
        expect(result.missedDays).toBe(1);
        expect(result.todayVal).toBe(3);
    });

    it('should return Eliminated when 2 days are missed', () => {
        const history = {
            '2023-01-01': 0, // missed
            '2023-01-02': 0, // missed
            '2023-01-03': 1, // today
        };
        const result = calculatePenalty(startDate, 2, history, true);
        expect(result.status).toBe('Eliminated');
        expect(result.missedDays).toBe(2);
        expect(result.todayVal).toBe(1);
    });

    it('should auto miss all previous days when handle is not linked', () => {
        const result = calculatePenalty(startDate, 2, {}, false);
        expect(result.status).toBe('Eliminated');
        expect(result.missedDays).toBe(2);
        expect(result.todayVal).toBe(0);
    });

    it('should be in Strike 1 if handle not linked after 1 day elapsed', () => {
        const result = calculatePenalty(startDate, 1, {}, false);
        expect(result.status).toBe('Strike 1');
        expect(result.missedDays).toBe(1);
        expect(result.todayVal).toBe(0);
    });

    it('should handle zero elapsed days properly', () => {
        const history = {
            '2023-01-01': 0, // no commits today
        };
        const result = calculatePenalty(startDate, 0, history, true);
        // Only today has passed (daysElapsed = 0).
        // Since it's today, we don't count it as a missed day yet, but todayVal is 0.
        expect(result.status).toBe('Protected');
        expect(result.missedDays).toBe(0);
        expect(result.todayVal).toBe(0);
    });
});
