import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatusPill } from '@/components/status-pill';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/date';
import { prisma } from '@/lib/db';
import { canCreate } from '@/lib/roles';
import type { ContentStatus } from '@prisma/client';

const FILTERS: { key: string; label: string; statuses?: ContentStatus[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts', statuses: ['DRAFT'] },
  { key: 'pending', label: 'Awaiting approval', statuses: ['PENDING_APPROVAL'] },
  { key: 'approved', label: 'Approved', statuses: ['APPROVED'] },
  { key: 'rejected', label: 'Rejected', statuses: ['REJECTED'] },
];

export default async function TeachingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const { status: statusKey = 'all' } = await searchParams;
  const isLearner = user.role === 'STUDENT' || user.role === 'PARENT';
  const canAdd = canCreate(user.role, 'MATERIAL');
  const filter = isLearner ? FILTERS.find((item) => item.key === 'approved') : FILTERS.find((item) => item.key === statusKey);

  const materials = await prisma.teachingMaterial.findMany({
    where: {
      ...(isLearner
        ? { status: 'APPROVED' as const, ...(user.gradeLevel ? { gradeLevel: user.gradeLevel } : {}) }
        : filter?.statuses
          ? { status: { in: filter.statuses } }
          : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: { author: { select: { name: true } } },
  });

  const learners = isLearner ? await prisma.teachingMaterial.count({
    where: { status: 'APPROVED', ...(user.gradeLevel ? { gradeLevel: user.gradeLevel } : {}) },
  }) : 0;

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow={isLearner ? 'Learning library' : 'Teaching studio'}
        title={isLearner ? 'Worksheets' : 'Teaching materials'}
        subtitle={
          isLearner
            ? `Approved material for ${user.gradeLevel ?? 'your class'}, prepared with a teaching agent and reviewed by a teacher.`
            : 'Ask the teaching agent for a first draft, review it, then publish it to students. Nothing reaches a classroom without approval.'
        }
        actions={
          canAdd ? (
            <Link href="/teaching/new" className="btn-primary">
              <Plus className="h-4 w-4" />
              New material
            </Link>
          ) : null
        }
      />

      {!isLearner ? (
        <div className="mb-5 flex flex-wrap gap-1.5">
          {FILTERS.map((item) => {
            const active = (filter?.key ?? 'all') === item.key;
            return (
              <Link
                key={item.key}
                href={item.key === 'all' ? '/teaching' : `/teaching?status=${item.key}`}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? 'bg-forest text-paper'
                    : 'border border-line bg-card text-ink-soft hover:border-moss/40 hover:text-ink'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}

      {materials.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={isLearner ? 'No approved worksheets yet' : 'No material here yet'}
          body={
            isLearner
              ? 'When a teacher approves a worksheet, it will appear here for your class.'
              : 'Start a draft, tell the agent what you need, and review the result before it is published.'
          }
          action={
            canAdd ? (
              <Link href="/teaching/new" className="btn-primary">
                <Plus className="h-4 w-4" />
                New material
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {materials.map((material) => (
            <Link
              key={material.id}
              href={`/teaching/${material.id}`}
              className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-moss/40"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest/8 text-forest">
                  <Sparkles className="h-4 w-4" />
                </span>
                <StatusPill status={material.status} />
              </div>
              <h2 className="mt-4 text-lg leading-snug text-ink group-hover:text-forest">
                {material.title}
              </h2>
              <p className="mt-1 text-xs text-ink-soft/75">
                {material.subject} · {material.gradeLevel}
              </p>
              <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-[11px] text-ink-soft/60">
                <span>{material.author.name}</span>
                <span>{formatDate(material.updatedAt)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {isLearner ? (
        <p className="mt-6 text-center text-xs text-ink-soft/60">
          {learners} approved {learners === 1 ? 'worksheet' : 'worksheets'} in your library.
        </p>
      ) : null}
    </div>
  );
}
