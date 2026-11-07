'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';

import { createSession, destroySession, verifyCredentials } from '@/lib/auth';
import type { ActionState } from '@/lib/forms';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
  next: z.string().optional(),
});

export async function loginAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = schema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check your details' };
  }

  const user = await verifyCredentials(parsed.data.email, parsed.data.password);
  if (!user) {
    return { ok: false, error: 'Email or password is incorrect.' };
  }

  await createSession(user);
  const next = parsed.data.next;
  redirect(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard');
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect('/login');
}
