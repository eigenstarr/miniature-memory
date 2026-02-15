/**
 * Planner Scoring Algorithm
 * Scores tasks based on urgency, importance, weakness, and recency
 * to prioritize what students should work on today
 */

interface Task {
  id: string;
  title: string;
  task_type: 'assignment_work' | 'exam_build' | 'timed_practice';
  due_date: string | null;
  estimated_minutes: number;
  course_unit_id: string | null;
  project_id: string | null;
}

interface CourseUnit {
  id: string;
  course_id: string;
  mastery_score: number;
  last_studied_at: string | null;
}

interface Course {
  id: string;
  exam_date: string;
}

interface ScoringContext {
  units: Map<string, CourseUnit>; // unit_id -> unit
  courses: Map<string, Course>; // course_id -> course
  currentDate: Date;
}

interface ScoredTask extends Task {
  totalScore: number;
  urgencyScore: number;
  importanceScore: number;
  weaknessBonus: number;
  recencyBonus: number;
}

/**
 * Calculate urgency score (0-100) based on due date
 * Uses exponential decay: closer deadlines get higher scores
 */
function calculateUrgency(dueDate: string | null, currentDate: Date): number {
  if (!dueDate) {
    return 10; // Low urgency for tasks without due dates
  }

  const dueDateObj = new Date(dueDate);
  const daysUntilDue = Math.max(
    0,
    Math.ceil((dueDateObj.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Exponential decay: 100 * e^(-days/7)
  // This gives: 0 days = 100, 7 days = 37, 14 days = 14, 21 days = 5
  const urgency = 100 * Math.exp(-daysUntilDue / 7);

  return Math.min(100, Math.max(0, urgency));
}

/**
 * Calculate importance score (0-100) based on task type and exam proximity
 */
function calculateImportance(
  task: Task,
  context: ScoringContext
): number {
  // Base importance by task type
  const baseImportance: Record<Task['task_type'], number> = {
    assignment_work: 70, // Homework/assignments are important (graded, due soon)
    exam_build: 50, // Exam prep is moderately important (long-term)
    timed_practice: 30, // Practice tests are lower priority (optional)
  };

  let importance = baseImportance[task.task_type];

  // Boost importance if exam is approaching
  if (task.course_unit_id) {
    const unit = context.units.get(task.course_unit_id);
    if (unit) {
      const course = context.courses.get(unit.course_id);
      if (course) {
        const examDate = new Date(course.exam_date);
        const daysUntilExam = Math.ceil(
          (examDate.getTime() - context.currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Boost if exam is within 30 days
        if (daysUntilExam <= 30 && daysUntilExam > 0) {
          const examBonus = 30 * (1 - daysUntilExam / 30); // 0-30 bonus
          importance += examBonus;
        }
      }
    }
  }

  return Math.min(100, Math.max(0, importance));
}

/**
 * Calculate weakness bonus (0-50) based on unit mastery
 * Lower mastery = higher priority
 */
function calculateWeaknessBonus(
  task: Task,
  context: ScoringContext
): number {
  if (!task.course_unit_id) {
    return 0; // No bonus for tasks not tied to a unit
  }

  const unit = context.units.get(task.course_unit_id);
  if (!unit) {
    return 0;
  }

  const mastery = unit.mastery_score || 0;

  // Graduated bonus based on mastery level
  if (mastery < 30) {
    return 50; // Struggling - high priority
  } else if (mastery < 50) {
    return 30; // Developing - medium priority
  } else if (mastery < 70) {
    return 15; // Progressing - low priority
  }

  return 0; // Proficient - no bonus needed
}

/**
 * Calculate recency bonus (0-25) based on spaced repetition
 * Prefer units that haven't been studied recently
 */
function calculateRecencyBonus(
  task: Task,
  context: ScoringContext
): number {
  if (!task.course_unit_id) {
    return 15; // Moderate bonus for tasks not tied to units
  }

  const unit = context.units.get(task.course_unit_id);
  if (!unit || !unit.last_studied_at) {
    return 25; // Full bonus if never studied
  }

  const lastStudied = new Date(unit.last_studied_at);
  const daysSinceStudied = Math.floor(
    (context.currentDate.getTime() - lastStudied.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Spaced repetition logic
  if (daysSinceStudied < 2) {
    return 0; // Too recent - no bonus
  } else if (daysSinceStudied < 7) {
    // Graduated bonus: 2 days = 10, 7 days = 20
    return 10 + (daysSinceStudied - 2) * 2;
  }

  return 25; // Full bonus if 7+ days ago
}

/**
 * Score a single task based on all factors
 */
export function scoreTask(
  task: Task,
  context: ScoringContext
): ScoredTask {
  const urgencyScore = calculateUrgency(task.due_date, context.currentDate);
  const importanceScore = calculateImportance(task, context);
  const weaknessBonus = calculateWeaknessBonus(task, context);
  const recencyBonus = calculateRecencyBonus(task, context);

  // Weighted total: urgency 40%, importance 35%, weakness 15%, recency 10%
  const totalScore =
    urgencyScore * 0.4 +
    importanceScore * 0.35 +
    weaknessBonus * 0.15 +
    recencyBonus * 0.1;

  return {
    ...task,
    totalScore: Math.round(totalScore * 100) / 100, // Round to 2 decimals
    urgencyScore: Math.round(urgencyScore * 100) / 100,
    importanceScore: Math.round(importanceScore * 100) / 100,
    weaknessBonus: Math.round(weaknessBonus * 100) / 100,
    recencyBonus: Math.round(recencyBonus * 100) / 100,
  };
}

/**
 * Score all tasks and return them sorted by total score (descending)
 */
export function scoreTasks(
  tasks: Task[],
  context: ScoringContext
): ScoredTask[] {
  const scoredTasks = tasks.map((task) => scoreTask(task, context));

  // Sort by total score descending (highest priority first)
  return scoredTasks.sort((a, b) => b.totalScore - a.totalScore);
}
