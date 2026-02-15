'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

// ============================================
// PROJECT ACTIONS
// ============================================

export async function createProject(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const name = formData.get('name') as string;
  const courseId = formData.get('courseId') as string;
  const dueDate = formData.get('dueDate') as string;
  const weight = formData.get('weight') as string;

  try {
    await supabase.from('projects').insert({
      user_id: user.id,
      course_id: courseId || null,
      name,
      due_date: dueDate || null,
      weight: weight ? parseFloat(weight) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    revalidatePath('/quest-board');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateProject(projectId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const name = formData.get('name') as string;
  const dueDate = formData.get('dueDate') as string;
  const weight = formData.get('weight') as string;

  try {
    await supabase
      .from('projects')
      .update({
        name,
        due_date: dueDate || null,
        weight: weight ? parseFloat(weight) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('user_id', user.id);

    revalidatePath('/quest-board');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', user.id);

    revalidatePath('/quest-board');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

// ============================================
// TASK ACTIONS
// ============================================

export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const courseId = formData.get('courseId') as string;
  const courseUnitId = formData.get('courseUnitId') as string;
  const projectId = formData.get('projectId') as string;
  const taskType = formData.get('taskType') as string;
  const dueDate = formData.get('dueDate') as string;
  const estimatedMinutes = formData.get('estimatedMinutes') as string;

  try {
    const { data, error } = await supabase.from('tasks').insert({
      user_id: user.id,
      course_id: courseId || null,
      course_unit_id: courseUnitId || null,
      project_id: projectId || null,
      title,
      description: description || null,
      task_type: taskType || 'assignment_work',
      due_date: dueDate || null,
      estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
      status: 'todo',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Supabase error creating task:', error);
      return { error: error.message };
    }

    revalidatePath('/quest-board');
    return { success: true };
  } catch (error: any) {
    console.error('Error creating task:', error);
    return { error: error.message };
  }
}

export async function updateTask(taskId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const dueDate = formData.get('dueDate') as string;
  const estimatedMinutes = formData.get('estimatedMinutes') as string;
  const status = formData.get('status') as string;

  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        title,
        description: description || null,
        due_date: dueDate || null,
        estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
        status: status || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Supabase error updating task:', error);
      return { error: error.message };
    }

    revalidatePath('/quest-board');
    return { success: true };
  } catch (error: any) {
    console.error('Error updating task:', error);
    return { error: error.message };
  }
}

export async function completeTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Supabase error completing task:', error);
      return { error: error.message };
    }

    revalidatePath('/quest-board');
    return { success: true };
  } catch (error: any) {
    console.error('Error completing task:', error);
    return { error: error.message };
  }
}

export async function uncompleteTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    await supabase
      .from('tasks')
      .update({
        status: 'todo',
        completed_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .eq('user_id', user.id);

    revalidatePath('/quest-board');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  try {
    await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', user.id);

    revalidatePath('/quest-board');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
