'use server';

import { cookies } from 'next/headers';

export async function login(password: string) {
  const correctPassword = process.env.DASHBOARD_PASSWORD;
  
  if (!correctPassword) {
    return { success: false, error: 'Dashboard password not configured' };
  }

  if (password === correctPassword) {
    (await cookies()).set('dashboard_auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });
    return { success: true };
  }

  return { success: false, error: 'Invalid password' };
}

export async function logout() {
  (await cookies()).delete('dashboard_auth');
}
