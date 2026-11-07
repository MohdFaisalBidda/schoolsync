'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireRole, requireUser } from '@/lib/auth';
import type { ActionState } from '@/lib/forms';
import { errorMessage } from '@/lib/forms';
import { decideMaterial, generateMaterial } from '@/lib/workflows';

const createSchema = z.object({
  title: z.string().trim().min(3, 'Give the material a title'),
  subject: z.string().trim().min(2, 'Choose a subject'),
  gradeLevel: z.string().trim().min(2, 'Choose a grade'),
  prompt: z.string().trim().min(10, 'Describe what the agent should prepare'),
});

const idSchema = z.object({ id: z.string().uuid() });

export async function createMaterialAction(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireRole('TEACHER', 'ADMIN');
  const parsed = createSchema.safeParse({
    title: formData.get('title'),
    subject: formData.get('subject'),
    gradeLevel: formData.get('gradeLevel'),
    prompt: formData.get('prompt'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Check the form' };
  }

  const material = await prismaCreate(user.id, parsed.data);
  revalidatePath('/teaching');
  redirect(`/teaching/${material.id}`);
}

async function prismaCreate(
  authorId: string,
  data: z.infer<typeof createSchema>
): Promise<{ id: string }> {
  const { prisma } = await import('@/lib/db');
  return prisma.teachingMaterial.create({
    data: {
      title: data.title,
      subject: data.subject,
      gradeLevel: data.gradeLevel,
      prompt: data.prompt,
      authorId,
    },
    select: { id: true },
  });
}

export async function generateMaterialAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  if (!parsed.success) return { ok: false, error: 'Invalid material.' };
  try {
    const result = await generateMaterial(user, parsed.data.id);
    revalidatePath('/teaching');
    revalidatePath(`/teaching/${parsed.data.id}`);
    revalidatePath('/approvals');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/display/classroom');
    revalidatePath('/display/operations');
    revalidatePath('/display/activities');
    return {
      ok: true,
      message: 'The teaching agent drafted this material. Review it below.',
      warning: result.warning,
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}

export async function decideMaterialAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = idSchema.safeParse({ id: formData.get('id') });
  const decision = formData.get('decision');
  const comment = String(formData.get('comment') ?? '').trim();
  if (!parsed.success) return { ok: false, error: 'Invalid material.' };
  if (decision !== 'approve' && decision !== 'reject') {
    return { ok: false, error: 'Choose approve or reject.' };
  }
  if (decision === 'reject' && !comment) {
    return { ok: false, error: 'Add a short note explaining the rejection.' };
  }

  try {
    await decideMaterial(user, parsed.data.id, decision, comment);
    revalidatePath('/teaching');
    revalidatePath(`/teaching/${parsed.data.id}`);
    revalidatePath('/approvals');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/display/classroom');
    revalidatePath('/display/operations');
    revalidatePath('/display/activities');
    return {
      ok: true,
      message: decision === 'approve' ? 'Approved and available to students.' : 'Sent back to the teacher.',
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
