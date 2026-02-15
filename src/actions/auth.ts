'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function login(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/quest-board');
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { data: authData, error } = await supabase.auth.signUp(data);

  if (error) {
    return { error: error.message };
  }

  // Check if email confirmation is required
  if (authData.user && !authData.user.confirmed_at && authData.user.identities?.length === 0) {
    return {
      error: 'Please check your email to confirm your account before signing in.',
    };
  }

  // Create user profile in our database using Supabase
  if (authData.user) {
    try {
      await supabase.from('users').insert({
        id: authData.user.id,
        email: authData.user.email!,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error creating user profile:', err);
    }
  }

  revalidatePath('/', 'layout');
  redirect('/onboarding/profile');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
