import { toDateString } from "../api/platforms";

export type PenaltyStatus = "Protected" | "Strike 1" | "Eliminated";

export interface PenaltyResult {
    missedDays: number;
    status: PenaltyStatus;
    todayVal: number;
}

export function calculatePenalty(
    startDate: Date,
    daysElapsed: number,
    history: Record<string, number>,
    hasHandle: boolean
): PenaltyResult {
    let missedDays = 0;
    let todayVal = 0;

    if (hasHandle) {
        for (let i = 0; i <= daysElapsed; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dStr = toDateString(d);
            const count = history[dStr] || 0;
            
            if (i === daysElapsed) {
                todayVal = count; // Activity for today
            } else if (count === 0) {
                missedDays++;
            }
        }
    } else {
        // No handle means they didn't even setup -> auto miss everything up to today
        missedDays = daysElapsed;
        todayVal = 0;
    }

    let status: PenaltyStatus = "Protected";
    if (missedDays >= 2) {
        status = "Eliminated";
    } else if (missedDays === 1) {
        status = "Strike 1";
    }

    return {
        missedDays,
        status,
        todayVal
    };
}
