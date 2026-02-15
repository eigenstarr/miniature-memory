'use client';

import { useState } from 'react';
import { logQuestionAttempt } from '@/actions/questions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';

interface Course {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  course_id: string;
  unit_number: number;
  unit_name: string;
}

interface LogQuestionFormProps {
  courses: Course[];
  units: Unit[];
}

export function LogQuestionForm({ courses, units }: LogQuestionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string>('');

  // Filter units by selected course
  const filteredUnits = selectedCourse
    ? units.filter((u) => u.course_id === selectedCourse)
    : [];

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);

    try {
      const courseUnitId = formData.get('courseUnitId') as string;
      const questionType = formData.get('questionType') as 'mcq' | 'frq' | 'practice';
      const userAnswer = formData.get('userAnswer') as string;
      const correctAnswer = formData.get('correctAnswer') as string;
      const timeSpent = formData.get('timeSpent') as string;

      if (!courseUnitId || !userAnswer || !correctAnswer) {
        setMessage({
          type: 'error',
          text: 'Please fill in all required fields',
        });
        setLoading(false);
        return;
      }

      const isCorrect =
        userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();

      const result = await logQuestionAttempt({
        courseUnitId,
        questionType,
        userAnswer,
        correctAnswer,
        isCorrect,
        timeSpentSeconds: timeSpent ? parseInt(timeSpent) : undefined,
      });

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.message || 'Question logged!' });
        // Reset form
        (document.getElementById('question-form') as HTMLFormElement)?.reset();
        setSelectedCourse('');
        // Refresh page to show updated stats
        router.refresh();
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form id="question-form" action={handleSubmit} className="space-y-4">
      {message && (
        <div
          className={`p-3 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="course">Course</Label>
          <Select
            name="course"
            value={selectedCourse}
            onValueChange={setSelectedCourse}
            disabled={loading}
          >
            <SelectTrigger id="course">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="courseUnitId">Unit</Label>
          <Select name="courseUnitId" disabled={loading || !selectedCourse}>
            <SelectTrigger id="courseUnitId">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {filteredUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>
                  Unit {unit.unit_number}: {unit.unit_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="questionType">Question Type</Label>
          <Select name="questionType" defaultValue="mcq" disabled={loading}>
            <SelectTrigger id="questionType">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
              <SelectItem value="frq">Free Response (FRQ)</SelectItem>
              <SelectItem value="practice">Practice Problem</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeSpent">Time Spent (seconds)</Label>
          <Input
            id="timeSpent"
            name="timeSpent"
            type="number"
            placeholder="60"
            min="1"
            disabled={loading}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="userAnswer">Your Answer</Label>
          <Input
            id="userAnswer"
            name="userAnswer"
            placeholder="A, B, C, D or text answer"
            required
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="correctAnswer">Correct Answer</Label>
          <Input
            id="correctAnswer"
            name="correctAnswer"
            placeholder="A, B, C, D or text answer"
            required
            disabled={loading}
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Logging...' : 'Log Question'}
      </Button>

      <p className="text-xs text-muted-foreground">
        <strong>Tip:</strong> If you answer 3+ questions incorrectly in the same unit
        within 7 days, a remediation task will be automatically created.
      </p>
    </form>
  );
}
