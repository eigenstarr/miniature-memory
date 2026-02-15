import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Calendar, Target, TrendingUp } from 'lucide-react';

export default async function CoursesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch all courses
  const { data: courses } = await supabase
    .from('courses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  // Fetch units for each course to calculate overall mastery
  const coursesWithStats = await Promise.all(
    (courses || []).map(async (course) => {
      const { data: units } = await supabase
        .from('course_units')
        .select('mastery_score')
        .eq('course_id', course.id);

      const avgMastery = units?.length
        ? Math.round(
            units.reduce((sum, u) => sum + (u.mastery_score || 0), 0) / units.length
          )
        : 0;

      const { count: projectCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('course_id', course.id);

      return {
        ...course,
        avgMastery,
        unitCount: units?.length || 0,
        projectCount: projectCount || 0,
      };
    })
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-8 w-8" />
          My Courses
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your progress across all AP courses
        </p>
      </div>

      {/* Courses grid */}
      {coursesWithStats.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No courses yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You haven&apos;t added any courses yet. Complete onboarding to add courses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesWithStats.map((course) => {
            const examDate = new Date(course.exam_date);
            const daysUntilExam = Math.max(
              0,
              Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            );

            return (
              <Link key={course.id} href={`/courses/${course.id}`}>
                <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: course.color }}
                      >
                        {course.ap_course_code?.slice(0, 2).toUpperCase() || 'AP'}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {course.avgMastery}%
                        </div>
                        <div className="text-xs text-muted-foreground">Mastery</div>
                      </div>
                    </div>
                    <CardTitle className="mt-4">{course.name}</CardTitle>
                    <CardDescription>
                      Target Score: {course.target_score}/5
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Exam in <strong>{daysUntilExam} days</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {course.unitCount} units
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Target className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {course.projectCount} projects
                      </span>
                    </div>

                    {/* Mastery progress bar */}
                    <div className="pt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Overall Mastery</span>
                        <span className="font-medium">{course.avgMastery}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${course.avgMastery}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
