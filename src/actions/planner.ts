'use server';

import { createClient } from '@/lib/supabase/server';
import { scoreTasks } from '@/lib/planner/scoring';
import { scheduleTasks, DailyPlan } from '@/lib/planner/scheduler';
import { revalidatePath } from 'next/cache';

/**
 * Generate a daily plan for the user
 * Fetches incomplete tasks, scores them, and allocates to 3 lanes
 */
export async function generateDailyPlan(
  date?: string
): Promise<{ success: boolean; plan?: DailyPlan; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const targetDate = date ? new Date(date) : new Date();

    // Fetch user profile for target study time
    const { data: userProfile } = await supabase
      .from('users')
      .select('target_study_minutes_per_day')
      .eq('id', user.id)
      .single();

    const targetStudyMinutes = userProfile?.target_study_minutes_per_day || 120; // Default 2 hours

    // Fetch all incomplete tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['todo', 'in_progress'])
      .order('due_date', { ascending: true });

    if (!tasks || tasks.length === 0) {
      return {
        success: true,
        plan: {
          lanes: [
            {
              name: 'due_soon',
              displayName: 'Due Soon',
              tasks: [],
              totalMinutes: 0,
              targetMinutes: targetStudyMinutes * 0.65,
            },
            {
              name: 'exam_build',
              displayName: 'Exam Build',
              tasks: [],
              totalMinutes: 0,
              targetMinutes: targetStudyMinutes * 0.25,
            },
            {
              name: 'timed_practice',
              displayName: 'Timed Practice',
              tasks: [],
              totalMinutes: 0,
              targetMinutes: targetStudyMinutes * 0.1,
            },
          ],
          totalMinutes: 0,
          generatedAt: new Date(),
        },
      };
    }

    // Fetch all course units for mastery/recency context
    const { data: units } = await supabase
      .from('course_units')
      .select('id, course_id, mastery_score, last_studied_at')
      .in(
        'course_id',
        Array.from(
          new Set(
            tasks.map((t) => t.course_id).filter((id): id is string => id !== null)
          )
        )
      );

    // Fetch all courses for exam date context
    const { data: courses } = await supabase
      .from('courses')
      .select('id, exam_date')
      .eq('user_id', user.id);

    // Build context maps
    const unitsMap = new Map(
      (units || []).map((u) => [
        u.id,
        {
          id: u.id,
          course_id: u.course_id,
          mastery_score: u.mastery_score || 0,
          last_studied_at: u.last_studied_at,
        },
      ])
    );

    const coursesMap = new Map(
      (courses || []).map((c) => [c.id, { id: c.id, exam_date: c.exam_date }])
    );

    // Score tasks
    const scoredTasks = scoreTasks(tasks, {
      units: unitsMap,
      courses: coursesMap,
      currentDate: targetDate,
    });

    // Schedule tasks to lanes
    const plan = scheduleTasks(scoredTasks, targetStudyMinutes);

    // Store plan in database for tracking
    const { error: insertError } = await supabase.from('planner_runs').insert({
      user_id: user.id,
      plan_date: targetDate.toISOString().split('T')[0],
      plan_data: {
        lanes: plan.lanes.map((lane) => ({
          name: lane.name,
          taskIds: lane.tasks.map((t) => t.id),
        })),
        totalMinutes: plan.totalMinutes,
      },
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error('Error saving planner run:', insertError);
      // Continue anyway - plan generation succeeded
    }

    revalidatePath('/quest-board');

    return { success: true, plan };
  } catch (error: any) {
    console.error('Error generating daily plan:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get today's plan if it exists
 */
export async function getTodaysPlan(): Promise<{
  success: boolean;
  plan?: DailyPlan;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  const today = new Date().toISOString().split('T')[0];

  const { data: plannerRun } = await supabase
    .from('planner_runs')
    .select('plan_data, created_at')
    .eq('user_id', user.id)
    .eq('plan_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!plannerRun) {
    return { success: false, error: 'No plan for today' };
  }

  // Fetch tasks referenced in the plan
  const taskIds = plannerRun.plan_data.lanes.flatMap(
    (lane: any) => lane.taskIds || []
  );

  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .in('id', taskIds);

  if (!tasks) {
    return { success: false, error: 'Failed to fetch tasks' };
  }

  // Reconstruct plan
  const lanes = plannerRun.plan_data.lanes.map((laneData: any) => {
    const laneTasks = laneData.taskIds
      .map((id: string) => tasks.find((t) => t.id === id))
      .filter(Boolean);

    return {
      name: laneData.name,
      displayName:
        laneData.name === 'due_soon'
          ? 'Due Soon'
          : laneData.name === 'exam_build'
          ? 'Exam Build'
          : 'Timed Practice',
      tasks: laneTasks,
      totalMinutes: laneTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0),
      targetMinutes: 0, // Not stored, would need to recalculate
    };
  });

  return {
    success: true,
    plan: {
      lanes,
      totalMinutes: plannerRun.plan_data.totalMinutes,
      generatedAt: new Date(plannerRun.created_at),
    },
  };
}
