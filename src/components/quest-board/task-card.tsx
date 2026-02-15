'use client';

import { useState } from 'react';
import { completeTask, uncompleteTask, deleteTask } from '@/actions/tasks';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, Calendar, Trash2 } from 'lucide-react';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    taskType: string;
    dueDate: Date | null;
    estimatedMinutes: number | null;
    status: string;
    course?: {
      name: string;
      color: string;
    } | null;
  };
}

const TASK_TYPE_LABELS: Record<string, string> = {
  assignment_work: 'Assignment',
  exam_build: 'Exam Build',
  timed_practice: 'Timed Practice',
};

const TASK_TYPE_COLORS: Record<string, string> = {
  assignment_work: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  exam_build: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  timed_practice: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
};

export function TaskCard({ task }: TaskCardProps) {
  const [loading, setLoading] = useState(false);
  const isCompleted = task.status === 'completed';

  async function handleToggleComplete() {
    setLoading(true);
    if (isCompleted) {
      await uncompleteTask(task.id);
    } else {
      await completeTask(task.id);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (confirm('Are you sure you want to delete this quest?')) {
      setLoading(true);
      await deleteTask(task.id);
      setLoading(false);
    }
  }

  const daysUntilDue = task.dueDate
    ? Math.ceil(
        (new Date(task.dueDate).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3;

  return (
    <Card className={isCompleted ? 'opacity-60' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={handleToggleComplete}
              disabled={loading}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <CardTitle
                className={`text-base ${
                  isCompleted ? 'line-through text-muted-foreground' : ''
                }`}
              >
                {task.title}
              </CardTitle>
              {task.description && (
                <CardDescription className="mt-1">
                  {task.description}
                </CardDescription>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <span
            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
              TASK_TYPE_COLORS[task.taskType] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {TASK_TYPE_LABELS[task.taskType] || task.taskType}
          </span>

          {task.course && (
            <span
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
              style={{
                backgroundColor: `${task.course.color}20`,
                color: task.course.color,
              }}
            >
              {task.course.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {task.dueDate && (
            <div
              className={`flex items-center gap-1 ${
                isOverdue
                  ? 'text-red-600 dark:text-red-400 font-medium'
                  : isDueSoon
                  ? 'text-orange-600 dark:text-orange-400 font-medium'
                  : ''
              }`}
            >
              <Calendar className="h-3 w-3" />
              <span>
                {isOverdue
                  ? `${Math.abs(daysUntilDue!)} days overdue`
                  : daysUntilDue === 0
                  ? 'Due today'
                  : daysUntilDue === 1
                  ? 'Due tomorrow'
                  : `Due in ${daysUntilDue} days`}
              </span>
            </div>
          )}

          {task.estimatedMinutes && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{task.estimatedMinutes} min</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
