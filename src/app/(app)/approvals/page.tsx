import Link from 'next/link';
import { Check, ClipboardCheck, Clock, X } from 'lucide-react';

import { decideApprovalAction } from '@/app/actions/approvals';
import { ActionButton } from '@/components/action-button';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatusPill } from '@/components/status-pill';
import { requireRole } from '@/lib/auth';
import { formatDate, relativeTime } from '@/lib/date';
import { prisma } from '@/lib/db';
import { KIND_LABELS, reviewKinds } from '@/lib/roles';

function hrefFor(kind: 'MATERIAL' | 'NOTICE' | 'ACTIVITY', id: string): string {
  if (kind === 'MATERIAL') return `/teaching/${id}`;
  if (kind === 'NOTICE') return `/notices/${id}`;
  return `/activities/${id}`;
}

export default async function ApprovalsPage() {
  const user = await requireRole('TEACHER', 'COORDINATOR', 'PRINCIPAL', 'ADMIN');
  const kinds = reviewKinds(user.role);

  const [pending, history] = await Promise.all([
    prisma.approval.findMany({
      where: { status: 'PENDING_APPROVAL', kind: { in: kinds } },
      orderBy: { createdAt: 'asc' },
      include: { requester: { select: { name: true } } },
    }),
    prisma.approval.findMany({
      where: { status: { in: ['APPROVED', 'REJECTED'] }, kind: { in: kinds } },
      orderBy: { decidedAt: 'desc' },
      take: 12,
      include: {
        requester: { select: { name: true } },
        reviewer: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Human in the loop"
        title="Approvals"
        subtitle="Every agent draft stops here until a person with the right role signs it off. Approvals are recorded with the reviewer and any note."
      />

      <div className="mb-6 flex items-center gap-3 rounded-2xl border border-forest/15 bg-forest/[0.04] px-4 py-3 text-xs leading-5 text-forest">
        <ClipboardCheck className="h-4 w-4 shrink-0" />
        You can review {kinds.map((kind) => KIND_LABELS[kind].toLowerCase()).join(', ')}.
      </div>

      {pending.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="All clear"
          body="Nothing is waiting for your signature right now. New agent drafts will appear here."
        />
      ) : (
        <div className="space-y-4">
          {pending.map((approval) => (
            <article key={approval.id} className="card overflow-hidden">
              <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-amber uppercase">
                      {KIND_LABELS[approval.kind]}
                    </span>
                    <span className="text-[11px] text-ink-soft/60">
                      {relativeTime(approval.createdAt)}
                    </span>
                  </div>
                  <Link
                    href={hrefFor(approval.kind, approval.entityId)}
                    className="mt-2 block text-lg font-semibold text-ink hover:text-forest"
                  >
                    {approval.entityTitle}
                  </Link>
                  <p className="mt-1 text-xs text-ink-soft/70">
                    Requested by {approval.requester.name}
                  </p>
                </div>
                <Link
                  href={hrefFor(approval.kind, approval.entityId)}
                  className="btn-secondary shrink-0"
                >
                  Open to review
                </Link>
              </div>

              <div className="grid gap-3 border-t border-line bg-paper/40 p-4 sm:grid-cols-2">
                <ActionButton
                  action={decideApprovalAction}
                  fields={{
                    kind: approval.kind,
                    id: approval.entityId,
                    decision: 'approve',
                  }}
                  label="Approve"
                  pendingLabel="Approving…"
                  icon={<Check className="h-4 w-4" />}
                >
                  <textarea
                    name="comment"
                    className="textarea mb-2 min-h-14 bg-card"
                    placeholder="Optional note for the record"
                  />
                </ActionButton>
                <ActionButton
                  action={decideApprovalAction}
                  fields={{
                    kind: approval.kind,
                    id: approval.entityId,
                    decision: 'reject',
                  }}
                  label="Send back"
                  pendingLabel="Sending…"
                  variant="secondary"
                  icon={<X className="h-4 w-4" />}
                >
                  <textarea
                    name="comment"
                    required
                    className="textarea mb-2 min-h-14 bg-card"
                    placeholder="Required: what should change?"
                  />
                </ActionButton>
              </div>
            </article>
          ))}
        </div>
      )}

      {history.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold text-ink-soft">Recent decisions</h2>
          <div className="card overflow-hidden">
            <ul className="divide-y divide-line">
              {history.map((approval) => (
                <li key={approval.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={approval.status} />
                      <span className="text-[10px] font-semibold tracking-[0.12em] text-ink-soft/50 uppercase">
                        {KIND_LABELS[approval.kind]}
                      </span>
                    </div>
                    <Link
                      href={hrefFor(approval.kind, approval.entityId)}
                      className="mt-1 block truncate text-sm font-medium text-ink hover:text-forest"
                    >
                      {approval.entityTitle}
                    </Link>
                    {approval.comment ? (
                      <p className="mt-0.5 text-xs text-ink-soft/70">“{approval.comment}”</p>
                    ) : null}
                  </div>
                  <div className="text-right text-[11px] text-ink-soft/60">
                    <p>
                      {approval.reviewer?.name ?? '—'} · {approval.status.toLowerCase()}
                    </p>
                    <p>{approval.decidedAt ? formatDate(approval.decidedAt) : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </div>
  );
}
