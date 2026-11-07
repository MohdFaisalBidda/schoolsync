'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireRole, requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import type { ActionState } from '@/lib/forms';
import { errorMessage } from '@/lib/forms';
import { decideNotice, generateNotice, redistributeNotice } from '@/lib/workflows';

const createSchema = z.object({
  title: z.string().trim().min(3, 'Give the notice a title'),
  brief: z.string().trim().min(10, 'Describe what the notice should say'),
  audience: z.enum(['ALL', 'STUDENTS', 'PARENTS', 'STAFF']),
});

const idSchema = z.object({ id: z.string().uuid() });

export async function createNoticeAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole('PRINCIPAL', 'ADMIN');
  const parsed = createSchema.safeParse({
    title: formData.get('title'),
    brief: formData.get('brief'),
    audience: formData.get('audience'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form' };
  }

  const notice = await prisma.notice.create({
    data: { ...parsed.data, authorId: user.id },
    select: { id: true },
  });
  revalidatePath('/notices');
  redirect(`/notices/${notice.id}`);
}

export async function generateNoticeAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return { ok: false, error: 'Invalid notice.' };
  try {
    const result = await generateNotice(user, parsed.data.id);
    revalidatePath('/notices');
    revalidatePath(`/notices/${parsed.data.id}`);
    revalidatePath('/approvals');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/display/classroom');
    revalidatePath('/display/operations');
    revalidatePath('/display/activities');
    return {
      ok: true,
      message: 'The operations agent drafted this notice.',
      warning: result.warning,
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function decideNoticeAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  const decision = formData.get('decision');
  const comment = String(formData.get('comment') ?? '').trim();
  if (!parsed.success) return { ok: false, error: 'Invalid notice.' };
  if (decision !== 'approve' && decision !== 'reject') {
    return { ok: false, error: 'Choose approve or reject.' };
  }
  if (decision === 'reject' && !comment) {
    return { ok: false, error: 'Add a short note explaining the rejection.' };
  }

  try {
    const result = await decideNotice(user, parsed.data.id, decision, comment);
    revalidatePath('/notices');
    revalidatePath(`/notices/${parsed.data.id}`);
    revalidatePath('/approvals');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/display/classroom');
    revalidatePath('/display/operations');
    revalidatePath('/display/activities');
    return {
      ok: true,
      message:
        decision === 'approve'
          ? result.notice.publishedAt
            ? 'Approved and distributed through Switch.'
            : 'Approved.'
          : 'Notice rejected.',
      warning: result.warning,
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function redistributeNoticeAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return { ok: false, error: 'Invalid notice.' };
  try {
    await redistributeNotice(user, parsed.data.id);
    revalidatePath('/notices');
    revalidatePath(`/notices/${parsed.data.id}`);
    return { ok: true, message: 'Distributed to the School Operations room in Switch.' };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
