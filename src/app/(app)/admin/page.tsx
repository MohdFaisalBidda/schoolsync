import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MonitorPlay,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatusPill } from '@/components/status-pill';
import { requireRole } from '@/lib/auth';
import { formatDate, relativeTime } from '@/lib/date';
import { prisma } from '@/lib/db';
import { displayUrl } from '@/lib/display';
import { KIND_LABELS } from '@/lib/roles';

function hrefFor(kind: 'MATERIAL' | 'NOTICE' | 'ACTIVITY', id: string): string {
  if (kind === 'MATERIAL') return `/teaching/${id}`;
  if (kind === 'NOTICE') return `/notices/${id}`;
  return `/activities/${id}`;
}

const STALE_BEFORE = new Date(Date.now() - 24 * 60 * 60 * 1000);

const EXCEPTION_LABELS = {
  STALE: 'Waiting over 24h',
  REJECTED: 'Sent back',
  UNPUBLISHED: 'Distribution pending',
} as const;

type Exception = {
  id: string;
  kind: 'MATERIAL' | 'NOTICE' | 'ACTIVITY';
  entityId: string;
  title: string;
  detail: string;
  type: keyof typeof EXCEPTION_LABELS;
  createdAt: Date;
};

export default async function AdminPage() {
  await requireRole('ADMIN');
  const staleBefore = STALE_BEFORE;

  const [pendingCount, stale, rejected, unpublished, recent, users, rooms] = await Promise.all([
    prisma.approval.count({ where: { status: 'PENDING_APPROVAL' } }),
    prisma.approval.findMany({
      where: { status: 'PENDING_APPROVAL', createdAt: { lt: staleBefore } },
      orderBy: { createdAt: 'asc' },
      include: { requester: { select: { name: true } } },
    }),
    prisma.approval.findMany({
      where: { status: 'REJECTED' },
      orderBy: { decidedAt: 'desc' },
      take: 8,
      include: { requester: { select: { name: true } }, reviewer: { select: { name: true } } },
    }),
    prisma.notice.findMany({
      where: { status: 'APPROVED', publishedAt: null },
      orderBy: { approvedAt: 'desc' },
      take: 8,
    }),
    prisma.approval.findMany({
      orderBy: { createdAt: 'desc' },
      take: 16,
      include: {
        requester: { select: { name: true } },
        reviewer: { select: { name: true } },
      },
    }),
    prisma.user.count(),
    prisma.switchRoom.findMany({ orderBy: { name: 'asc' } }),
  ]);

  const exceptions: Exception[] = [
    ...stale.map((approval) => ({
      id: approval.id,
      kind: approval.kind,
      entityId: approval.entityId,
      title: approval.entityTitle,
      detail: `${approval.requester.name} · waiting ${relativeTime(approval.createdAt)}`,
      type: 'STALE' as const,
      createdAt: approval.createdAt,
    })),
    ...rejected.map((approval) => ({
      id: approval.id,
      kind: approval.kind,
      entityId: approval.entityId,
      title: approval.entityTitle,
      detail: `${approval.reviewer?.name ?? 'Reviewer'} · ${approval.comment ?? 'no note'}`,
      type: 'REJECTED' as const,
      createdAt: approval.decidedAt ?? approval.createdAt,
    })),
    ...unpublished.map((notice) => ({
      id: notice.id,
      kind: 'NOTICE' as const,
      entityId: notice.id,
      title: notice.title,
      detail: 'Approved, but distribution has not completed',
      type: 'UNPUBLISHED' as const,
      createdAt: notice.approvedAt ?? notice.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  let classroomDisplay: string | null = null;
  let displayError: string | null = null;
  try {
    classroomDisplay = displayUrl('classroom');
  } catch (error) {
    displayError = error instanceof Error ? error.message : 'Display URL is not configured';
  }

  const counts = {
    exceptions: exceptions.length,
    pending: pendingCount,
    rejected: rejected.length,
    unpublished: unpublished.length,
  };

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Admin console"
        title="Keep the loop honest."
        subtitle="Exceptions, audit history, room mapping and the classroom display in one place. Routine work stays in chat; this is where the school checks the edges."
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Open approvals', value: counts.pending, icon: Clock3, href: '/approvals' },
          { label: 'Exceptions', value: counts.exceptions, icon: AlertTriangle, href: '#exceptions' },
          { label: 'Sent back', value: counts.rejected, icon: ClipboardCheck, href: '#exceptions' },
          { label: 'Accounts', value: users, icon: Users, href: '#audit' },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="card group p-4 transition hover:-translate-y-0.5 hover:border-moss/40"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-paper-deep text-forest">
                <stat.icon className="h-4 w-4" />
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-ink-soft/30 transition group-hover:translate-x-0.5 group-hover:text-forest" />
            </div>
            <p className="mt-4 font-display text-3xl text-forest">{stat.value}</p>
            <p className="mt-0.5 text-xs font-medium text-ink-soft">{stat.label}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section id="exceptions" className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="eyebrow mb-1">Exception queue</p>
              <h2 className="text-xl text-ink">What needs a human</h2>
            </div>
            <span className="pill bg-amber/10 text-amber">{exceptions.length} open</span>
          </div>
          {exceptions.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={CheckCircle2}
                title="No exceptions"
                body="Every approval is moving. Rejections and stuck distributions will appear here."
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {exceptions.map((exception) => (
                <li key={`${exception.type}-${exception.id}`} className="flex gap-3 px-5 py-3.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/10 text-amber">
                    <AlertTriangle className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold tracking-[0.12em] text-amber uppercase">
                        {EXCEPTION_LABELS[exception.type]}
                      </span>
                      <span className="text-[10px] text-ink-soft/45">
                        {KIND_LABELS[exception.kind]}
                      </span>
                    </div>
                    <Link
                      href={hrefFor(exception.kind, exception.entityId)}
                      className="mt-1 block truncate text-sm font-semibold text-ink hover:text-forest"
                    >
                      {exception.title}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-soft/65">{exception.detail}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-ink-soft/45">
                    {relativeTime(exception.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-5">
          <section className="card p-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest/8 text-forest">
                <MonitorPlay className="h-4 w-4" />
              </span>
              <div>
                <p className="eyebrow">Classroom display</p>
                <h2 className="text-lg text-ink">Read-only projector view</h2>
              </div>
            </div>
            <p className="text-xs leading-5 text-ink-soft">
              Open this on the existing classroom PC or projector. It shows only the latest
              approved worksheet and refreshes itself.
            </p>
            {classroomDisplay ? (
              <a
                href={classroomDisplay}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary mt-4 w-full"
              >
                Open classroom display
                <ArrowRight className="h-4 w-4" />
              </a>
            ) : (
              <p className="mt-4 rounded-xl border border-amber/25 bg-amber/8 px-3 py-2 text-xs leading-5 text-amber">
                {displayError}
              </p>
            )}
          </section>

          <section className="card p-5">
            <p className="eyebrow mb-3">Room map</p>
            <ul className="space-y-2.5">
              {rooms.map((room) => (
                <li key={room.id} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{room.name}</p>
                    <p className="truncate font-mono text-[10px] text-ink-soft/55">
                      {room.switchRoomId.slice(0, 8)} · @{room.agentName}
                    </p>
                  </div>
                  <span className="pill bg-forest/8 text-forest">
                    <span className="pill-dot bg-forest" />
                    Live
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section id="audit" className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="eyebrow mb-1">Audit trail</p>
            <h2 className="text-xl text-ink">Recent decisions</h2>
          </div>
          <Link href="/approvals" className="text-xs font-semibold text-forest hover:underline">
            Open approvals
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-paper/50 text-[10px] tracking-[0.12em] text-ink-soft/55 uppercase">
                <th className="px-5 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Kind</th>
                <th className="px-4 py-3 font-semibold">Requested by</th>
                <th className="px-4 py-3 font-semibold">Decision</th>
                <th className="px-4 py-3 font-semibold">Reviewer</th>
                <th className="px-5 py-3 font-semibold">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {recent.map((approval) => (
                <tr key={approval.id} className="align-top">
                  <td className="px-5 py-3">
                    <Link
                      href={hrefFor(approval.kind, approval.entityId)}
                      className="font-medium text-ink hover:text-forest"
                    >
                      {approval.entityTitle}
                    </Link>
                    {approval.comment ? (
                      <p className="mt-0.5 max-w-xs truncate text-[11px] text-ink-soft/60">
                        “{approval.comment}”
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {KIND_LABELS[approval.kind]}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">{approval.requester.name}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={approval.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {approval.reviewer?.name ?? '—'}
                  </td>
                  <td className="px-5 py-3 text-[11px] text-ink-soft/60">
                    {approval.decidedAt ? formatDate(approval.decidedAt) : relativeTime(approval.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mt-5 border-forest/15 bg-forest p-6 text-paper">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-paper/45 uppercase">
          The operating standard
        </p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Ask', 'A person writes in the chat they already use.'],
            ['Draft', 'A role agent works in its Switch room.'],
            ['Approve', 'One signed card, one human gate.'],
            ['Publish', 'The approved item reaches the display and family view.'],
          ].map(([title, body], index) => (
            <div key={title}>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-paper/10 text-xs font-bold">
                {index + 1}
              </span>
              <p className="mt-2 text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs leading-5 text-paper/55">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 flex items-center gap-2 text-[11px] text-paper/45">
          <ShieldCheck className="h-3.5 w-3.5" />
          No new staff app. No outbound message bypasses the gate.
        </p>
      </section>
    </div>
  );
}
