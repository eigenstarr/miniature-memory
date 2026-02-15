import { createClient } from '@/lib/supabase/server';
import { FocusPageClient } from './focus-page-client';

export default async function FocusPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Fetch incomplete tasks for selection
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, task_type, course_id')
    .eq('user_id', user.id)
    .in('status', ['todo', 'in_progress'])
    .order('due_date', { ascending: true })
    .limit(20);

  // Fetch courses for context
  const { data: courses } = await supabase
    .from('courses')
    .select('id, name, color')
    .eq('user_id', user.id);

  // Enrich tasks with course info
  const enrichedTasks = (tasks || []).map((task) => ({
    id: task.id,
    title: task.title,
    taskType: task.task_type,
    course: task.course_id
      ? (courses || []).find((c) => c.id === task.course_id) || null
      : null,
  }));

  return <FocusPageClient tasks={enrichedTasks} />;
}
