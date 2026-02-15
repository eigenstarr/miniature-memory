'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { updateUnitMastery } from '@/lib/analytics/mastery';

// ============================================
// QUESTION ATTEMPT ACTIONS
// ============================================

/**
 * Log a practice question attempt
 * If incorrect, log to error_log_items
 * Check if remediation task should be created (3+ errors in unit within 7 days)
 */
export async function logQuestionAttempt(data: {
  courseUnitId: string;
  taskId?: string;
  questionText?: string;
  questionType: 'mcq' | 'frq' | 'practice';
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpentSeconds?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Insert question attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('question_attempts')
      .insert({
        user_id: user.id,
        course_unit_id: data.courseUnitId,
        task_id: data.taskId || null,
        question_text: data.questionText || null,
        question_type: data.questionType,
        user_answer: data.userAnswer,
        correct_answer: data.correctAnswer,
        is_correct: data.isCorrect,
        time_spent_seconds: data.timeSpentSeconds || null,
        attempted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error logging question attempt:', attemptError);
      return { error: attemptError.message };
    }

    // If incorrect, log to error_log
    if (!data.isCorrect) {
      const { error: errorLogError } = await supabase.from('error_log_items').insert({
        user_id: user.id,
        course_unit_id: data.courseUnitId,
        question_attempt_id: attempt.id,
        notes: `Incorrect answer on ${data.questionType.toUpperCase()}`,
        created_at: new Date().toISOString(),
      });

      if (errorLogError) {
        console.error('Error logging to error_log:', errorLogError);
      }

      // Check if remediation task should be created
      await checkAndCreateRemediationTask(user.id, data.courseUnitId);
    }

    // Update unit mastery after question attempt
    await updateUnitMastery(user.id, data.courseUnitId);

    revalidatePath('/courses');
    revalidatePath('/dashboard');

    return {
      success: true,
      attemptId: attempt.id,
      message: data.isCorrect ? 'Correct! Great work!' : 'Incorrect. Keep practicing!',
    };
  } catch (error: any) {
    console.error('Error in logQuestionAttempt:', error);
    return { error: error.message };
  }
}

/**
 * Check if a unit has 3+ errors in the last 7 days
 * If yes, create a remediation task (if not already exists)
 */
async function checkAndCreateRemediationTask(userId: string, courseUnitId: string) {
  const supabase = await createClient();

  try {
    // Get unit info
    const { data: unit } = await supabase
      .from('course_units')
      .select('course_id, unit_name')
      .eq('id', courseUnitId)
      .single();

    if (!unit) {
      return;
    }

    // Count errors in last 7 days for this unit
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentErrors, error: errorCountError } = await supabase
      .from('error_log_items')
      .select('id')
      .eq('user_id', userId)
      .eq('course_unit_id', courseUnitId)
      .is('remediated_at', null) // Only count unremediated errors
      .gte('created_at', sevenDaysAgo.toISOString());

    if (errorCountError) {
      console.error('Error counting errors:', errorCountError);
      return;
    }

    // If 3+ errors, create remediation task (if doesn't exist already)
    if (recentErrors && recentErrors.length >= 3) {
      // Check if remediation task already exists for this unit
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('user_id', userId)
        .eq('course_unit_id', courseUnitId)
        .eq('task_type', 'exam_build')
        .ilike('title', `%Review%${unit.unit_name}%`)
        .in('status', ['todo', 'in_progress'])
        .single();

      if (existingTask) {
        // Task already exists, don't create duplicate
        return;
      }

      // Create remediation task
      const { error: taskError } = await supabase.from('tasks').insert({
        user_id: userId,
        course_id: unit.course_id,
        course_unit_id: courseUnitId,
        title: `Review: ${unit.unit_name}`,
        description: `Remediation task (${recentErrors.length} errors detected). Focus on weak areas.`,
        task_type: 'exam_build',
        status: 'todo',
        estimated_minutes: 45,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (taskError) {
        console.error('Error creating remediation task:', taskError);
      } else {
        console.log(`✅ Created remediation task for unit: ${unit.unit_name}`);
      }

      revalidatePath('/quest-board');
    }
  } catch (error) {
    console.error('Error in checkAndCreateRemediationTask:', error);
  }
}

/**
 * Mark errors as remediated after completing a review task
 */
export async function markErrorsRemediated(courseUnitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const { error } = await supabase
      .from('error_log_items')
      .update({
        remediated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('course_unit_id', courseUnitId)
      .is('remediated_at', null);

    if (error) {
      console.error('Error marking errors as remediated:', error);
      return { error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in markErrorsRemediated:', error);
    return { error: error.message };
  }
}

/**
 * Get error statistics for a course unit
 */
export async function getUnitErrorStats(courseUnitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get total errors
    const { data: allErrors, error: allError } = await supabase
      .from('error_log_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_unit_id', courseUnitId);

    // Get unremediated errors
    const { data: unremediatedErrors, error: unremediatedError } = await supabase
      .from('error_log_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_unit_id', courseUnitId)
      .is('remediated_at', null);

    // Get recent errors (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentErrors, error: recentError } = await supabase
      .from('error_log_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_unit_id', courseUnitId)
      .is('remediated_at', null)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (allError || unremediatedError || recentError) {
      return { error: 'Failed to fetch error stats' };
    }

    return {
      success: true,
      stats: {
        totalErrors: allErrors?.length || 0,
        unremediatedErrors: unremediatedErrors?.length || 0,
        recentErrors: recentErrors?.length || 0,
        needsRemediation: (recentErrors?.length || 0) >= 3,
      },
    };
  } catch (error: any) {
    console.error('Error in getUnitErrorStats:', error);
    return { error: error.message };
  }
}
