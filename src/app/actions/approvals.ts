'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { requireUser } from '@/lib/auth';
import type { ActionState } from '@/lib/forms';
import { errorMessage } from '@/lib/forms';
import { decideActivity, decideMaterial, decideNotice } from '@/lib/workflows';

const schema = z.object({
  kind: z.enum(['MATERIAL', 'NOTICE', 'ACTIVITY']),
  id: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  comment: z.string().trim().max(2000).optional(),
});

export async function decideApprovalAction(
  _state: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    kind: formData.get('kind'),
    id: formData.get('id'),
    decision: formData.get('decision'),
    comment: formData.get('comment') ?? '',
  });
  if (!parsed.success) return { ok: false, error: 'Invalid approval request.' };

  const { kind, id, decision, comment = '' } = parsed.data;
  if (decision === 'reject' && !comment) {
    return { ok: false, error: 'Add a short note explaining the rejection.' };
  }

  try {
    let warning: string | undefined;
    if (kind === 'MATERIAL') await decideMaterial(user, id, decision, comment);
    if (kind === 'NOTICE') warning = (await decideNotice(user, id, decision, comment)).warning;
    if (kind === 'ACTIVITY') warning = (await decideActivity(user, id, decision, comment)).warning;

    revalidatePath('/approvals');
    revalidatePath('/dashboard');
    revalidatePath('/admin');
    revalidatePath('/display/classroom');
    revalidatePath('/display/operations');
    revalidatePath('/display/activities');
    revalidatePath('/teaching');
    revalidatePath(`/teaching/${id}`);
    revalidatePath('/notices');
    revalidatePath(`/notices/${id}`);
    revalidatePath('/activities');
    revalidatePath(`/activities/${id}`);
    return {
      ok: true,
      message: decision === 'approve' ? 'Approved.' : 'Rejected.',
      warning,
    };
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }
}
