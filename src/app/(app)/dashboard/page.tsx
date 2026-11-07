import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  ClipboardCheck,
  Megaphone,
  Plus,
  Sparkles,
} from 'lucide-react';

import { StatusPill } from '@/components/status-pill';
import { requireUser } from '@/lib/auth';
import { formatDate, greeting, relativeTime } from '@/lib/date';
import { prisma } from '@/lib/db';
import { KIND_LABELS, ROLE_HOME, ROLE_LABELS, canCreate, noticeAudiencesFor, reviewKinds } from '@/lib/roles';

export default async function DashboardPage() {
  const user = await requireUser();
  const isLearner = user.role === 'STUDENT' || user.role === 'PARENT';
  const grade = user.gradeLevel ?? undefined;
  const kinds = reviewKinds(user.role);

  const materialWhere = isLearner
    ? { status: 'APPROVED' as const, ...(grade ? { gradeLevel: grade } : {}) }
    : {};
  const noticeWhere = isLearner
    ? { status: 'APPROVED' as const, audience: { in: noticeAudiencesFor(user.role) } }
    : {};
  const activityWhere = isLearner
    ? { status: 'APPROVED' as const, eventDate: { gte: new Date() } }
    : { eventDate: { gte: new Date() } };

  const [approvedMaterials, notices, activities, pendingApprovals, pendingCount, approvedMaterialCount, noticeCount, activityCount] =
    await Promise.all([
      prisma.teachingMaterial.findMany({
        where: materialWhere,
        orderBy: { updatedAt: 'desc' },
        take: 4,
        include: { author: { select: { name: true } } },
      }),
      prisma.notice.findMany({
        where: noticeWhere,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 3,
      }),
      prisma.activity.findMany({
        where: activityWhere,
        orderBy: { eventDate: 'asc' },
        take: 3,
      }),
      kinds.length
        ? prisma.approval.findMany({
            where: { status: 'PENDING_APPROVAL', kind: { in: kinds } },
            orderBy: { createdAt: 'asc' },
            take: 3,
            include: { requester: { select: { name: true } } },
          })
        : Promise.resolve([]),
      kinds.length
        ? prisma.approval.count({ where: { status: 'PENDING_APPROVAL', kind: { in: kinds } } })
        : Promise.resolve(0),
      prisma.teachingMaterial.count({ where: materialWhere }),
      prisma.notice.count({ where: noticeWhere }),
      prisma.activity.count({ where: activityWhere }),
    ]);

  const firstName = user.name.split(' ')[0];
  const quickAction = canCreate(user.role, 'MATERIAL')
    ? { href: '/teaching/new', label: 'New worksheet', icon: Plus }
    : canCreate(user.role, 'NOTICE')
      ? { href: '/notices/new', label: 'New notice', icon: Megaphone }
      : canCreate(user.role, 'ACTIVITY')
        ? { href: '/activities/new', label: 'New activity', icon: CalendarDays }
        : { href: '/teaching', label: 'Browse worksheets', icon: Sparkles };

  const stats = [
    {
      label: isLearner ? 'Worksheets' : 'Teaching materials',
      value: approvedMaterialCount,
      icon: Sparkles,
      href: '/teaching',
    },
    { label: 'Notices', value: noticeCount, icon: Megaphone, href: '/notices' },
    { label: 'Upcoming activities', value: activityCount, icon: CalendarDays, href: '/activities' },
    {
      label: 'Awaiting your approval',
      value: pendingCount,
      icon: ClipboardCheck,
      href: kinds.length ? '/approvals' : '/dashboard',
    },
  ];

  return (
    <div className="fade-up space-y-6">
      <section className="card relative overflow-hidden bg-forest p-6 text-paper sm:p-8">
        <div className="grain absolute inset-0 opacity-[0.14]" />
        <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-moss/25 blur-3xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-[11px] font-semibold tracking-[0.18em] text-paper/45 uppercase">
              {ROLE_LABELS[user.role]} · {formatDate(new Date())}
            </p>
            <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
              {greeting()}, {firstName}.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-paper/65">{ROLE_HOME[user.role]}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={quickAction.href} className="btn bg-paper text-forest hover:bg-white">
              <quickAction.icon className="h-4 w-4" />
              {quickAction.label}
            </Link>
            {kinds.length ? (
              <Link
                href="/approvals"
                className="btn border border-paper/20 text-paper hover:bg-paper/10"
              >
                Review queue
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/collaboration"
                className="btn border border-paper/20 text-paper hover:bg-paper/10"
              >
                Open rooms
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="card group p-4 transition hover:-translate-y-0.5 hover:border-moss/40 sm:p-5"
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

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow mb-1">{isLearner ? 'For your class' : 'Latest work'}</p>
              <h2 className="text-xl text-ink">{isLearner ? 'Worksheets' : 'Teaching materials'}</h2>
            </div>
            <Link href="/teaching" className="text-xs font-semibold text-forest hover:underline">
              View all
            </Link>
          </div>
          {approvedMaterials.length === 0 ? (
            <p className="rounded-xl bg-paper-deep/50 px-4 py-6 text-center text-sm text-ink-soft">
              {isLearner ? 'No approved worksheets yet.' : 'No teaching materials yet. Start a draft.'}
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {approvedMaterials.map((material) => (
                <li key={material.id}>
                  <Link
                    href={`/teaching/${material.id}`}
                    className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest/8 text-forest">
                      <Sparkles className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink group-hover:text-forest">
                        {material.title}
                      </p>
                      <p className="truncate text-xs text-ink-soft/75">
                        {material.subject} · {material.gradeLevel} · {material.author.name}
                      </p>
                    </div>
                    <StatusPill status={material.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow mb-1">Human in the loop</p>
              <h2 className="text-xl text-ink">Approval queue</h2>
            </div>
            {kinds.length ? (
              <Link href="/approvals" className="text-xs font-semibold text-forest hover:underline">
                Review all
              </Link>
            ) : null}
          </div>
          {kinds.length === 0 ? (
            <div className="rounded-xl bg-forest/5 p-4 text-sm leading-6 text-forest">
              Nothing needs your signature. Approved work appears in your worksheets and notices as
              soon as it clears review.
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="rounded-xl bg-forest/5 p-4 text-sm leading-6 text-forest">
              All clear — nothing is waiting for you.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {pendingApprovals.map((approval) => (
                <li key={approval.id} className="rounded-xl border border-line bg-paper/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-semibold tracking-[0.12em] text-amber uppercase">
                        {KIND_LABELS[approval.kind]}
                      </p>
                      <Link
                        href={
                          approval.kind === 'MATERIAL'
                            ? `/teaching/${approval.entityId}`
                            : approval.kind === 'NOTICE'
                              ? `/notices/${approval.entityId}`
                              : `/activities/${approval.entityId}`
                        }
                        className="mt-1 block text-sm font-semibold text-ink hover:text-forest"
                      >
                        {approval.entityTitle}
                      </Link>
                      <p className="mt-0.5 text-[11px] text-ink-soft/70">
                        {approval.requester.name} · {relativeTime(approval.createdAt)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow mb-1">School office</p>
              <h2 className="text-xl text-ink">Notices</h2>
            </div>
            <Link href="/notices" className="text-xs font-semibold text-forest hover:underline">
              View all
            </Link>
          </div>
          {notices.length === 0 ? (
            <p className="text-sm text-ink-soft">No notices yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {notices.map((notice) => (
                <li key={notice.id}>
                  <Link href={`/notices/${notice.id}`} className="group block py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-ink group-hover:text-forest">
                        {notice.title}
                      </p>
                      <StatusPill status={notice.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft/70">
                      {notice.publishedAt
                        ? `Published ${formatDate(notice.publishedAt)}`
                        : `Updated ${relativeTime(notice.updatedAt)}`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="eyebrow mb-1">On the calendar</p>
              <h2 className="text-xl text-ink">Upcoming activities</h2>
            </div>
            <Link href="/activities" className="text-xs font-semibold text-forest hover:underline">
              View all
            </Link>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-ink-soft">No upcoming activities.</p>
          ) : (
            <ul className="divide-y divide-line">
              {activities.map((activity) => (
                <li key={activity.id}>
                  <Link
                    href={`/activities/${activity.id}`}
                    className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-paper-deep">
                      <span className="text-[9px] font-bold tracking-wide text-ink-soft/60 uppercase">
                        {activity.eventDate.toLocaleString('en-GB', { month: 'short' })}
                      </span>
                      <span className="text-sm leading-none font-bold text-forest">
                        {activity.eventDate.getDate()}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink group-hover:text-forest">
                        {activity.title}
                      </p>
                      <p className="truncate text-xs text-ink-soft/70">{activity.location}</p>
                    </div>
                    <StatusPill status={activity.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card flex flex-col items-start gap-4 border-forest/10 bg-forest/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest text-paper">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">The agent drafts. People decide.</p>
            <p className="mt-0.5 text-xs leading-5 text-ink-soft">
              SchoolSync&apos;s agents work in Switch rooms and stay in the loop with the team chat — but
              every worksheet, notice and activity waits for a human approval.
            </p>
          </div>
        </div>
        <Link href="/collaboration" className="btn-secondary shrink-0">
          See the rooms
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}
