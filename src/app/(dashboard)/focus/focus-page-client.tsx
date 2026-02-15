'use client';

import { useState } from 'react';
import { FocusTimer } from '@/components/focus/focus-timer';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Timer, Target } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  taskType: string;
  course?: {
    name: string;
    color: string;
  } | null;
}

interface FocusPageClientProps {
  tasks: Task[];
}

export function FocusPageClient({ tasks }: FocusPageClientProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showTimer, setShowTimer] = useState(false);

  const handleStartFocus = () => {
    setShowTimer(true);
  };

  const handleTimerComplete = () => {
    setShowTimer(false);
    setSelectedTask(null);
  };

  if (showTimer) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Focus Mode</CardTitle>
            <CardDescription>
              Eliminate distractions and focus on your work
            </CardDescription>
          </CardHeader>
          <CardContent className="py-8">
            <FocusTimer
              taskId={selectedTask?.id || null}
              taskTitle={selectedTask?.title}
              onComplete={handleTimerComplete}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Timer className="h-8 w-8" />
          Focus Mode
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Start a focused study session and earn XP
        </p>
      </div>

      {/* Main card */}
      <Card>
        <CardHeader>
          <CardTitle>Start a Focus Session</CardTitle>
          <CardDescription>
            Select a task to work on (optional) and set your timer
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Task selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">
              What are you working on? (Optional)
            </label>
            <div className="flex gap-3">
              <Select
                value={selectedTask?.id || 'none'}
                onValueChange={(value) => {
                  if (value === 'none') {
                    setSelectedTask(null);
                  } else {
                    const task = tasks.find((t) => t.id === value);
                    setSelectedTask(task || null);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a task..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span>General study session (no specific task)</span>
                    </div>
                  </SelectItem>
                  {tasks.map((task) => (
                    <SelectItem key={task.id} value={task.id}>
                      <div className="flex items-center gap-2">
                        {task.course && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: task.course.color }}
                          />
                        )}
                        <span>{task.title}</span>
                        {task.course && (
                          <span className="text-xs text-muted-foreground">
                            ({task.course.name})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTask && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  <strong>Selected:</strong> {selectedTask.title}
                  {selectedTask.course && (
                    <span className="ml-2 text-xs">• {selectedTask.course.name}</span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Info cards */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-purple-200 dark:bg-purple-800 rounded-full p-2">
                  <Timer className="h-5 w-5 text-purple-700 dark:text-purple-200" />
                </div>
                <div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                    Pomodoro Timer
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                    Choose 25 or 50 minute sessions to maintain peak focus
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-200 dark:bg-green-800 rounded-full p-2">
                  <Target className="h-5 w-5 text-green-700 dark:text-green-200" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">
                    Earn XP
                  </h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Get 10 XP per minute + bonus XP for exam prep tasks
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* XP multipliers info */}
          <div className="bg-muted rounded-lg p-4">
            <h4 className="font-semibold text-sm mb-2">XP Multipliers:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Assignment Work: <strong>1.0x</strong> (10 XP/min)</li>
              <li>• Exam Build: <strong>1.2x</strong> (12 XP/min)</li>
              <li>• Timed Practice: <strong>1.5x</strong> (15 XP/min)</li>
            </ul>
          </div>

          {/* Start button */}
          <Button onClick={handleStartFocus} size="lg" className="w-full">
            <Timer className="mr-2 h-5 w-5" />
            Start Focus Session
          </Button>
        </CardContent>
      </Card>

      {/* Tips card */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg">Focus Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Find a quiet space free from distractions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Put your phone on Do Not Disturb mode</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Have all your materials ready before starting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>Take short breaks between sessions to stay fresh</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
