import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  date,
  boolean,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// USERS TABLE
// ============================================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // Synced with Supabase auth.users.id
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  grade: integer('grade'), // 9-12
  targetStudyMinutesPerDay: integer('target_study_minutes_per_day').default(120),
  totalXp: integer('total_xp').default(0),
  currentLevel: integer('current_level').default(1),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  lastStudyDate: date('last_study_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  onboardedAt: timestamp('onboarded_at'),
});

// ============================================================================
// COURSES TABLE
// ============================================================================
export const courses = pgTable('courses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(), // e.g., "AP Calculus AB"
  apCourseCode: text('ap_course_code'), // e.g., "ap-calc-ab" (links to templates)
  targetScore: integer('target_score'), // 1-5
  examDate: date('exam_date'),
  color: text('color').default('#3b82f6'), // For UI
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// COURSE UNITS TABLE
// ============================================================================
export const courseUnits = pgTable('course_units', {
  id: uuid('id').defaultRandom().primaryKey(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'cascade' })
    .notNull(),
  unitNumber: integer('unit_number').notNull(),
  name: text('name').notNull(), // e.g., "Limits and Continuity"
  topics: jsonb('topics').$type<string[]>(), // Array of topic strings
  masteryScore: integer('mastery_score').default(0), // 0-100
  lastStudiedAt: timestamp('last_studied_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// PROJECTS TABLE
// ============================================================================
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  courseId: uuid('course_id')
    .references(() => courses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  projectType: text('project_type').notNull(), // 'assignment', 'exam', 'quiz', 'essay'
  dueDate: date('due_date'),
  weight: integer('weight'), // Grade weight percentage
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// TASKS TABLE
// ============================================================================
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'set null' }),
  courseUnitId: uuid('course_unit_id')
    .references(() => courseUnits.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  description: text('description'),
  taskType: text('task_type').notNull(), // 'assignment_work', 'exam_build', 'timed_practice'
  estimatedMinutes: integer('estimated_minutes').default(30),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ============================================================================
// FOCUS SESSIONS TABLE
// ============================================================================
export const focusSessions = pgTable('focus_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  taskId: uuid('task_id')
    .references(() => tasks.id, { onDelete: 'set null' }),
  durationMinutes: integer('duration_minutes').notNull(),
  xpEarned: integer('xp_earned').default(0),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// PLANNER RUNS TABLE
// ============================================================================
export const plannerRuns = pgTable('planner_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  planDate: date('plan_date').notNull(),
  allocatedTasks: jsonb('allocated_tasks').$type<{
    dueSoon: string[]; // task IDs
    examBuild: string[];
    timedPractice: string[];
  }>(),
  totalMinutes: integer('total_minutes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// QUESTION ATTEMPTS TABLE
// ============================================================================
export const questionAttempts = pgTable('question_attempts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  courseUnitId: uuid('course_unit_id')
    .references(() => courseUnits.id, { onDelete: 'set null' }),
  taskId: uuid('task_id')
    .references(() => tasks.id, { onDelete: 'set null' }),
  questionText: text('question_text'),
  questionType: text('question_type'), // 'mcq', 'frq'
  userAnswer: text('user_answer'),
  correctAnswer: text('correct_answer'),
  isCorrect: boolean('is_correct').notNull(),
  timeSpentSeconds: integer('time_spent_seconds'),
  attemptedAt: timestamp('attempted_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// ERROR LOG ITEMS TABLE
// ============================================================================
export const errorLogItems = pgTable('error_log_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  courseUnitId: uuid('course_unit_id')
    .references(() => courseUnits.id, { onDelete: 'cascade' })
    .notNull(),
  questionAttemptId: uuid('question_attempt_id')
    .references(() => questionAttempts.id, { onDelete: 'set null' }),
  notes: text('notes'),
  remediatedAt: timestamp('remediated_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// ACHIEVEMENTS TABLE
// ============================================================================
export const achievements = pgTable('achievements', {
  id: text('id').primaryKey(), // 'first-session', 'streak-7', etc.
  name: text('name').notNull(),
  description: text('description'),
  icon: text('icon'), // Emoji or icon name
  xpReward: integer('xp_reward').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// USER ACHIEVEMENTS TABLE
// ============================================================================
export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  achievementId: text('achievement_id')
    .references(() => achievements.id, { onDelete: 'cascade' })
    .notNull(),
  unlockedAt: timestamp('unlocked_at').defaultNow().notNull(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  courses: many(courses),
  projects: many(projects),
  tasks: many(tasks),
  sessions: many(focusSessions),
  plannerRuns: many(plannerRuns),
  questionAttempts: many(questionAttempts),
  errorLogItems: many(errorLogItems),
  userAchievements: many(userAchievements),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  user: one(users, {
    fields: [courses.userId],
    references: [users.id],
  }),
  units: many(courseUnits),
  projects: many(projects),
}));

export const courseUnitsRelations = relations(courseUnits, ({ one, many }) => ({
  course: one(courses, {
    fields: [courseUnits.courseId],
    references: [courses.id],
  }),
  tasks: many(tasks),
  questionAttempts: many(questionAttempts),
  errorLogItems: many(errorLogItems),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, {
    fields: [projects.userId],
    references: [users.id],
  }),
  course: one(courses, {
    fields: [projects.courseId],
    references: [courses.id],
  }),
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  courseUnit: one(courseUnits, {
    fields: [tasks.courseUnitId],
    references: [courseUnits.id],
  }),
  sessions: many(focusSessions),
  questionAttempts: many(questionAttempts),
}));

export const focusSessionsRelations = relations(focusSessions, ({ one }) => ({
  user: one(users, {
    fields: [focusSessions.userId],
    references: [users.id],
  }),
  task: one(tasks, {
    fields: [focusSessions.taskId],
    references: [tasks.id],
  }),
}));

export const plannerRunsRelations = relations(plannerRuns, ({ one }) => ({
  user: one(users, {
    fields: [plannerRuns.userId],
    references: [users.id],
  }),
}));

export const questionAttemptsRelations = relations(questionAttempts, ({ one }) => ({
  user: one(users, {
    fields: [questionAttempts.userId],
    references: [users.id],
  }),
  courseUnit: one(courseUnits, {
    fields: [questionAttempts.courseUnitId],
    references: [courseUnits.id],
  }),
  task: one(tasks, {
    fields: [questionAttempts.taskId],
    references: [tasks.id],
  }),
}));

export const errorLogItemsRelations = relations(errorLogItems, ({ one }) => ({
  user: one(users, {
    fields: [errorLogItems.userId],
    references: [users.id],
  }),
  courseUnit: one(courseUnits, {
    fields: [errorLogItems.courseUnitId],
    references: [courseUnits.id],
  }),
  questionAttempt: one(questionAttempts, {
    fields: [errorLogItems.questionAttemptId],
    references: [questionAttempts.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, {
    fields: [userAchievements.userId],
    references: [users.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Course = typeof courses.$inferSelect;
export type NewCourse = typeof courses.$inferInsert;

export type CourseUnit = typeof courseUnits.$inferSelect;
export type NewCourseUnit = typeof courseUnits.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type FocusSession = typeof focusSessions.$inferSelect;
export type NewFocusSession = typeof focusSessions.$inferInsert;

export type PlannerRun = typeof plannerRuns.$inferSelect;
export type NewPlannerRun = typeof plannerRuns.$inferInsert;

export type QuestionAttempt = typeof questionAttempts.$inferSelect;
export type NewQuestionAttempt = typeof questionAttempts.$inferInsert;

export type ErrorLogItem = typeof errorLogItems.$inferSelect;
export type NewErrorLogItem = typeof errorLogItems.$inferInsert;

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;
