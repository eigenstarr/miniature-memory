'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { apCourseTemplates } from '../../drizzle/seed/ap-courses';

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const displayName = formData.get('displayName') as string;
  const grade = parseInt(formData.get('grade') as string);
  const targetStudyMinutesPerDay = parseInt(
    formData.get('targetStudyMinutesPerDay') as string
  );

  // Update user profile using Supabase
  await supabase
    .from('users')
    .update({
      display_name: displayName,
      grade: grade,
      target_study_minutes_per_day: targetStudyMinutesPerDay,
    })
    .eq('id', user.id);

  redirect('/onboarding/courses');
}

export async function createUserCourses(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get selected courses from form (format: courseCode_examDate_targetScore)
  const selectedCourses = formData.getAll('courses') as string[];

  if (selectedCourses.length === 0) {
    throw new Error('Please select at least one course');
  }

  // Parse and create courses
  for (const courseData of selectedCourses) {
    const [courseCode, examDate, targetScore] = courseData.split('_');
    const template = apCourseTemplates.find((c) => c.code === courseCode);

    if (!template) continue;

    // Create course using Supabase
    const { data: newCourse, error: courseError } = await supabase
      .from('courses')
      .insert({
        user_id: user.id,
        name: template.name,
        ap_course_code: template.code,
        exam_date: examDate,
        target_score: parseInt(targetScore),
        color: template.color,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (courseError || !newCourse) {
      console.error('Error creating course:', courseError);
      continue;
    }

    // Create course units from template
    const unitsToInsert = template.units.map((unit) => ({
      course_id: newCourse.id,
      unit_number: unit.number,
      unit_name: unit.name,
      topics: unit.topics,
      mastery_score: 0,
      last_studied_at: null,
      created_at: new Date().toISOString(),
    }));

    await supabase.from('course_units').insert(unitsToInsert);
  }

  redirect('/onboarding/complete');
}

export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // First check if user exists in our database
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (!existingUser) {
    // User doesn't exist in our database, create them
    await supabase.from('users').insert({
      id: user.id,
      email: user.email!,
      created_at: new Date().toISOString(),
    });
  }

  // Mark user as onboarded using Supabase
  const { error } = await supabase
    .from('users')
    .update({
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    console.error('Error completing onboarding:', error);
    throw new Error('Failed to complete onboarding');
  }

  // Clear cache before redirecting
  revalidatePath('/', 'layout');
  redirect('/quest-board');
}
