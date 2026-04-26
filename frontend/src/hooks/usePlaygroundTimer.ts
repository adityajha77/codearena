import { useState, useEffect } from 'react';
import { differenceInSeconds, addMinutes, isAfter, isBefore } from 'date-fns';

type PlaygroundStatus = 'scheduled' | 'active' | 'review' | 'finished';

export function usePlaygroundTimer(
  status: PlaygroundStatus,
  startTimeStr: string,
  durationMinutes: number
) {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [currentPhase, setCurrentPhase] = useState<PlaygroundStatus>(status);

  useEffect(() => {
    if (!startTimeStr) return;

    const interval = setInterval(() => {
      const now = new Date();
      const startTime = new Date(startTimeStr);
      const codingEndTime = addMinutes(startTime, durationMinutes);
      // Review phase is 20 minutes after coding ends
      const reviewEndTime = addMinutes(codingEndTime, 20);

      if (isBefore(now, startTime)) {
        // Scheduled
        setCurrentPhase('scheduled');
        setTimeRemaining(differenceInSeconds(startTime, now));
      } else if (isAfter(now, startTime) && isBefore(now, codingEndTime)) {
        // Active Coding
        setCurrentPhase('active');
        setTimeRemaining(differenceInSeconds(codingEndTime, now));
      } else if (isAfter(now, codingEndTime) && isBefore(now, reviewEndTime)) {
        // Review Phase
        setCurrentPhase('review');
        setTimeRemaining(differenceInSeconds(reviewEndTime, now));
      } else {
        // Finished
        setCurrentPhase('finished');
        setTimeRemaining(0);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTimeStr, durationMinutes]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    timeRemaining,
    formattedTime: formatTime(timeRemaining),
    currentPhase,
    isNearEnd: timeRemaining <= 10 && timeRemaining > 0
  };
}
