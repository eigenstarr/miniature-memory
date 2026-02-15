import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { signOut } from '@/actions/auth';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Check if user has completed onboarding using Supabase
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!userProfile?.onboarded_at) {
    redirect('/onboarding/profile');
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/quest-board" className="text-xl font-bold text-primary">
                AP Quest Planner
              </Link>
              <nav className="hidden md:flex space-x-4">
                <Link
                  href="/quest-board"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary"
                >
                  Quest Board
                </Link>
                <Link
                  href="/focus"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary"
                >
                  Focus
                </Link>
                <Link
                  href="/courses"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary"
                >
                  Courses
                </Link>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary"
                >
                  Dashboard
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <span className="font-semibold">
                  {userProfile.display_name || 'User'}
                </span>
                <span className="ml-3 text-xs">
                  Level {userProfile.current_level} • {userProfile.total_xp} XP
                </span>
              </div>
              <form action={signOut}>
                <Button variant="outline" size="sm" type="submit">
                  Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
