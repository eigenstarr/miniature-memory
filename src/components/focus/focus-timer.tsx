'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Check } from 'lucide-react';
import { logFocusSession } from '@/actions/sessions';
import { useRouter } from 'next/navigation';

interface FocusTimerProps {
  taskId?: string | null;
  taskTitle?: string;
  onComplete?: () => void;
}

export function FocusTimer({ taskId, taskTitle, onComplete }: FocusTimerProps) {
  const router = useRouter();

  // Timer states
  const [selectedDuration, setSelectedDuration] = useState(25); // 25 or 50 minutes
  const [timeRemaining, setTimeRemaining] = useState(25 * 60); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completingSession, setCompletingSession] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const totalPausedTimeRef = useRef<number>(0);
  const pauseStartTimeRef = useRef<number | null>(null);

  // Update time remaining when duration changes
  useEffect(() => {
    if (!isRunning) {
      setTimeRemaining(selectedDuration * 60);
    }
  }, [selectedDuration, isRunning]);

  // Timer countdown logic
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const handleStart = () => {
    if (!isRunning) {
      // Starting fresh
      startTimeRef.current = Date.now();
      totalPausedTimeRef.current = 0;
      setIsRunning(true);
      setIsPaused(false);
    } else if (isPaused) {
      // Resuming from pause
      if (pauseStartTimeRef.current) {
        totalPausedTimeRef.current += Date.now() - pauseStartTimeRef.current;
        pauseStartTimeRef.current = null;
      }
      setIsPaused(false);
    }
  };

  const handlePause = () => {
    if (isRunning && !isPaused) {
      pauseStartTimeRef.current = Date.now();
      setIsPaused(true);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeRemaining(selectedDuration * 60);
    startTimeRef.current = null;
    totalPausedTimeRef.current = 0;
    pauseStartTimeRef.current = null;
    setShowComplete(false);
  };

  const handleTimerComplete = () => {
    setIsRunning(false);
    setShowComplete(true);
  };

  const handleCompleteSession = async (markTaskComplete: boolean = false) => {
    setCompletingSession(true);

    const actualDuration = selectedDuration; // Use selected duration since timer completed

    const result = await logFocusSession(taskId || null, actualDuration, markTaskComplete);

    if (result.success) {
      // Show success message or redirect
      router.refresh();
      handleReset();
      if (onComplete) onComplete();
    } else {
      console.error('Failed to log session:', result.error);
    }

    setCompletingSession(false);
  };

  const handleEndEarly = async () => {
    if (!startTimeRef.current) return;

    setCompletingSession(true);

    // Calculate actual time spent (in minutes)
    const now = Date.now();
    const totalElapsed = now - startTimeRef.current - totalPausedTimeRef.current;
    const minutesSpent = Math.floor(totalElapsed / 60000);

    if (minutesSpent > 0) {
      const result = await logFocusSession(taskId || null, minutesSpent, false);

      if (result.success) {
        router.refresh();
        handleReset();
        if (onComplete) onComplete();
      }
    } else {
      handleReset();
    }

    setCompletingSession(false);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((selectedDuration * 60 - timeRemaining) / (selectedDuration * 60)) * 100;

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* Duration selector (only show when not running) */}
      {!isRunning && !showComplete && (
        <div className="flex gap-4">
          <Button
            variant={selectedDuration === 25 ? 'default' : 'outline'}
            onClick={() => setSelectedDuration(25)}
            className="w-32"
          >
            25 minutes
          </Button>
          <Button
            variant={selectedDuration === 50 ? 'default' : 'outline'}
            onClick={() => setSelectedDuration(50)}
            className="w-32"
          >
            50 minutes
          </Button>
        </div>
      )}

      {/* Task info */}
      {taskTitle && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Focusing on:</p>
          <p className="text-lg font-semibold">{taskTitle}</p>
        </div>
      )}

      {/* Timer display */}
      {!showComplete ? (
        <>
          <div className="relative w-64 h-64">
            {/* Progress circle background */}
            <svg className="transform -rotate-90 w-64 h-64">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 120}`}
                strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                className="text-primary transition-all duration-1000"
                strokeLinecap="round"
              />
            </svg>

            {/* Time text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold font-mono">
                  {formatTime(timeRemaining)}
                </div>
                {isPaused && (
                  <div className="text-sm text-muted-foreground mt-2">Paused</div>
                )}
              </div>
            </div>
          </div>

          {/* Timer controls */}
          <div className="flex gap-4">
            {!isRunning || isPaused ? (
              <Button onClick={handleStart} size="lg" className="w-32">
                <Play className="mr-2 h-5 w-5" />
                {isRunning ? 'Resume' : 'Start'}
              </Button>
            ) : (
              <Button onClick={handlePause} variant="outline" size="lg" className="w-32">
                <Pause className="mr-2 h-5 w-5" />
                Pause
              </Button>
            )}

            <Button onClick={handleReset} variant="outline" size="lg" className="w-32">
              <RotateCcw className="mr-2 h-5 w-5" />
              Reset
            </Button>
          </div>

          {/* End early button (only show when running) */}
          {isRunning && (
            <Button
              onClick={handleEndEarly}
              variant="ghost"
              size="sm"
              disabled={completingSession}
            >
              End session early
            </Button>
          )}
        </>
      ) : (
        /* Completion screen */
        <div className="text-center space-y-6">
          <div className="w-24 h-24 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>

          <div>
            <h2 className="text-2xl font-bold">Session Complete!</h2>
            <p className="text-muted-foreground mt-2">
              You focused for {selectedDuration} minutes
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {taskId && (
              <Button
                onClick={() => handleCompleteSession(true)}
                size="lg"
                disabled={completingSession}
              >
                {completingSession ? 'Logging...' : 'Mark Task Complete & Log Session'}
              </Button>
            )}
            <Button
              onClick={() => handleCompleteSession(false)}
              variant={taskId ? 'outline' : 'default'}
              size="lg"
              disabled={completingSession}
            >
              {completingSession ? 'Logging...' : 'Log Session'}
            </Button>
            <Button onClick={handleReset} variant="ghost">
              Start Another Session
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
