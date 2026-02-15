/**
 * Planner Scheduler
 * Allocates scored tasks to 3 lanes based on time budgets and task types
 */

interface ScoredTask {
  id: string;
  title: string;
  task_type: 'assignment_work' | 'exam_build' | 'timed_practice';
  estimated_minutes: number;
  totalScore: number;
  urgencyScore: number;
  importanceScore: number;
  weaknessBonus: number;
  recencyBonus: number;
}

export interface PlannedLane {
  name: 'due_soon' | 'exam_build' | 'timed_practice';
  displayName: string;
  tasks: ScoredTask[];
  totalMinutes: number;
  targetMinutes: number;
}

export interface DailyPlan {
  lanes: PlannedLane[];
  totalMinutes: number;
  generatedAt: Date;
}

/**
 * Calculate time budgets for each lane based on user's target study time
 * Returns in minutes
 */
function calculateTimeBudgets(targetStudyMinutesPerDay: number): {
  dueSoon: number;
  examBuild: number;
  timedPractice: number;
} {
  // Default allocation:
  // - Due Soon: 65% (middle of 60-70% range)
  // - Exam Build: 25% (middle of 20-30% range)
  // - Timed Practice: 10% (middle of 0-20% range)

  return {
    dueSoon: Math.round(targetStudyMinutesPerDay * 0.65),
    examBuild: Math.round(targetStudyMinutesPerDay * 0.25),
    timedPractice: Math.round(targetStudyMinutesPerDay * 0.10),
  };
}

/**
 * Allocate tasks to lanes based on type, score, and time budgets
 */
export function scheduleTasks(
  scoredTasks: ScoredTask[],
  targetStudyMinutesPerDay: number
): DailyPlan {
  const budgets = calculateTimeBudgets(targetStudyMinutesPerDay);

  // Initialize lanes
  const lanes: PlannedLane[] = [
    {
      name: 'due_soon',
      displayName: 'Due Soon',
      tasks: [],
      totalMinutes: 0,
      targetMinutes: budgets.dueSoon,
    },
    {
      name: 'exam_build',
      displayName: 'Exam Build',
      tasks: [],
      totalMinutes: 0,
      targetMinutes: budgets.examBuild,
    },
    {
      name: 'timed_practice',
      displayName: 'Timed Practice',
      tasks: [],
      totalMinutes: 0,
      targetMinutes: budgets.timedPractice,
    },
  ];

  // Separate tasks by type (already sorted by score from scoring module)
  const assignmentTasks = scoredTasks.filter((t) => t.task_type === 'assignment_work');
  const examBuildTasks = scoredTasks.filter((t) => t.task_type === 'exam_build');
  const timedPracticeTasks = scoredTasks.filter((t) => t.task_type === 'timed_practice');

  // Fill "Due Soon" lane with assignment tasks
  const dueSoonLane = lanes[0];
  for (const task of assignmentTasks) {
    // Cap at 5 tasks per lane
    if (dueSoonLane.tasks.length >= 5) break;

    // Add task if it fits in budget (with some flexibility - allow 20% overage)
    if (dueSoonLane.totalMinutes + task.estimated_minutes <= dueSoonLane.targetMinutes * 1.2) {
      dueSoonLane.tasks.push(task);
      dueSoonLane.totalMinutes += task.estimated_minutes;
    }
  }

  // If Due Soon lane has space and no more assignments, fill with high-urgency exam_build tasks
  if (dueSoonLane.tasks.length < 5) {
    const urgentExamTasks = examBuildTasks
      .filter((t) => t.urgencyScore > 50) // Only high-urgency ones
      .slice(0, 5 - dueSoonLane.tasks.length);

    for (const task of urgentExamTasks) {
      if (dueSoonLane.totalMinutes + task.estimated_minutes <= dueSoonLane.targetMinutes * 1.2) {
        dueSoonLane.tasks.push(task);
        dueSoonLane.totalMinutes += task.estimated_minutes;
        // Remove from exam build pool
        examBuildTasks.splice(examBuildTasks.indexOf(task), 1);
      }
    }
  }

  // Fill "Exam Build" lane with exam_build tasks (prefer high weakness bonus)
  const examBuildLane = lanes[1];
  const sortedExamBuild = [...examBuildTasks].sort((a, b) => b.weaknessBonus - a.weaknessBonus);

  for (const task of sortedExamBuild) {
    if (examBuildLane.tasks.length >= 5) break;

    if (examBuildLane.totalMinutes + task.estimated_minutes <= examBuildLane.targetMinutes * 1.2) {
      examBuildLane.tasks.push(task);
      examBuildLane.totalMinutes += task.estimated_minutes;
    }
  }

  // Fill "Timed Practice" lane with timed_practice tasks
  const timedPracticeLane = lanes[2];
  for (const task of timedPracticeTasks) {
    if (timedPracticeLane.tasks.length >= 5) break;

    if (
      timedPracticeLane.totalMinutes + task.estimated_minutes <=
      timedPracticeLane.targetMinutes * 1.2
    ) {
      timedPracticeLane.tasks.push(task);
      timedPracticeLane.totalMinutes += task.estimated_minutes;
    }
  }

  const totalMinutes = lanes.reduce((sum, lane) => sum + lane.totalMinutes, 0);

  return {
    lanes,
    totalMinutes,
    generatedAt: new Date(),
  };
}

/**
 * Validate a daily plan
 * Returns warnings/suggestions
 */
export function validatePlan(plan: DailyPlan): string[] {
  const warnings: string[] = [];

  // Check if total time significantly exceeds or falls short of target
  const targetTotal = plan.lanes.reduce((sum, lane) => sum + lane.targetMinutes, 0);
  const actualTotal = plan.totalMinutes;

  if (actualTotal < targetTotal * 0.5) {
    warnings.push(
      'Plan is significantly under your daily study goal. Consider creating more tasks or adjusting your target time.'
    );
  }

  if (actualTotal > targetTotal * 1.5) {
    warnings.push(
      'Plan exceeds your daily study goal by 50%+. Consider reducing task estimates or adjusting your target time.'
    );
  }

  // Check for empty lanes
  plan.lanes.forEach((lane) => {
    if (lane.tasks.length === 0) {
      warnings.push(
        `${lane.displayName} lane is empty. Consider creating ${lane.name === 'due_soon' ? 'assignment' : lane.name} tasks.`
      );
    }
  });

  return warnings;
}
