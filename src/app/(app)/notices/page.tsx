import Link from 'next/link';
import { Megaphone, Plus } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatusPill } from '@/components/status-pill';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/date';
import { prisma } from '@/lib/db';
import { audienceLabel, canCreate, noticeAudiencesFor } from '@/lib/roles';
import type { ContentStatus } from '@prisma/client';

const FILTERS: { key: string; label: string; statuses?: ContentStatus[] }[] = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts', statuses: ['DRAFT'] },
  { key: 'pending', label: 'Awaiting approval', statuses: ['PENDING_APPROVAL'] },
  { key: 'approved', label: 'Published', statuses: ['APPROVED'] },
];

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const { status: statusKey = 'all' } = await searchParams;
  const isLearner = user.role === 'STUDENT' || user.role === 'PARENT';
  const canAdd = canCreate(user.role, 'NOTICE');
  const filter = isLearner ? FILTERS.find((item) => item.key === 'approved') : FILTERS.find((item) => item.key === statusKey);

  const notices = await prisma.notice.findMany({
    where: {
      ...(isLearner
        ? { status: 'APPROVED' as const, audience: { in: noticeAudiencesFor(user.role) } }
        : filter?.statuses
          ? { status: { in: filter.statuses } }
          : {}),
    },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    include: { author: { select: { name: true } } },
  });

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="School office"
        title="Notices"
        subtitle={
          isLearner
            ? 'Approved notices for your family, from the school office.'
            : 'The principal drafts with an agent, approves, and distributes through Switch. Published notices reach the right audience.'
        }
        actions={
          canAdd ? (
            <Link href="/notices/new" className="btn-primary">
              <Plus className="h-4 w-4" />
              New notice
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
                href={item.key === 'all' ? '/notices' : `/notices?status=${item.key}`}
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

      {notices.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No notices yet"
          body={
            isLearner
              ? 'Approved notices for your family will appear here.'
              : 'Create a notice, ask the operations agent for a draft, then approve and distribute it.'
          }
          action={
            canAdd ? (
              <Link href="/notices/new" className="btn-primary">
                <Plus className="h-4 w-4" />
                New notice
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {notices.map((notice) => (
            <Link
              key={notice.id}
              href={`/notices/${notice.id}`}
              className="card group flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:border-moss/40 sm:flex-row sm:items-center"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber/10 text-amber">
                <Megaphone className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-ink group-hover:text-forest">
                    {notice.title}
                  </h2>
                  <StatusPill status={notice.status} />
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-ink-soft/75">
                  {notice.body || notice.brief}
                </p>
                <p className="mt-1 text-[11px] text-ink-soft/60">
                  {audienceLabel(notice.audience)} · {notice.author.name} ·{' '}
                  {notice.publishedAt
                    ? `published ${formatDate(notice.publishedAt)}`
                    : `updated ${formatDate(notice.updatedAt)}`}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
