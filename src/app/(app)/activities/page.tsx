import Link from 'next/link';
import { CalendarDays, MapPin, Plus } from 'lucide-react';

import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { StatusPill } from '@/components/status-pill';
import { requireUser } from '@/lib/auth';
import { formatDate } from '@/lib/date';
import { prisma } from '@/lib/db';
import { canCreate } from '@/lib/roles';

export default async function ActivitiesPage() {
  const user = await requireUser();
  const isLearner = user.role === 'STUDENT' || user.role === 'PARENT';
  const canAdd = canCreate(user.role, 'ACTIVITY');

  const activities = await prisma.activity.findMany({
    where: isLearner ? { status: 'APPROVED' } : {},
    orderBy: { eventDate: 'asc' },
    include: { author: { select: { name: true } } },
  });

  const upcoming = activities.filter((activity) => activity.eventDate >= new Date());
  const past = activities.filter((activity) => activity.eventDate < new Date());

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Beyond the classroom"
        title="Activities"
        subtitle={
          isLearner
            ? 'Approved trips, clubs and school events.'
            : 'Plan an activity with the activities agent, review the run sheet, then publish it to the school.'
        }
        actions={
          canAdd ? (
            <Link href="/activities/new" className="btn-primary">
              <Plus className="h-4 w-4" />
              New activity
            </Link>
          ) : null
        }
      />

      {activities.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No activities yet"
          body={
            isLearner
              ? 'Approved activities will appear here.'
              : 'Create an activity, ask the agent for a plan, and approve it before it goes out.'
          }
          action={
            canAdd ? (
              <Link href="/activities/new" className="btn-primary">
                <Plus className="h-4 w-4" />
                New activity
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-8">
          <ActivityGroup title="Upcoming" activities={upcoming} />
          {!isLearner && past.length > 0 ? (
            <ActivityGroup title="Past" activities={past} muted />
          ) : null}
        </div>
      )}
    </div>
  );
}

function ActivityGroup({
  title,
  activities,
  muted = false,
}: {
  title: string;
  activities: Awaited<ReturnType<typeof prisma.activity.findMany>>;
  muted?: boolean;
}) {
  if (activities.length === 0) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink-soft">{title}</h2>
        <p className="card p-6 text-sm text-ink-soft">No {title.toLowerCase()} activities.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-ink-soft">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {activities.map((activity) => (
          <Link
            key={activity.id}
            href={`/activities/${activity.id}`}
            className={`card group flex gap-4 p-5 transition hover:-translate-y-0.5 hover:border-moss/40 ${
              muted ? 'opacity-70' : ''
            }`}
          >
            <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-paper-deep">
              <span className="text-[10px] font-bold tracking-wide text-ink-soft/60 uppercase">
                {activity.eventDate.toLocaleString('en-GB', { month: 'short' })}
              </span>
              <span className="font-display text-xl leading-none text-forest">
                {activity.eventDate.getDate()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-ink group-hover:text-forest">
                  {activity.title}
                </h3>
                <StatusPill status={activity.status} />
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-soft/75">
                {activity.description}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-soft/60">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {formatDate(activity.eventDate)}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {activity.location}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
