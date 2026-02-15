import { createClient } from '@/lib/supabase/server';

/**
 * Calculate unit mastery score (0-100)
 * Formula (simplified for MVP):
 * - 40%: Task completion rate for this unit
 * - 60%: Question accuracy for this unit
 *
 * If no data exists, returns 0
 */
export async function calculateUnitMastery(
  userId: string,
  courseUnitId: string
): Promise<number> {
  const supabase = await createClient();

  // Get task completion rate for this unit
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status')
    .eq('user_id', userId)
    .eq('course_unit_id', courseUnitId);

  const taskCompletionRate =
    tasks && tasks.length > 0
      ? (tasks.filter((t) => t.status === 'completed').length / tasks.length) * 100
      : 0;

  // Get question accuracy for this unit
  const { data: attempts } = await supabase
    .from('question_attempts')
    .select('id, correct')
    .eq('user_id', userId)
    .eq('course_unit_id', courseUnitId);

  const questionAccuracy =
    attempts && attempts.length > 0
      ? (attempts.filter((a) => a.correct).length / attempts.length) * 100
      : 0;

  // Weighted combination (40% tasks, 60% questions)
  // If no data for either, that component contributes 0
  let mastery = 0;

  if (tasks && tasks.length > 0) {
    mastery += taskCompletionRate * 0.4;
  }

  if (attempts && attempts.length > 0) {
    mastery += questionAccuracy * 0.6;
  }

  // If neither tasks nor questions exist, default to 0
  if ((!tasks || tasks.length === 0) && (!attempts || attempts.length === 0)) {
    return 0;
  }

  // If only one metric exists, scale it proportionally
  if (tasks && tasks.length > 0 && (!attempts || attempts.length === 0)) {
    mastery = taskCompletionRate;
  } else if ((!tasks || tasks.length === 0) && attempts && attempts.length > 0) {
    mastery = questionAccuracy;
  }

  return Math.round(Math.min(100, Math.max(0, mastery)));
}

/**
 * Update mastery score for a unit in the database
 */
export async function updateUnitMastery(
  userId: string,
  courseUnitId: string
): Promise<void> {
  const supabase = await createClient();
  const mastery = await calculateUnitMastery(userId, courseUnitId);

  await supabase
    .from('course_units')
    .update({
      mastery_score: mastery,
      last_studied_at: new Date().toISOString(),
    })
    .eq('id', courseUnitId);
}

/**
 * Calculate overall course mastery (average of all units)
 */
export async function calculateCourseMastery(
  userId: string,
  courseId: string
): Promise<number> {
  const supabase = await createClient();

  const { data: units } = await supabase
    .from('course_units')
    .select('mastery_score')
    .eq('course_id', courseId);

  if (!units || units.length === 0) {
    return 0;
  }

  const avgMastery =
    units.reduce((sum, u) => sum + (u.mastery_score || 0), 0) / units.length;

  return Math.round(avgMastery);
}
