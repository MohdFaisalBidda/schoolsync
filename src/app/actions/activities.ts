'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireRole, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { ActionState } from '@/lib/forms';
import { errorMessage } from '@/lib/forms';
import { announceActivity, decideActivity, generateActivity } from '@/lib/workflows';

const createSchema = z.object({
  title: z.string().trim().min(3, 'Give the activity a title'),
  description: z.string().trim().min(10, 'Describe the activity'),
  eventDate: z.coerce.date({ message: 'Choose a date' }),
  location: z.string().trim().min(2, 'Add a location'),
});

const idSchema = z.object({ id: z.string().uuid() });

export async function createActivityAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireRole('COORDINATOR', 'ADMIN');
  const parsed = createSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    eventDate: formData.get('eventDate'),
    location: formData.get('location'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form' };
  }

  const activity = await prisma.activity.create({
    data: { ...parsed.data, authorId: user.id },
    select: { id: true },
  });
  revalidatePath('/activities');
  redirect(`/activities/${activity.id}`);
}

export async function generateActivityAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return { ok: false, error: 'Invalid activity.' };
  try {
    const result = await generateActivity(user, parsed.data.id);
    revalidatePath('/activities');
    revalidatePath(`/activities/${parsed.data.id}`);
    revalidatePath('/approvals');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/display/classroom');
    revalidatePath('/display/operations');
    revalidatePath('/display/activities');
    return {
      ok: true,
      message: 'The activities agent drafted a plan.',
      warning: result.warning,
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function decideActivityAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  const decision = formData.get('decision');
  const comment = String(formData.get('comment') ?? '').trim();
  if (!parsed.success) return { ok: false, error: 'Invalid activity.' };
  if (decision !== 'approve' && decision !== 'reject') {
    return { ok: false, error: 'Choose approve or reject.' };
  }
  if (decision === 'reject' && !comment) {
    return { ok: false, error: 'Add a short note explaining the rejection.' };
  }

  try {
    const result = await decideActivity(user, parsed.data.id, decision, comment);
    revalidatePath('/activities');
    revalidatePath(`/activities/${parsed.data.id}`);
    revalidatePath('/approvals');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/display/classroom');
    revalidatePath('/display/operations');
    revalidatePath('/display/activities');
    return {
      ok: true,
      message: decision === 'approve' ? 'Approved and announced to the activities room.' : 'Activity rejected.',
      warning: result.warning,
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function announceActivityAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return { ok: false, error: 'Invalid activity.' };
  try {
    const activity = await prisma.activity.findUnique({ where: { id: parsed.data.id } });
    if (!activity) throw new Error('Activity not found.');
    if (user.role !== 'ADMIN' && user.role !== 'COORDINATOR') {
      throw new Error('Only the activities coordinator can announce activities.');
    }
    await announceActivity(activity);
    revalidatePath(`/activities/${parsed.data.id}`);
    return { ok: true, message: 'Announced in the School Activities room.' };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
