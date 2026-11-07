import 'server-only';

import type { Activity, Notice, Role, TeachingMaterial, User } from '@prisma/client';

import { postApprovalCard } from './approval-card';
import { prisma } from './db';
import { canCreate, canReview } from './roles';
import { askAgent, postAsAgent } from './switch';

type Actor = Pick<User, 'id' | 'name' | 'role'>;
type Decision = 'approve' | 'reject';

function assertUsableReply(body: string): void {
  const text = body.trim();
  if (text.length < 40 || text.startsWith('I could not generate a response')) {
    throw new Error(
      'The agent could not draft this. Check the agent log or retry; nothing was saved.'
    );
  }
}

function requirePermission(allowed: boolean, message: string): void {
  if (!allowed) throw new Error(message);
}

function isOwnerOrAdmin(actor: Actor, ownerId: string): boolean {
  return actor.id === ownerId || actor.role === 'ADMIN';
}

async function pendingMaterial(actor: Actor, id: string): Promise<TeachingMaterial> {
  requirePermission(
    canReview(actor.role as Role, 'MATERIAL'),
    'Only a teacher can review teaching material.'
  );
  const material = await prisma.teachingMaterial.findUnique({ where: { id } });
  if (!material) throw new Error('Teaching material not found.');
  if (material.status !== 'PENDING_APPROVAL') {
    throw new Error('This material is not waiting for approval.');
  }
  if (!material.content.trim()) throw new Error('Generate the material before approving it.');
  return material;
}

export async function generateMaterial(
  actor: Actor,
  id: string
): Promise<{ material: TeachingMaterial; warning?: string }> {
  requirePermission(
    canCreate(actor.role as Role, 'MATERIAL'),
    'Only a teacher can generate teaching material.'
  );
  const material = await prisma.teachingMaterial.findUnique({ where: { id } });
  if (!material) throw new Error('Teaching material not found.');
  if (!isOwnerOrAdmin(actor, material.authorId)) {
    throw new Error('You can only generate your own material.');
  }
  if (material.status === 'APPROVED') {
    throw new Error('Approved material cannot be regenerated. Create a new draft instead.');
  }

  const prompt = [
    `Create a classroom-ready worksheet titled "${material.title}".`,
    `Subject: ${material.subject}. Grade: ${material.gradeLevel}.`,
    `Teacher brief: ${material.prompt}`,
    'Return only the worksheet in Markdown: a one-line learning goal, the questions, and a clearly separated answer key.',
    'Do not mention Switch, tools, agents, or your process.',
  ].join(' ');

  const { reply } = await askAgent('classroom', prompt);
  assertUsableReply(reply.body);

  const updated = await prisma.teachingMaterial.update({
    where: { id },
    data: {
      content: reply.body.trim(),
      status: 'PENDING_APPROVAL',
      switchRoomId: reply.roomId,
      agentReplySeq: reply.seq,
      approvedById: null,
      approvedAt: null,
    },
  });

  await prisma.approval.upsert({
    where: { kind_entityId: { kind: 'MATERIAL', entityId: id } },
    create: {
      kind: 'MATERIAL',
      entityId: id,
      entityTitle: updated.title,
      requesterId: actor.id,
      status: 'PENDING_APPROVAL',
    },
    update: {
      entityTitle: updated.title,
      requesterId: actor.id,
      status: 'PENDING_APPROVAL',
      reviewerId: null,
      comment: null,
      decidedAt: null,
    },
  });

  const card = await postApprovalCard(
    'MATERIAL',
    updated.id,
    updated.title,
    `${updated.subject} · ${updated.gradeLevel} · requested by ${actor.name}`
  );

  return { material: updated, warning: card.warning };
}

export async function decideMaterial(
  actor: Actor,
  id: string,
  decision: Decision,
  comment: string
): Promise<TeachingMaterial> {
  const material = await pendingMaterial(actor, id);
  const approved = decision === 'approve';

  const updated = await prisma.teachingMaterial.update({
    where: { id: material.id },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      approvedById: approved ? actor.id : null,
      approvedAt: approved ? new Date() : null,
    },
  });

  await prisma.approval.update({
    where: { kind_entityId: { kind: 'MATERIAL', entityId: id } },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      reviewerId: actor.id,
      comment: comment || null,
      decidedAt: new Date(),
    },
  });

  return updated;
}

export async function generateNotice(
  actor: Actor,
  id: string
): Promise<{ notice: Notice; warning?: string }> {
  requirePermission(
    canCreate(actor.role as Role, 'NOTICE'),
    'Only the principal can prepare school notices.'
  );
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) throw new Error('Notice not found.');
  if (!isOwnerOrAdmin(actor, notice.authorId)) {
    throw new Error('You can only generate your own notices.');
  }
  if (notice.status === 'APPROVED') {
    throw new Error('Approved notices cannot be regenerated. Create a new draft instead.');
  }

  const prompt = [
    `Write a school notice titled "${notice.title}" for ${notice.audience.toLowerCase()} families and staff.`,
    `Brief: ${notice.brief}`,
    'Write in warm, plain language, ready to send. Return only the notice text, with a greeting and a sign-off.',
    'Do not mention Switch, tools, agents, or your process.',
  ].join(' ');

  const { reply } = await askAgent('operations', prompt);
  assertUsableReply(reply.body);

  const updated = await prisma.notice.update({
    where: { id },
    data: {
      body: reply.body.trim(),
      status: 'PENDING_APPROVAL',
      switchRoomId: reply.roomId,
      approvedById: null,
      approvedAt: null,
      publishedAt: null,
    },
  });

  await prisma.approval.upsert({
    where: { kind_entityId: { kind: 'NOTICE', entityId: id } },
    create: {
      kind: 'NOTICE',
      entityId: id,
      entityTitle: updated.title,
      requesterId: actor.id,
      status: 'PENDING_APPROVAL',
    },
    update: {
      entityTitle: updated.title,
      requesterId: actor.id,
      status: 'PENDING_APPROVAL',
      reviewerId: null,
      comment: null,
      decidedAt: null,
    },
  });

  const card = await postApprovalCard(
    'NOTICE',
    updated.id,
    updated.title,
    `${notice.audience.toLowerCase()} audience · requested by ${actor.name}`
  );

  return { notice: updated, warning: card.warning };
}

async function distribute(notice: Notice): Promise<Notice> {
  requirePermission(notice.status === 'APPROVED', 'Only an approved notice can be distributed.');
  const audience =
    notice.audience === 'ALL'
      ? 'Whole school'
      : notice.audience === 'STUDENTS'
        ? 'Students'
        : notice.audience === 'PARENTS'
          ? 'Parents and guardians'
          : 'Staff';

  await postAsAgent(
    'operations',
    [`School notice: ${notice.title}`, `Audience: ${audience}`, '', notice.body].join('\n')
  );

  return prisma.notice.update({
    where: { id: notice.id },
    data: { publishedAt: new Date(), switchRoomId: notice.switchRoomId },
  });
}

export async function decideNotice(
  actor: Actor,
  id: string,
  decision: Decision,
  comment: string
): Promise<{ notice: Notice; warning?: string }> {
  requirePermission(
    canReview(actor.role as Role, 'NOTICE'),
    'Only the principal can approve school notices.'
  );
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) throw new Error('Notice not found.');
  if (notice.status !== 'PENDING_APPROVAL') {
    throw new Error('This notice is not waiting for approval.');
  }
  if (!notice.body.trim()) throw new Error('Generate the notice before approving it.');

  const approved = decision === 'approve';
  const updated = await prisma.notice.update({
    where: { id },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      approvedById: approved ? actor.id : null,
      approvedAt: approved ? new Date() : null,
    },
  });

  await prisma.approval.update({
    where: { kind_entityId: { kind: 'NOTICE', entityId: id } },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      reviewerId: actor.id,
      comment: comment || null,
      decidedAt: new Date(),
    },
  });

  if (!approved) return { notice: updated };

  try {
    return { notice: await distribute(updated) };
  } catch (error) {
    return {
      notice: updated,
      warning: `Approved, but distribution failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }. Retry with "Distribute now".`,
    };
  }
}

export async function redistributeNotice(actor: Actor, id: string): Promise<Notice> {
  requirePermission(
    canReview(actor.role as Role, 'NOTICE'),
    'Only the principal can distribute school notices.'
  );
  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) throw new Error('Notice not found.');
  return distribute(notice);
}

export async function generateActivity(
  actor: Actor,
  id: string
): Promise<{ activity: Activity; warning?: string }> {
  requirePermission(
    canCreate(actor.role as Role, 'ACTIVITY'),
    'Only the activities coordinator can plan activities.'
  );
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) throw new Error('Activity not found.');
  if (!isOwnerOrAdmin(actor, activity.authorId)) {
    throw new Error('You can only generate your own activities.');
  }
  if (activity.status === 'APPROVED') {
    throw new Error('Approved activities cannot be regenerated. Create a new draft instead.');
  }

  const prompt = [
    `Write a practical activity plan for "${activity.title}" on ${activity.eventDate.toDateString()} at ${activity.location}.`,
    `Description: ${activity.description}`,
    'Include a timed run sheet, the materials needed, and the staff roles. Keep it to one page of Markdown.',
    'Do not mention Switch, tools, agents, or your process.',
  ].join(' ');

  const { reply } = await askAgent('activities', prompt);
  assertUsableReply(reply.body);

  const updated = await prisma.activity.update({
    where: { id },
    data: {
      plan: reply.body.trim(),
      status: 'PENDING_APPROVAL',
      switchRoomId: reply.roomId,
      agentReplySeq: reply.seq,
      approvedById: null,
      approvedAt: null,
    },
  });

  await prisma.approval.upsert({
    where: { kind_entityId: { kind: 'ACTIVITY', entityId: id } },
    create: {
      kind: 'ACTIVITY',
      entityId: id,
      entityTitle: updated.title,
      requesterId: actor.id,
      status: 'PENDING_APPROVAL',
    },
    update: {
      entityTitle: updated.title,
      requesterId: actor.id,
      status: 'PENDING_APPROVAL',
      reviewerId: null,
      comment: null,
      decidedAt: null,
    },
  });

  const card = await postApprovalCard(
    'ACTIVITY',
    updated.id,
    updated.title,
    `${updated.eventDate.toDateString()} · ${updated.location} · requested by ${actor.name}`
  );

  return { activity: updated, warning: card.warning };
}

export async function announceActivity(activity: Activity): Promise<void> {
  requirePermission(activity.status === 'APPROVED', 'Only an approved activity can be announced.');
  await postAsAgent(
    'activities',
    [`Approved activity: ${activity.title}`, `${activity.eventDate.toDateString()} · ${activity.location}`, '', activity.plan].join('\n')
  );
}

export async function decideActivity(
  actor: Actor,
  id: string,
  decision: Decision,
  comment: string
): Promise<{ activity: Activity; warning?: string }> {
  requirePermission(
    canReview(actor.role as Role, 'ACTIVITY'),
    'Only the activities coordinator can approve activities.'
  );
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) throw new Error('Activity not found.');
  if (activity.status !== 'PENDING_APPROVAL') {
    throw new Error('This activity is not waiting for approval.');
  }
  if (!activity.plan.trim()) throw new Error('Generate the activity plan before approving it.');

  const approved = decision === 'approve';
  const updated = await prisma.activity.update({
    where: { id },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      approvedById: approved ? actor.id : null,
      approvedAt: approved ? new Date() : null,
    },
  });

  await prisma.approval.update({
    where: { kind_entityId: { kind: 'ACTIVITY', entityId: id } },
    data: {
      status: approved ? 'APPROVED' : 'REJECTED',
      reviewerId: actor.id,
      comment: comment || null,
      decidedAt: new Date(),
    },
  });

  if (!approved) return { activity: updated };

  try {
    await announceActivity(updated);
    return { activity: updated };
  } catch (error) {
    return {
      activity: updated,
      warning: `Approved, but the announcement failed: ${
        error instanceof Error ? error.message : 'unknown error'
      }. Retry with "Announce again".`,
    };
  }
}
