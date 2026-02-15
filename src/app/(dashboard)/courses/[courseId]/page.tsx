import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Calendar,
  Target,
  TrendingUp,
  ArrowLeft,
  Plus,
  Brain,
  CheckCircle2,
  Circle,
} from 'lucide-react';

interface CourseDetailPageProps {
  params: Promise<{
    courseId: string;
  }>;
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { courseId } = await params;

  // Fetch course
  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('user_id', user.id)
    .single();

  if (!course) {
    notFound();
  }

  // Fetch units
  const { data: units } = await supabase
    .from('course_units')
    .select('*')
    .eq('course_id', courseId)
    .order('unit_number', { ascending: true });

  // Fetch recent projects
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('course_id', courseId)
    .order('due_date', { ascending: true })
    .limit(5);

  // Fetch active tasks for this course
  const { data: activeTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('course_id', courseId)
    .in('status', ['todo', 'in_progress'])
    .order('due_date', { ascending: true });

  // Fetch completed tasks for this course (last 10)
  const { data: completedTasks } = await supabase
    .from('tasks')
    .select('*')
    .eq('course_id', courseId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(10);

  // Calculate course stats
  const avgMastery = units?.length
    ? Math.round(
        units.reduce((sum, u) => sum + (u.mastery_score || 0), 0) / units.length
      )
    : 0;

  const unitsAbove50 = units?.filter((u) => (u.mastery_score || 0) >= 50).length || 0;
  const unitsAbove70 = units?.filter((u) => (u.mastery_score || 0) >= 70).length || 0;

  const examDate = new Date(course.exam_date);
  const daysUntilExam = Math.max(
    0,
    Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  // Get mastery color
  const getMasteryColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getMasteryBgColor = (score: number) => {
    if (score >= 70) return 'bg-green-100 dark:bg-green-900';
    if (score >= 50) return 'bg-yellow-100 dark:bg-yellow-900';
    return 'bg-red-100 dark:bg-red-900';
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <Link href="/courses">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: course.color }}
            >
              {course.ap_course_code?.slice(0, 2).toUpperCase() || 'AP'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {course.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Target Score: {course.target_score}/5 • Exam in {daysUntilExam} days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Overall Mastery</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{avgMastery}%</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${avgMastery}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Proficient Units</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {unitsAbove70}/{units?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">≥70% mastery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Developing Units</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {unitsAbove50 - unitsAbove70}/{units?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">50-69% mastery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Days Until Exam</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{daysUntilExam}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {examDate.toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Units mastery map */}
      <Card>
        <CardHeader>
          <CardTitle>Unit Mastery</CardTitle>
          <CardDescription>
            Track your mastery across all {units?.length || 0} units
          </CardDescription>
        </CardHeader>
        <CardContent>
          {units?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No units found for this course
            </p>
          ) : (
            <div className="space-y-3">
              {units?.map((unit) => (
                <div key={unit.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${getMasteryBgColor(
                          unit.mastery_score || 0
                        )}`}
                      >
                        {unit.unit_number}
                      </div>
                      <div>
                        <p className="font-medium">{unit.unit_name}</p>
                        {unit.last_studied_at && (
                          <p className="text-xs text-muted-foreground">
                            Last studied:{' '}
                            {new Date(unit.last_studied_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right min-w-[60px]">
                        <div
                          className={`text-lg font-bold ${getMasteryColor(
                            unit.mastery_score || 0
                          )}`}
                        >
                          {unit.mastery_score || 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 ml-11">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        (unit.mastery_score || 0) >= 70
                          ? 'bg-green-500'
                          : (unit.mastery_score || 0) >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${unit.mastery_score || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Quests</CardTitle>
              <CardDescription>
                Tasks in progress for this course ({activeTasks?.length || 0})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!activeTasks || activeTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No active tasks for this course
            </p>
          ) : (
            <div className="space-y-3">
              {activeTasks.map((task) => {
                const dueDate = task.due_date ? new Date(task.due_date) : null;
                const daysUntilDue = dueDate
                  ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3;

                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <Circle className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                            {task.task_type === 'assignment_work'
                              ? 'Assignment'
                              : task.task_type === 'exam_build'
                              ? 'Exam Build'
                              : 'Timed Practice'}
                          </span>
                          {task.estimated_minutes && (
                            <span className="text-xs text-muted-foreground">
                              {task.estimated_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {dueDate && (
                      <div className="text-right">
                        <div
                          className={`text-sm font-medium ${
                            isOverdue
                              ? 'text-red-600 dark:text-red-400'
                              : isDueSoon
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {isOverdue
                            ? `${Math.abs(daysUntilDue!)} days overdue`
                            : `Due in ${daysUntilDue} days`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {dueDate.toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Completed Quests</CardTitle>
              <CardDescription>
                Recently completed tasks ({completedTasks?.length || 0})
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!completedTasks || completedTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No completed tasks yet
            </p>
          ) : (
            <div className="space-y-3">
              {completedTasks.map((task) => {
                const completedDate = task.completed_at
                  ? new Date(task.completed_at)
                  : null;

                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 opacity-75"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium line-through decoration-gray-400">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {task.task_type === 'assignment_work'
                              ? 'Assignment'
                              : task.task_type === 'exam_build'
                              ? 'Exam Build'
                              : 'Timed Practice'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {completedDate && (
                      <div className="text-right">
                        <div className="text-sm text-green-600 dark:text-green-400">
                          Completed
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {completedDate.toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent projects */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>
                Assignments and exams for this course
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {projects?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No projects found for this course
            </p>
          ) : (
            <div className="space-y-3">
              {projects?.map((project) => {
                const dueDate = new Date(project.due_date);
                const daysUntilDue = Math.ceil(
                  (dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                const isOverdue = daysUntilDue < 0;
                const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 7;

                return (
                  <div
                    key={project.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      {project.completed_at ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-sm font-medium ${
                          isOverdue
                            ? 'text-red-600 dark:text-red-400'
                            : isDueSoon
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {isOverdue
                          ? `${Math.abs(daysUntilDue)} days overdue`
                          : `Due in ${daysUntilDue} days`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {dueDate.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
          <CardDescription>Study and practice options</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground mb-3">
            <strong>Tip:</strong> Focus on units with mastery below 50% to improve your
            overall readiness.
          </p>
          <div className="flex gap-2">
            <Link href="/focus">
              <Button variant="outline">
                <Brain className="mr-2 h-4 w-4" />
                Start Focus Session
              </Button>
            </Link>
            <Link href="/quest-board">
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Create Task
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
