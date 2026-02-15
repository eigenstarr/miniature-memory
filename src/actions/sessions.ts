'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Log a focus session and award XP to the user
 * XP Formula: 10 XP per minute * task type multiplier
 * - assignment_work: 1.0x
 * - exam_build: 1.2x
 * - timed_practice: 1.5x
 */
export async function logFocusSession(
  taskId: string | null,
  durationMinutes: number,
  completedTask: boolean = false
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    // Get task details if taskId provided
    let taskType = null;
    let courseUnitId = null;

    if (taskId) {
      const { data: task } = await supabase
        .from('tasks')
        .select('task_type, course_unit_id')
        .eq('id', taskId)
        .eq('user_id', user.id)
        .single();

      if (task) {
        taskType = task.task_type;
        courseUnitId = task.course_unit_id;
      }
    }

    // Calculate XP based on task type
    const baseXP = durationMinutes * 10;
    let multiplier = 1.0;

    if (taskType === 'exam_build') multiplier = 1.2;
    else if (taskType === 'timed_practice') multiplier = 1.5;

    const xpEarned = Math.round(baseXP * multiplier);

    // Insert focus session
    const { error: sessionError } = await supabase.from('focus_sessions').insert({
      user_id: user.id,
      task_id: taskId,
      course_unit_id: courseUnitId,
      duration_minutes: durationMinutes,
      xp_earned: xpEarned,
      started_at: new Date(Date.now() - durationMinutes * 60 * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    if (sessionError) {
      console.error('Error logging focus session:', sessionError);
      return { error: 'Failed to log session' };
    }

    // Update user XP and level
    const { data: currentUser } = await supabase
      .from('users')
      .select('total_xp, current_level')
      .eq('id', user.id)
      .single();

    if (currentUser) {
      const newTotalXP = (currentUser.total_xp || 0) + xpEarned;
      const newLevel = Math.floor(newTotalXP / 1000) + 1; // Level up every 1000 XP

      await supabase
        .from('users')
        .update({
          total_xp: newTotalXP,
          current_level: newLevel,
        })
        .eq('id', user.id);
    }

    // Update task status if completed
    if (taskId && completedTask) {
      await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .eq('user_id', user.id);
    }

    // Update streak (if studied today)
    await updateStreak(user.id);

    revalidatePath('/quest-board');
    revalidatePath('/focus');
    revalidatePath('/dashboard');

    return {
      success: true,
      xpEarned,
      message: `Session complete! +${xpEarned} XP earned`
    };
  } catch (error: any) {
    console.error('Error in logFocusSession:', error);
    return { error: error.message };
  }
}

/**
 * Update user's study streak
 * Increments if they studied today, resets if gap > 1 day
 */
async function updateStreak(userId: string) {
  const supabase = await createClient();

  // Get user's last session
  const { data: lastSession } = await supabase
    .from('focus_sessions')
    .select('ended_at')
    .eq('user_id', userId)
    .order('ended_at', { ascending: false })
    .limit(2);

  if (!lastSession || lastSession.length < 2) {
    // First session ever or only one session - start streak at 1
    await supabase
      .from('users')
      .update({
        current_streak: 1,
        longest_streak: 1,
      })
      .eq('id', userId);
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastSessionDate = new Date(lastSession[1].ended_at);
  lastSessionDate.setHours(0, 0, 0, 0);

  const daysDiff = Math.floor((today.getTime() - lastSessionDate.getTime()) / (1000 * 60 * 60 * 24));

  const { data: currentUser } = await supabase
    .from('users')
    .select('current_streak, longest_streak')
    .eq('id', userId)
    .single();

  if (currentUser) {
    let newStreak = currentUser.current_streak || 0;

    if (daysDiff === 1) {
      // Studied yesterday, increment streak
      newStreak += 1;
    } else if (daysDiff > 1) {
      // Missed a day, reset streak
      newStreak = 1;
    }
    // If daysDiff === 0 (studied earlier today), keep current streak

    const newLongestStreak = Math.max(newStreak, currentUser.longest_streak || 0);

    await supabase
      .from('users')
      .update({
        current_streak: newStreak,
        longest_streak: newLongestStreak,
      })
      .eq('id', userId);
  }
}

/**
 * Get user's focus sessions for analytics
 */
export async function getUserSessions(limit: number = 10) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { data: sessions, error } = await supabase
    .from('focus_sessions')
    .select('id, duration_minutes, xp_earned, started_at, ended_at, task_id')
    .eq('user_id', user.id)
    .order('ended_at', { ascending: false })
    .limit(limit);

  if (error) {
    return { error: error.message };
  }

  return { sessions };
}
