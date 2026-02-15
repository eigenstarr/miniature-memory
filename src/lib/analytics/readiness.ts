/**
 * Readiness Scoring Algorithm
 * Calculates a 0-100 score indicating how prepared a student is for an AP exam
 * Based on: coverage, accuracy, recency, and pacing
 */

import { createClient } from '@/lib/supabase/server';

export interface ReadinessScore {
  totalScore: number; // 0-100
  coverage: number; // 0-100 (% units with mastery > 50%)
  accuracy: number; // 0-100 (% correct on practice questions)
  recency: number; // 0-100 (% units studied in last 14 days)
  pacing: number; // 0-100 (on track to finish before exam?)
  breakdown: {
    coverageWeight: number;
    accuracyWeight: number;
    recencyWeight: number;
    pacingWeight: number;
  };
}

/**
 * Calculate coverage score (0-100)
 * What % of units have achieved proficiency (>50% mastery)?
 */
function calculateCoverage(units: any[]): number {
  if (units.length === 0) return 0;

  const proficientUnits = units.filter((u) => (u.mastery_score || 0) >= 50).length;
  return (proficientUnits / units.length) * 100;
}

/**
 * Calculate accuracy score (0-100)
 * What % of practice questions were answered correctly?
 */
function calculateAccuracy(attempts: any[]): number {
  if (attempts.length === 0) return 0; // No data yet

  const correctAttempts = attempts.filter((a) => a.correct).length;
  return (correctAttempts / attempts.length) * 100;
}

/**
 * Calculate recency score (0-100)
 * What % of units have been studied in the last 14 days?
 */
function calculateRecency(units: any[]): number {
  if (units.length === 0) return 0;

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const recentUnits = units.filter((u) => {
    if (!u.last_studied_at) return false;
    const lastStudied = new Date(u.last_studied_at);
    return lastStudied >= fourteenDaysAgo;
  }).length;

  return (recentUnits / units.length) * 100;
}

/**
 * Calculate pacing score (0-100)
 * Are you on track to complete all remaining work before the exam?
 */
async function calculatePacing(
  userId: string,
  courseId: string,
  examDate: string
): Promise<number> {
  const supabase = await createClient();

  // Get all incomplete tasks for this course
  const { data: incompleteTasks } = await supabase
    .from('tasks')
    .select('estimated_minutes')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .in('status', ['todo', 'in_progress']);

  const totalMinutesRemaining =
    (incompleteTasks || []).reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);

  // Get user's average daily study minutes (from focus sessions)
  const { data: recentSessions } = await supabase
    .from('focus_sessions')
    .select('duration_minutes')
    .eq('user_id', userId)
    .gte(
      'ended_at',
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() // Last 30 days
    );

  const avgDailyMinutes =
    recentSessions && recentSessions.length > 0
      ? recentSessions.reduce((sum, s) => sum + s.duration_minutes, 0) /
        Math.min(30, recentSessions.length)
      : 60; // Default to 1 hour if no data

  // Calculate required days to finish
  const requiredDays = avgDailyMinutes > 0 ? totalMinutesRemaining / avgDailyMinutes : 0;

  // Days until exam
  const exam = new Date(examDate);
  const daysUntilExam = Math.max(
    0,
    Math.ceil((exam.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  if (daysUntilExam === 0) {
    return totalMinutesRemaining === 0 ? 100 : 0; // Exam is today
  }

  // Pacing calculation
  if (requiredDays <= daysUntilExam * 0.5) {
    return 100; // Way ahead of schedule
  } else if (requiredDays <= daysUntilExam * 0.75) {
    return 75; // Ahead of schedule
  } else if (requiredDays <= daysUntilExam) {
    return 50; // On track
  } else if (requiredDays <= daysUntilExam * 1.5) {
    return 25; // Behind but recoverable
  } else {
    return 10; // Significantly behind
  }
}

/**
 * Calculate overall readiness score for a course
 */
export async function calculateReadiness(
  userId: string,
  courseId: string
): Promise<ReadinessScore> {
  const supabase = await createClient();

  // Fetch course for exam date
  const { data: course } = await supabase
    .from('courses')
    .select('exam_date')
    .eq('id', courseId)
    .eq('user_id', userId)
    .single();

  if (!course) {
    throw new Error('Course not found');
  }

  // Fetch all units for this course
  const { data: units } = await supabase
    .from('course_units')
    .select('id, mastery_score, last_studied_at')
    .eq('course_id', courseId);

  // Fetch all question attempts for this course
  const { data: attempts } = await supabase
    .from('question_attempts')
    .select('correct')
    .eq('user_id', userId)
    .in(
      'course_unit_id',
      (units || []).map((u) => u.id)
    );

  // Calculate component scores
  const coverage = calculateCoverage(units || []);
  const accuracy = calculateAccuracy(attempts || []);
  const recency = calculateRecency(units || []);
  const pacing = await calculatePacing(userId, courseId, course.exam_date);

  // Weighted combination (as per spec):
  // Coverage: 25%, Accuracy: 35%, Recency: 20%, Pacing: 20%
  const weights = {
    coverage: 0.25,
    accuracy: 0.35,
    recency: 0.2,
    pacing: 0.2,
  };

  const totalScore = Math.round(
    coverage * weights.coverage +
      accuracy * weights.accuracy +
      recency * weights.recency +
      pacing * weights.pacing
  );

  return {
    totalScore: Math.min(100, Math.max(0, totalScore)),
    coverage: Math.round(coverage),
    accuracy: Math.round(accuracy),
    recency: Math.round(recency),
    pacing: Math.round(pacing),
    breakdown: {
      coverageWeight: Math.round(coverage * weights.coverage),
      accuracyWeight: Math.round(accuracy * weights.accuracy),
      recencyWeight: Math.round(recency * weights.recency),
      pacingWeight: Math.round(pacing * weights.pacing),
    },
  };
}

/**
 * Calculate readiness for all of a user's courses
 */
export async function calculateAllReadiness(
  userId: string
): Promise<Map<string, ReadinessScore>> {
  const supabase = await createClient();

  const { data: courses } = await supabase
    .from('courses')
    .select('id')
    .eq('user_id', userId);

  if (!courses || courses.length === 0) {
    return new Map();
  }

  const readinessScores = new Map<string, ReadinessScore>();

  for (const course of courses) {
    try {
      const score = await calculateReadiness(userId, course.id);
      readinessScores.set(course.id, score);
    } catch (error) {
      console.error(`Error calculating readiness for course ${course.id}:`, error);
    }
  }

  return readinessScores;
}

/**
 * Get readiness level label based on score
 */
export function getReadinessLevel(score: number): {
  label: string;
  color: string;
  description: string;
} {
  if (score >= 80) {
    return {
      label: 'Exam Ready',
      color: 'green',
      description: 'You are well-prepared for the exam',
    };
  } else if (score >= 60) {
    return {
      label: 'On Track',
      color: 'blue',
      description: 'Keep up the good work',
    };
  } else if (score >= 40) {
    return {
      label: 'Developing',
      color: 'yellow',
      description: 'Focus on weak areas to improve',
    };
  } else {
    return {
      label: 'Needs Attention',
      color: 'red',
      description: 'Increase study time and focus',
    };
  }
}
