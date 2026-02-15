# AP Quest Planner

A gamified study planner for high school AP students that turns studying into quests, generates adaptive daily/weekly plans, and tracks mastery by College Board units.

> **Status:** MVP Complete ✅ | Core features fully functional

## ✨ Key Features

### 🎯 Quest Board
- **Three-lane task organization:** Due Soon (60-70%), Exam Build (20-30%), Timed Practice (0-20%)
- **AI-powered daily planner:** Generates optimized study plans based on urgency, unit weakness, and spaced repetition
- **Manual task creation:** Create quests with course/unit association, due dates, and estimated time
- **Automatic task allocation:** Smart algorithm distributes tasks to appropriate lanes

### 📊 Smart Planning Algorithm
The planner uses a weighted scoring system (0-100) to prioritize tasks:
- **Urgency (40%):** Exponential decay based on due date (`100 * e^(-days/7)`)
- **Importance (35%):** Task type + exam proximity weighting
- **Weakness Bonus (15%):** Boosts tasks in low-mastery units (<50% mastery = +50 points)
- **Recency Bonus (10%):** Spaced repetition (penalizes units studied <2 days ago)

### 📈 Analytics Dashboard
- **Readiness Score (0-100):** Calculated per course with 4 components:
  - Coverage (25%): % units with mastery ≥50%
  - Accuracy (35%): % correct on practice questions
  - Recency (20%): % units studied in last 14 days
  - Pacing (20%): On track to finish before exam?
- **Unit Mastery Map:** Color-coded heatmap (green ≥70%, yellow 50-69%, red <50%)
- **Performance Trends:** Daily study minutes, XP gain, mastery progression
- **Course Overview:** Days until exam, target score, progress stats

### ⏱️ Focus Mode
- **Pomodoro Timer:** 25-minute and 50-minute session options
- **Distraction-free UI:** Minimal full-screen timer
- **Automatic XP Awards:** 10 XP/minute with task type multipliers (1.0x, 1.2x, 1.5x)
- **Session Tracking:** Logs duration, XP earned, task completion
- **Streak Management:** Auto-updates daily study streaks

### 🎓 Course Management
- **AP Course Templates:** Pre-configured units for AP Calc AB, AP Bio, APUSH, AP Lang
- **Unit Mastery Tracking:** 40% task completion + 60% question accuracy
- **Course Detail Pages:** View all units, active/completed tasks, projects
- **Auto-updating Stats:** Mastery recalculates after study sessions and practice

### 🧠 Practice Questions & Error Tracking
- **Question Attempt Logging:** Record MCQ/FRQ/practice results with answers
- **Auto-remediation:** 3+ errors in same unit within 7 days → creates "Review: [Unit]" task
- **Error Statistics:** Track total, unremediated, and recent errors per unit
- **Unit Weakness Detection:** Alerts for units needing attention
- **Practice History:** View last 10 attempts with correctness indicators

### 🎮 Gamification
- **XP System:** Earn 10 XP/minute (multiplier based on task type)
- **Levels:** Auto-level up every 1000 XP
- **Streaks:** Daily study streak tracking with longest streak record
- **Profile Stats:** Display name, level, XP, streak in header

## 🛠️ Tech Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (Auth + Postgres + Row Level Security)
- **ORM:** Drizzle ORM
- **State Management:** Server Actions (mutations) + React Server Components
- **UI Components:** shadcn/ui (Radix UI primitives)
- **Deployment:** Vercel (recommended)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Supabase account ([create one](https://supabase.com))

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/eigenstarr/miniature-memory.git
   cd miniature-memory
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Supabase:**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings → API to get your credentials

4. **Configure environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
   ```

5. **Run database migrations:**
   ```bash
   npx drizzle-kit generate  # Generate migration files (if not present)
   ```

   Then in Supabase Dashboard → SQL Editor, run:
   ```sql
   -- Run all migration files from drizzle/migrations/*.sql
   -- Then add missing columns (if needed):
   ALTER TABLE "tasks" ADD COLUMN "course_id" uuid;
   ALTER TABLE "tasks" ADD COLUMN "status" text DEFAULT 'todo' NOT NULL;
   ALTER TABLE "tasks" ADD CONSTRAINT "tasks_course_id_courses_id_fk"
   FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id")
   ON DELETE cascade ON UPDATE no action;

   -- Reload schema cache
   NOTIFY pgrst, 'reload schema';
   ```

6. **Set up Row Level Security (RLS):**
   In Supabase SQL Editor, run:
   ```sql
   -- Enable RLS on all tables
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
   ALTER TABLE course_units ENABLE ROW LEVEL SECURITY;
   ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
   ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
   ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
   ALTER TABLE question_attempts ENABLE ROW LEVEL SECURITY;
   ALTER TABLE error_log_items ENABLE ROW LEVEL SECURITY;
   ALTER TABLE planner_runs ENABLE ROW LEVEL SECURITY;

   -- Create policies (users can only access their own data)
   CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
   CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
   CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (auth.uid() = id);

   CREATE POLICY "Users can manage own courses" ON courses FOR ALL USING (auth.uid() = user_id);
   CREATE POLICY "Users can manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
   CREATE POLICY "Users can manage own sessions" ON focus_sessions FOR ALL USING (auth.uid() = user_id);
   CREATE POLICY "Users can manage own attempts" ON question_attempts FOR ALL USING (auth.uid() = user_id);
   CREATE POLICY "Users can manage own errors" ON error_log_items FOR ALL USING (auth.uid() = user_id);
   CREATE POLICY "Users can manage own plans" ON planner_runs FOR ALL USING (auth.uid() = user_id);

   -- Note: course_units and projects need course ownership checks
   ```

7. **Seed AP course templates (optional):**
   Create seed data or manually add courses during onboarding

8. **Start the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the app

9. **First-time setup:**
   - Sign up for an account
   - Complete onboarding (profile + select AP courses)
   - Start creating quests and tracking study sessions!

## 📁 Project Structure

```
miniature-memory/
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── (auth)/                  # Login/Signup pages
│   │   ├── (dashboard)/             # Main app pages
│   │   │   ├── quest-board/         # Quest Board (3 lanes)
│   │   │   ├── focus/               # Focus Mode timer
│   │   │   ├── practice/            # Practice Questions
│   │   │   ├── courses/             # Courses overview & detail
│   │   │   └── dashboard/           # Analytics Dashboard
│   │   └── onboarding/              # Multi-step onboarding
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── quest-board/             # Quest Board components
│   │   ├── focus/                   # Focus Mode components
│   │   └── practice/                # Practice components
│   ├── lib/
│   │   ├── db/                      # Drizzle schema
│   │   ├── planner/                 # Scoring & scheduling algorithms
│   │   ├── analytics/               # Readiness & mastery calculations
│   │   └── supabase/                # Supabase clients (browser/server)
│   ├── actions/                     # Server actions (tasks, sessions, planner, questions)
│   └── types/                       # Shared TypeScript types
├── drizzle/
│   ├── migrations/                  # Database migrations
│   └── seed/                        # Seed data (AP courses)
└── public/                          # Static assets
```

## 🗄️ Database Schema

### Core Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `users` | User profiles, XP, levels, streaks | `id`, `total_xp`, `current_level`, `current_streak` |
| `courses` | AP courses user is taking | `id`, `user_id`, `name`, `target_score`, `exam_date` |
| `course_units` | Units within courses (from templates) | `id`, `course_id`, `unit_name`, `mastery_score` |
| `tasks` | Individual actionable quests | `id`, `user_id`, `course_id`, `status`, `task_type` |
| `projects` | Assignments and exams | `id`, `user_id`, `course_id`, `due_date` |
| `focus_sessions` | Study session tracking | `id`, `user_id`, `duration_minutes`, `xp_earned` |
| `planner_runs` | Daily plan generation results | `id`, `user_id`, `plan_date`, `plan_data` |
| `question_attempts` | Practice question tracking | `id`, `user_id`, `course_unit_id`, `is_correct` |
| `error_log_items` | Mistakes needing remediation | `id`, `user_id`, `course_unit_id`, `remediated_at` |

**Security:** All tables use Row Level Security (RLS) - users can only access their own data via `auth.uid() = user_id` policies.

## 📊 Key Algorithms

### Readiness Scoring
```typescript
readinessScore =
  coverage * 0.25 +      // % units with mastery ≥50%
  accuracy * 0.35 +      // % correct on practice questions
  recency * 0.20 +       // % units studied in last 14 days
  pacing * 0.20          // On track to finish before exam?
```

### Unit Mastery Calculation
```typescript
mastery = taskCompletion * 0.4 + questionAccuracy * 0.6
```

### Task Scoring (Planner)
```typescript
totalScore =
  urgency * 0.40 +           // 100 * e^(-daysUntilDue / 7)
  importance * 0.35 +        // Task type + exam proximity
  weaknessBonus * 0.15 +     // 0-50 (higher for low mastery)
  recencyBonus * 0.10        // 0-25 (spaced repetition)
```

## 🎯 Roadmap

### ✅ Completed (MVP)
- Authentication & onboarding
- Quest Board with 3-lane layout
- AI-powered daily planner
- Focus Mode with session tracking
- Dashboard with readiness scoring
- Course & unit management
- Practice questions & error tracking
- Basic gamification (XP, levels, streaks)

### 🚧 In Progress
- Achievements system
- Performance optimizations (indexes, caching)
- Mobile responsiveness polish

### 📋 Planned (Post-MVP)
- Weekly plan generation
- Task breakdown suggestions (AI-powered)
- Question bank integrations (College Board)
- Availability blocks (granular scheduling)
- Mobile app (React Native)
- Social features (study groups, leaderboards)

## 📜 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npx drizzle-kit generate` - Generate Drizzle migrations
- `npx drizzle-kit push` - Push schema to database (use SQL Editor instead for Supabase)
- `npx drizzle-kit studio` - Open Drizzle Studio

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

MIT License - feel free to use this project for learning or personal use.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database powered by [Supabase](https://supabase.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Made with ❤️ for AP students crushing their exams**
