# AP Quest Planner

A gamified study planner for high school AP students that turns studying into quests, generates adaptive daily/weekly plans, and tracks mastery by College Board units.

## Features

- 🎮 **Gamification:** XP, levels, streaks, and achievements
- 📊 **Smart Planner:** Adaptive daily/weekly plans based on urgency, unit weakness, and spaced repetition
- 📈 **Analytics Dashboard:** Readiness scores, unit mastery maps, and performance trends
- ⏱️ **Focus Mode:** Distraction-free timer with session tracking
- 🎯 **Quest Board:** Three-lane task organization (Due Soon, Exam Build, Timed Practice)
- 🎓 **AP Course Support:** Templates for AP Calc AB, AP Bio, APUSH, and AP Lang

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (Auth + Postgres)
- **ORM:** Drizzle ORM
- **State Management:** Server Actions + React Query
- **UI Components:** shadcn/ui
- **Charts:** Recharts
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/eigenstarr/miniature-memory.git
   cd miniature-memory
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**

   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   DATABASE_URL=your-database-connection-string
   ```

4. **Run database migrations:**
   ```bash
   npm run db:push
   ```

5. **Seed AP course templates:**
   ```bash
   npm run db:seed
   ```

6. **Start the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
miniature-memory/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── (dashboard)/       # Main app pages
│   │   └── onboarding/        # Onboarding flow
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── quest-board/       # Quest-specific components
│   ├── lib/
│   │   ├── db/                # Drizzle schema + client
│   │   ├── planner/           # Scoring & scheduling algorithms
│   │   ├── analytics/         # Readiness & mastery calculations
│   │   └── supabase/          # Auth clients
│   ├── actions/               # Server actions
│   ├── hooks/                 # React Query hooks
│   └── types/                 # TypeScript types
├── drizzle/
│   ├── migrations/            # Database migrations
│   └── seed/                  # Seed data (AP courses, achievements)
└── supabase/
    └── migrations/            # RLS policies
```

## Database Schema

### Core Tables

- **users** - User profiles, XP, levels, streaks
- **courses** - AP courses user is taking
- **course_units** - Units within courses (from templates)
- **projects** - Assignments and exams
- **tasks** - Individual actionable items
- **focus_sessions** - Study session tracking
- **planner_runs** - Daily plan generation results
- **question_attempts** - Practice question tracking
- **error_log_items** - Mistakes needing remediation
- **achievements** - Gamification milestones
- **user_achievements** - Unlocked achievements

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Drizzle migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio
- `npm run db:seed` - Seed database with AP course templates

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Database powered by [Supabase](https://supabase.com/)
