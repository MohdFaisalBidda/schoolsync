import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  Megaphone,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

import {
  decideNoticeAction,
  generateNoticeAction,
  redistributeNoticeAction,
} from '@/app/actions/notices';
import { ActionButton } from '@/components/action-button';
import { Markdown } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { StatusPill } from '@/components/status-pill';
import { requireUser } from '@/lib/auth';
import { formatDate, relativeTime } from '@/lib/date';
import { prisma } from '@/lib/db';
import { audienceLabel, canCreate, canReview, noticeAudiencesFor } from '@/lib/roles';
import { chatUrl } from '@/lib/switch';

export default async function NoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const notice = await prisma.notice.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  });

  if (!notice) notFound();

  const isLearner = user.role === 'STUDENT' || user.role === 'PARENT';
  if (
    isLearner &&
    (notice.status !== 'APPROVED' || !noticeAudiencesFor(user.role).includes(notice.audience))
  ) {
    notFound();
  }

  const room = await prisma.switchRoom.findUnique({ where: { purpose: 'operations' } });
  const canGenerate = canCreate(user.role, 'NOTICE') && notice.status !== 'APPROVED';
  const canDecide = canReview(user.role, 'NOTICE') && notice.status === 'PENDING_APPROVAL';
  const canDistribute = canReview(user.role, 'NOTICE') && notice.status === 'APPROVED';

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow={`${audienceLabel(notice.audience)} · school office`}
        title={notice.title}
        subtitle={`Prepared by ${notice.author.name} · updated ${relativeTime(notice.updatedAt)}`}
        backHref="/notices"
        backLabel="Back to notices"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <section className="card p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <p className="eyebrow">Notice</p>
            <StatusPill status={notice.status} />
          </div>
          {notice.body ? (
            <Markdown>{notice.body}</Markdown>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-6">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber/10 text-amber">
                <Megaphone className="h-4 w-4" />
              </span>
              <h2 className="text-lg text-ink">No draft yet</h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-ink-soft">
                The operations agent will write this notice from the brief. It stays hidden until the
                principal approves it.
              </p>
              <p className="mt-4 rounded-xl bg-card p-3 text-xs leading-5 text-ink-soft">
                <span className="font-semibold text-ink">Brief:</span> {notice.brief}
              </p>
            </div>
          )}
          {notice.body ? (
            <details className="mt-6 border-t border-line pt-4">
              <summary className="cursor-pointer text-xs font-semibold text-ink-soft hover:text-forest">
                View the original brief
              </summary>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{notice.brief}</p>
            </details>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <p className="eyebrow mb-3">Status</p>
            <StatusPill status={notice.status} />
            <dl className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft/65">Audience</dt>
                <dd className="font-medium text-ink">{audienceLabel(notice.audience)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft/65">Author</dt>
                <dd className="font-medium text-ink">{notice.author.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft/65">Created</dt>
                <dd className="font-medium text-ink">{formatDate(notice.createdAt)}</dd>
              </div>
              {notice.approvedAt ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft/65">Approved</dt>
                  <dd className="font-medium text-ink">{formatDate(notice.approvedAt)}</dd>
                </div>
              ) : null}
              {notice.publishedAt ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft/65">Distributed</dt>
                  <dd className="font-medium text-ink">{formatDate(notice.publishedAt)}</dd>
                </div>
              ) : null}
            </dl>

            {room?.mattermostChannel ? (
              <a
                href={chatUrl(room.mattermostChannel) ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="mt-4 flex items-center justify-between rounded-xl border border-line bg-paper/60 px-3 py-2.5 text-xs font-semibold text-ink transition hover:border-moss/40 hover:text-forest"
              >
                <span className="flex items-center gap-2">
                  <Megaphone className="h-3.5 w-3.5 text-amber" />
                  {room.name} · Team chat
                </span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </section>

          {canGenerate ? (
            <section className="card p-5">
              <p className="eyebrow mb-2">AI draft</p>
              <p className="mb-3 text-xs leading-5 text-ink-soft">
                Ask the operations agent to turn the brief into a ready-to-send notice.
              </p>
              <ActionButton
                action={generateNoticeAction}
                fields={{ id: notice.id }}
                label={notice.body ? 'Regenerate draft' : 'Generate with agent'}
                pendingLabel="Asking the agent… up to 3 min"
                icon={<Sparkles className="h-4 w-4" />}
              />
            </section>
          ) : null}

          {canDecide ? (
            <section className="card border-amber/25 p-5">
              <p className="eyebrow mb-2 text-amber">Principal review</p>
              <p className="mb-3 text-xs leading-5 text-ink-soft">
                Approving publishes the notice and distributes it to the School Operations room in
                Switch.
              </p>
              <div className="space-y-3">
                <ActionButton
                  action={decideNoticeAction}
                  fields={{ id: notice.id, decision: 'approve' }}
                  label="Approve & distribute"
                  pendingLabel="Approving & distributing…"
                  icon={<Send className="h-4 w-4" />}
                >
                  <textarea
                    name="comment"
                    className="textarea mb-3 min-h-16"
                    placeholder="Optional note for the record"
                  />
                </ActionButton>
                <ActionButton
                  action={decideNoticeAction}
                  fields={{ id: notice.id, decision: 'reject' }}
                  label="Send back with a note"
                  pendingLabel="Sending…"
                  variant="secondary"
                  icon={<X className="h-4 w-4" />}
                >
                  <textarea
                    name="comment"
                    required
                    className="textarea mb-3 min-h-16"
                    placeholder="What should change?"
                  />
                </ActionButton>
              </div>
            </section>
          ) : null}

          {canDistribute && !notice.publishedAt ? (
            <section className="card border-amber/30 bg-amber/[0.04] p-5">
              <p className="eyebrow mb-2 text-amber">Distribution pending</p>
              <p className="mb-3 text-xs leading-5 text-ink-soft">
                This notice is approved but has not reached Switch yet.
              </p>
              <ActionButton
                action={redistributeNoticeAction}
                fields={{ id: notice.id }}
                label="Distribute now"
                pendingLabel="Distributing…"
                icon={<Send className="h-4 w-4" />}
              />
            </section>
          ) : null}

          {notice.publishedAt ? (
            <div className="flex items-center gap-2 rounded-2xl border border-forest/15 bg-forest/5 px-4 py-3 text-xs text-forest">
              <CheckCircle2 className="h-4 w-4" />
              Distributed to the School Operations room.
            </div>
          ) : null}

          {notice.status === 'REJECTED' ? (
            <section className="card border-clay/20 p-5">
              <p className="eyebrow mb-2 text-clay">Sent back</p>
              <p className="text-xs leading-5 text-ink-soft">
                Revise the brief or regenerate the draft, then submit it for review again.
              </p>
            </section>
          ) : null}

          <Link href="/notices" className="btn-ghost w-full">
            <ArrowLeft className="h-4 w-4" />
            All notices
          </Link>
          {notice.status === 'APPROVED' ? (
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-forest">
              <Check className="h-3 w-3" />
              Visible to {audienceLabel(notice.audience).toLowerCase()}
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
