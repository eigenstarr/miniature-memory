import { createClient } from '@/lib/supabase/server';
import { calculateReadiness, getReadinessLevel } from '@/lib/analytics/readiness';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  BarChart3,
  TrendingUp,
  Target,
  Flame,
  Award,
  Clock,
  BookOpen,
} from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  // Fetch all courses
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  // Calculate readiness for each course
  const coursesWithReadiness = await Promise.all(
    (courses || []).map(async (course) => {
      try {
        const readiness = await calculateReadiness(user.id, course.id);
        const level = getReadinessLevel(readiness.totalScore);
        return { ...course, readiness, level };
      } catch (error) {
        console.error('Error calculating readiness:', error);
        return {
          ...course,
          readiness: null,
          level: { label: 'Unknown', color: 'gray', description: 'Not enough data' },
        };
      }
    })
  );

  // Fetch recent focus sessions (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: recentSessions } = await supabase
    .from('focus_sessions')
    .select('duration_minutes, xp_earned, ended_at')
    .eq('user_id', user.id)
    .gte('ended_at', sevenDaysAgo.toISOString())
    .order('ended_at', { ascending: true });

  // Calculate stats
  const totalStudyMinutes =
    (recentSessions || []).reduce((sum, s) => sum + s.duration_minutes, 0);
  const avgDailyMinutes = Math.round(totalStudyMinutes / 7);

  // Fetch task stats
  const { count: totalTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  const { count: completedTasks } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('status', 'completed');

  const completionRate =
    totalTasks && totalTasks > 0 ? Math.round((completedTasks! / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your progress and readiness
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Total XP</CardDescription>
              <Award className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{userProfile?.total_xp || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Level {userProfile?.current_level || 1}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Study Streak</CardDescription>
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{userProfile?.current_streak || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              days • longest: {userProfile?.longest_streak || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Avg Daily Study</CardDescription>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{avgDailyMinutes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              minutes (last 7 days)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardDescription>Task Completion</CardDescription>
              <Target className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {completedTasks || 0} / {totalTasks || 0} tasks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Readiness */}
      <div>
        <h2 className="text-xl font-bold mb-4">Course Readiness</h2>
        {coursesWithReadiness.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
              <p className="text-sm text-muted-foreground">
                Complete onboarding to add your AP courses
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {coursesWithReadiness.map((course) => {
              const examDate = new Date(course.exam_date);
              const daysUntilExam = Math.max(
                0,
                Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              );

              const colorClasses = {
                green: 'bg-green-100 dark:bg-green-900 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
                blue: 'bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
                yellow: 'bg-yellow-100 dark:bg-yellow-900 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
                red: 'bg-red-100 dark:bg-red-900 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
                gray: 'bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-800 dark:text-gray-200',
              };

              return (
                <Link key={course.id} href={`/courses/${course.id}`}>
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: course.color }}
                          >
                            {course.ap_course_code?.slice(0, 2).toUpperCase() || 'AP'}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{course.name}</CardTitle>
                            <CardDescription>
                              Exam in {daysUntilExam} days • Target: {course.target_score}/5
                            </CardDescription>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Readiness Score */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Readiness Score</span>
                          <span className="text-2xl font-bold text-primary">
                            {course.readiness?.totalScore || 0}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                          <div
                            className="bg-primary h-3 rounded-full transition-all"
                            style={{ width: `${course.readiness?.totalScore || 0}%` }}
                          />
                        </div>
                        <div
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-2 border ${
                            colorClasses[course.level.color as keyof typeof colorClasses]
                          }`}
                        >
                          {course.level.label}
                        </div>
                      </div>

                      {/* Breakdown */}
                      {course.readiness && (
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-muted-foreground">Coverage</p>
                            <p className="font-semibold">{course.readiness.coverage}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Accuracy</p>
                            <p className="font-semibold">{course.readiness.accuracy}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Recency</p>
                            <p className="font-semibold">{course.readiness.recency}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pacing</p>
                            <p className="font-semibold">{course.readiness.pacing}%</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Study Sessions</CardTitle>
          <CardDescription>Your focus sessions from the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {!recentSessions || recentSessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No study sessions yet. Start a focus session to begin tracking!
            </p>
          ) : (
            <div className="space-y-3">
              {recentSessions.slice(-10).reverse().map((session, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 rounded-full p-2">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{session.duration_minutes} minutes</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.ended_at).toLocaleDateString()} •{' '}
                        {new Date(session.ended_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-primary">
                      +{session.xp_earned} XP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle>Keep Going!</CardTitle>
          <CardDescription>Continue building your study momentum</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Link href="/focus">
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                Start Focus Session
              </button>
            </Link>
            <Link href="/quest-board">
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                View Quest Board
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
