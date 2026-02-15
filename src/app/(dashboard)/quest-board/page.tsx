import { createClient } from '@/lib/supabase/server';
import { CreateTaskDialog } from '@/components/quest-board/create-task-dialog';
import { TaskCard } from '@/components/quest-board/task-card';
import { GeneratePlanButton } from '@/components/quest-board/generate-plan-button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getTodaysPlan } from '@/actions/planner';
import { Sparkles } from 'lucide-react';

export default async function QuestBoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch user's courses using Supabase
  const { data: userCourses } = await supabase
    .from('courses')
    .select('id, name, color')
    .eq('user_id', user.id);

  // Try to get today's plan first
  const todaysPlanResult = await getTodaysPlan();
  const hasPlan = todaysPlanResult.success && todaysPlanResult.plan;

  let dueSoonTasks: any[] = [];
  let examBuildTasks: any[] = [];
  let timedPracticeTasks: any[] = [];
  let allTaskCount = 0;

  if (hasPlan && todaysPlanResult.plan) {
    // Use the AI-generated plan
    const plan = todaysPlanResult.plan;

    // Enrich plan tasks with course information
    const enrichTask = (task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      taskType: task.task_type,
      dueDate: task.due_date ? new Date(task.due_date) : null,
      estimatedMinutes: task.estimated_minutes,
      status: task.status,
      courseId: task.course_id,
      course: task.course_id
        ? (userCourses || []).find((c) => c.id === task.course_id) || null
        : null,
    });

    dueSoonTasks = (plan.lanes.find((l) => l.name === 'due_soon')?.tasks || []).map(enrichTask);
    examBuildTasks = (plan.lanes.find((l) => l.name === 'exam_build')?.tasks || []).map(enrichTask);
    timedPracticeTasks = (plan.lanes.find((l) => l.name === 'timed_practice')?.tasks || []).map(enrichTask);

    allTaskCount = dueSoonTasks.length + examBuildTasks.length + timedPracticeTasks.length;
  } else {
    // Fallback: Simple filtering (no plan generated yet)
    const { data: allTasks } = await supabase
      .from('tasks')
      .select('id, title, description, task_type, due_date, estimated_minutes, status, course_id')
      .eq('user_id', user.id)
      .in('status', ['todo', 'in_progress'])
      .order('due_date', { ascending: true });

    const enrichedTasks = (allTasks || []).map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      taskType: task.task_type,
      dueDate: task.due_date ? new Date(task.due_date) : null,
      estimatedMinutes: task.estimated_minutes,
      status: task.status,
      courseId: task.course_id,
      course: task.course_id
        ? (userCourses || []).find((c) => c.id === task.course_id) || null
        : null,
    }));

    allTaskCount = enrichedTasks.length;

    // Simple lane allocation based on task type
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);

    const dueSoonFiltered = enrichedTasks.filter(
      (task) =>
        task.taskType === 'assignment_work' && task.dueDate && task.dueDate <= threeDaysFromNow
    );

    examBuildTasks = enrichedTasks.filter((task) => task.taskType === 'exam_build');
    timedPracticeTasks = enrichedTasks.filter((task) => task.taskType === 'timed_practice');

    // Any remaining tasks go to Due Soon
    const remainingTasks = enrichedTasks.filter(
      (task) =>
        !dueSoonFiltered.includes(task) &&
        !examBuildTasks.includes(task) &&
        !timedPracticeTasks.includes(task)
    );

    dueSoonTasks = [...dueSoonFiltered, ...remainingTasks];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quest Board</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Today&apos;s study quests • {allTaskCount} active
          </p>
        </div>
        <div className="flex gap-3">
          <GeneratePlanButton />
          <CreateTaskDialog courses={userCourses || []} />
        </div>
      </div>

      {/* Plan Status Banner */}
      {!hasPlan && allTaskCount > 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-purple-200 dark:bg-purple-800 rounded-full p-2">
                  <Sparkles className="h-5 w-5 text-purple-700 dark:text-purple-200" />
                </div>
                <div>
                  <p className="font-semibold text-sm">
                    Generate an AI-optimized plan for today
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Our planner considers urgency, unit mastery, and spaced repetition to prioritize
                    your tasks
                  </p>
                </div>
              </div>
              <GeneratePlanButton />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3-Lane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lane 1: Due Soon */}
        <div className="space-y-4">
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="text-blue-900 dark:text-blue-100">Due Soon</CardTitle>
              <CardDescription className="text-blue-700 dark:text-blue-300">
                {dueSoonTasks.length} quests • 60-70% of your time
              </CardDescription>
            </CardHeader>
          </Card>

          {dueSoonTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No urgent tasks right now!</p>
                <p className="text-xs mt-1">Create some quests to get started</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {dueSoonTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Lane 2: Exam Build */}
        <div className="space-y-4">
          <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="text-purple-900 dark:text-purple-100">Exam Build</CardTitle>
              <CardDescription className="text-purple-700 dark:text-purple-300">
                {examBuildTasks.length} quests • 20-30% of your time
              </CardDescription>
            </CardHeader>
          </Card>

          {examBuildTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No exam build tasks yet</p>
                <p className="text-xs mt-1">Add practice tasks to strengthen weak areas</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {examBuildTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Lane 3: Timed Practice */}
        <div className="space-y-4">
          <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="text-orange-900 dark:text-orange-100">
                Timed Practice
              </CardTitle>
              <CardDescription className="text-orange-700 dark:text-orange-300">
                {timedPracticeTasks.length} quests • 0-20% of your time
              </CardDescription>
            </CardHeader>
          </Card>

          {timedPracticeTasks.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p className="text-sm">No timed practice scheduled</p>
                <p className="text-xs mt-1">Full exam simulations appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {timedPracticeTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      {allTaskCount === 0 && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle>Get Started with Your First Quest!</CardTitle>
            <CardDescription>
              Click &quot;New Quest&quot; above to create your first study task. Here&apos;s what
              you can do:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">Assignment Work</p>
                <p className="text-xs text-muted-foreground">
                  Homework, projects, and assignments with deadlines
                </p>
              </div>
              <div>
                <p className="font-semibold text-purple-900 dark:text-purple-100">Exam Build</p>
                <p className="text-xs text-muted-foreground">
                  Practice problems and drills to strengthen weak units
                </p>
              </div>
              <div>
                <p className="font-semibold text-orange-900 dark:text-orange-100">
                  Timed Practice
                </p>
                <p className="text-xs text-muted-foreground">
                  Full exam simulations under timed conditions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
