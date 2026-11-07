import { notFound } from 'next/navigation';
import { CalendarDays, CheckCircle2, Clock3, Megaphone, Sparkles } from 'lucide-react';

import { Crest } from '@/components/brand';
import { DisplayRefresh } from '@/components/display-refresh';
import { Markdown } from '@/components/markdown';
import { formatDate, formatLongDate, formatTime, relativeTime } from '@/lib/date';
import { prisma } from '@/lib/db';
import { displayAccessValid, isDisplayRoom } from '@/lib/display';

export const dynamic = 'force-dynamic';

const ROOM_LABELS = {
  classroom: 'Classroom display',
  operations: 'School office display',
  activities: 'Activities display',
} as const;

export default async function DisplayPage({
  params,
  searchParams,
}: {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { room } = await params;
  const { key } = await searchParams;
  if (!isDisplayRoom(room) || !displayAccessValid(key)) notFound();

  const now = new Date();
  const [material, notice, activity] = await Promise.all([
    room === 'classroom'
      ? prisma.teachingMaterial.findFirst({
          where: { status: 'APPROVED' },
          orderBy: { approvedAt: 'desc' },
          include: { approvedBy: { select: { name: true } }, author: { select: { name: true } } },
        })
      : Promise.resolve(null),
    room === 'operations'
      ? prisma.notice.findFirst({
          where: { status: 'APPROVED' },
          orderBy: [{ publishedAt: 'desc' }, { approvedAt: 'desc' }],
          include: { approvedBy: { select: { name: true } } },
        })
      : Promise.resolve(null),
    room === 'activities'
      ? prisma.activity.findFirst({
          where: { status: 'APPROVED' },
          orderBy: [{ eventDate: 'asc' }, { approvedAt: 'desc' }],
          include: { approvedBy: { select: { name: true } } },
        })
      : Promise.resolve(null),
  ]);

  const title = material?.title ?? notice?.title ?? activity?.title;
  const body = material?.content ?? notice?.body ?? activity?.plan;
  const approvedBy =
    material?.approvedBy?.name ?? notice?.approvedBy?.name ?? activity?.approvedBy?.name ?? null;
  const approvedAt =
    material?.approvedAt ?? notice?.approvedAt ?? activity?.approvedAt ?? null;

  return (
    <main className="display-shell">
      <DisplayRefresh />
      <header className="display-top">
        <div className="display-brand">
          <span className="display-crest">
            <Crest className="h-8 w-8" />
          </span>
          <span>
            <strong>SchoolSync</strong>
            <small>{ROOM_LABELS[room]}</small>
          </span>
        </div>
        <div className="display-live">
          <span className="display-dot" />
          Live from Switch
          <span className="display-time">{formatTime(now)}</span>
        </div>
      </header>

      <section className="display-main">
        {!title ? (
          <div className="display-empty">
            <Clock3 className="h-10 w-10" />
            <h1>Waiting for the first approved item</h1>
            <p>This display only shows work a person has approved.</p>
          </div>
        ) : (
          <>
            <div className="display-meta">
              {room === 'classroom' ? (
                <Sparkles className="h-4 w-4" />
              ) : room === 'operations' ? (
                <Megaphone className="h-4 w-4" />
              ) : (
                <CalendarDays className="h-4 w-4" />
              )}
              {room === 'classroom'
                ? `Approved worksheet · ${material?.subject ?? 'Classroom'} · ${material?.gradeLevel ?? ''}`
                : room === 'operations'
                  ? 'Approved school notice'
                  : 'Approved activity plan'}
            </div>
            <h1 className="display-title">{title}</h1>
            <p className="display-byline">
              <CheckCircle2 className="h-4 w-4" />
              Approved{approvedBy ? ` by ${approvedBy}` : ''}
              {approvedAt ? ` · ${formatDate(approvedAt)} (${relativeTime(approvedAt)})` : ''}
            </p>
            {room === 'activities' && activity ? (
              <p className="display-event">
                {formatLongDate(activity.eventDate)} · {activity.location}
              </p>
            ) : null}
            {body ? (
              <div className="display-prose">
                <Markdown>{body}</Markdown>
              </div>
            ) : null}
          </>
        )}
      </section>

      <footer className="display-foot">
        <span>Nothing appears here until a human approves it.</span>
        <span>
          {room === 'classroom'
            ? 'Ask in the classroom chat · approve in SchoolSync'
            : room === 'operations'
              ? 'Ask in the operations chat · approve in SchoolSync'
              : 'Ask in the activities chat · approve in SchoolSync'}
        </span>
      </footer>
    </main>
  );
}
