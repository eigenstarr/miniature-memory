import { createClient } from '@/lib/supabase/server';
import { LogQuestionForm } from '@/components/practice/log-question-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Brain, AlertTriangle } from 'lucide-react';

export default async function PracticePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch user's courses with units
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, color')
    .eq('user_id', user.id);

  // Fetch all units for dropdown
  const { data: units } = await supabase
    .from('course_units')
    .select('id, course_id, unit_number, unit_name')
    .in(
      'course_id',
      (courses || []).map((c) => c.id)
    )
    .order('unit_number', { ascending: true });

  // Get recent question attempts (last 10)
  const { data: recentAttempts } = await supabase
    .from('question_attempts')
    .select('id, question_type, is_correct, attempted_at, course_unit_id')
    .eq('user_id', user.id)
    .order('attempted_at', { ascending: false })
    .limit(10);

  // Enrich attempts with unit info
  const attemptsWithUnits = (recentAttempts || []).map((attempt) => {
    const unit = units?.find((u) => u.id === attempt.course_unit_id);
    return { ...attempt, unit };
  });

  // Calculate stats
  const totalAttempts = recentAttempts?.length || 0;
  const correctAttempts =
    recentAttempts?.filter((a) => a.is_correct).length || 0;
  const accuracy =
    totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0;

  // Get units with high error rates (3+ recent errors)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: errorLogItems } = await supabase
    .from('error_log_items')
    .select('course_unit_id')
    .eq('user_id', user.id)
    .is('remediated_at', null)
    .gte('created_at', sevenDaysAgo.toISOString());

  // Count errors per unit
  const errorsByUnit = new Map<string, number>();
  (errorLogItems || []).forEach((item) => {
    const count = errorsByUnit.get(item.course_unit_id) || 0;
    errorsByUnit.set(item.course_unit_id, count + 1);
  });

  // Find units that need remediation (3+ errors)
  const unitsNeedingRemediation = Array.from(errorsByUnit.entries())
    .filter(([_, count]) => count >= 3)
    .map(([unitId, count]) => {
      const unit = units?.find((u) => u.id === unitId);
      return { unit, errorCount: count };
    })
    .filter((item) => item.unit !== undefined);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Brain className="h-8 w-8" />
          Practice Questions
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your practice performance and identify weak areas
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalAttempts}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 10 questions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Accuracy</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{accuracy}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {correctAttempts} / {totalAttempts} correct
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Units Need Review</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
              {unitsNeedingRemediation.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">3+ errors in 7 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Weak Areas Alert */}
      {unitsNeedingRemediation.length > 0 && (
        <Card className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-700 dark:text-yellow-200 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">
                  Units Needing Attention
                </p>
                <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                  The following units have 3+ errors in the last 7 days. Remediation tasks
                  have been automatically created.
                </p>
                <div className="mt-2 space-y-1">
                  {unitsNeedingRemediation.map((item) => (
                    <div
                      key={item.unit?.id}
                      className="text-xs text-yellow-800 dark:text-yellow-200"
                    >
                      • {item.unit?.unit_name} ({item.errorCount} errors)
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log Question Form */}
      <Card>
        <CardHeader>
          <CardTitle>Log Practice Question</CardTitle>
          <CardDescription>
            Record your practice question attempts to track progress and identify weak
            areas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LogQuestionForm courses={courses || []} units={units || []} />
        </CardContent>
      </Card>

      {/* Recent Attempts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attempts</CardTitle>
          <CardDescription>Your last 10 practice questions</CardDescription>
        </CardHeader>
        <CardContent>
          {attemptsWithUnits.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No practice attempts yet. Log your first question above!
            </p>
          ) : (
            <div className="space-y-3">
              {attemptsWithUnits.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        attempt.is_correct
                          ? 'bg-green-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-sm">
                        {attempt.unit?.unit_name || 'Unknown Unit'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.question_type.toUpperCase()} •{' '}
                        {attempt.is_correct ? 'Correct' : 'Incorrect'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(attempt.attempted_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(attempt.attempted_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
