import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  ExternalLink,
  Megaphone,
  Sparkles,
  X,
} from 'lucide-react';

import {
  announceActivityAction,
  decideActivityAction,
  generateActivityAction,
} from '@/app/actions/activities';
import { ActionButton } from '@/components/action-button';
import { Markdown } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { StatusPill } from '@/components/status-pill';
import { requireUser } from '@/lib/auth';
import { formatDate, formatLongDate, relativeTime } from '@/lib/date';
import { prisma } from '@/lib/db';
import { canCreate, canReview } from '@/lib/roles';
import { chatUrl } from '@/lib/switch';

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  });

  if (!activity) notFound();
  if ((user.role === 'STUDENT' || user.role === 'PARENT') && activity.status !== 'APPROVED') {
    notFound();
  }

  const room = await prisma.switchRoom.findUnique({ where: { purpose: 'activities' } });
  const canGenerate = canCreate(user.role, 'ACTIVITY') && activity.status !== 'APPROVED';
  const canDecide = canReview(user.role, 'ACTIVITY') && activity.status === 'PENDING_APPROVAL';
  const canAnnounce = canReview(user.role, 'ACTIVITY') && activity.status === 'APPROVED';

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="School activities"
        title={activity.title}
        subtitle={`${formatLongDate(activity.eventDate)} · ${activity.location}`}
        backHref="/activities"
        backLabel="Back to activities"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <section className="card p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <p className="eyebrow">Activity plan</p>
            <StatusPill status={activity.status} />
          </div>
          <p className="mb-4 text-sm leading-6 text-ink-soft">{activity.description}</p>
          {activity.plan ? (
            <Markdown>{activity.plan}</Markdown>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-6">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-forest/8 text-forest">
                <CalendarDays className="h-4 w-4" />
              </span>
              <h2 className="text-lg text-ink">No run sheet yet</h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-ink-soft">
                Ask the activities agent for a practical plan: a timed run sheet, materials and
                staff roles.
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <p className="eyebrow mb-3">Details</p>
            <StatusPill status={activity.status} />
            <dl className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft/65">Date</dt>
                <dd className="font-medium text-ink">{formatDate(activity.eventDate)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft/65">Location</dt>
                <dd className="font-medium text-ink">{activity.location}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft/65">Planned by</dt>
                <dd className="font-medium text-ink">{activity.author.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft/65">Updated</dt>
                <dd className="font-medium text-ink">{relativeTime(activity.updatedAt)}</dd>
              </div>
              {activity.approvedBy ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft/65">Approved by</dt>
                  <dd className="font-medium text-ink">{activity.approvedBy.name}</dd>
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
                  <CalendarDays className="h-3.5 w-3.5 text-forest" />
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
                The activities agent plans in the School Activities room in Switch.
              </p>
              <ActionButton
                action={generateActivityAction}
                fields={{ id: activity.id }}
                label={activity.plan ? 'Regenerate plan' : 'Generate with agent'}
                pendingLabel="Asking the agent… up to 3 min"
                icon={<Sparkles className="h-4 w-4" />}
              />
            </section>
          ) : null}

          {canDecide ? (
            <section className="card border-amber/25 p-5">
              <p className="eyebrow mb-2 text-amber">Coordinator review</p>
              <p className="mb-3 text-xs leading-5 text-ink-soft">
                Approving publishes the plan and announces it in the School Activities room.
              </p>
              <div className="space-y-3">
                <ActionButton
                  action={decideActivityAction}
                  fields={{ id: activity.id, decision: 'approve' }}
                  label="Approve activity"
                  pendingLabel="Approving…"
                  icon={<Check className="h-4 w-4" />}
                >
                  <textarea
                    name="comment"
                    className="textarea mb-3 min-h-16"
                    placeholder="Optional note for the record"
                  />
                </ActionButton>
                <ActionButton
                  action={decideActivityAction}
                  fields={{ id: activity.id, decision: 'reject' }}
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

          {canAnnounce ? (
            <section className="card p-5">
              <p className="eyebrow mb-2">Announcement</p>
              <p className="mb-3 text-xs leading-5 text-ink-soft">
                Post the approved plan to the School Activities room again — useful if the first
                announcement failed.
              </p>
              <ActionButton
                action={announceActivityAction}
                fields={{ id: activity.id }}
                label="Announce again"
                pendingLabel="Announcing…"
                variant="secondary"
                icon={<Megaphone className="h-4 w-4" />}
              />
            </section>
          ) : null}

          {activity.status === 'APPROVED' ? (
            <div className="flex items-center gap-2 rounded-2xl border border-forest/15 bg-forest/5 px-4 py-3 text-xs text-forest">
              <CheckCircle2 className="h-4 w-4" />
              Visible to students and families.
            </div>
          ) : null}

          {activity.status === 'REJECTED' ? (
            <section className="card border-clay/20 p-5">
              <p className="eyebrow mb-2 text-clay">Sent back</p>
              <p className="text-xs leading-5 text-ink-soft">
                Revise the brief or regenerate the plan, then submit it for review again.
              </p>
            </section>
          ) : null}

          <Link href="/activities" className="btn-ghost w-full">
            <ArrowLeft className="h-4 w-4" />
            All activities
          </Link>
        </aside>
      </div>
    </div>
  );
}
