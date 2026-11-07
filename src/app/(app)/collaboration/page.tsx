import Link from 'next/link';
import { AlertTriangle, ArrowRight, ExternalLink, MessageSquare, Sparkles } from 'lucide-react';

import { PageHeader } from '@/components/page-header';
import { requireUser } from '@/lib/auth';
import { relativeTime } from '@/lib/date';
import { prisma } from '@/lib/db';
import { chatUrl, recentMessages } from '@/lib/switch';

type RoomWithMessages = {
  id: string;
  name: string;
  purpose: string;
  agentName: string;
  switchRoomId: string;
  mattermostChannel: string | null;
  messages: Awaited<ReturnType<typeof recentMessages>>;
  error?: string;
};

export default async function CollaborationPage() {
  await requireUser();
  const rooms = await prisma.switchRoom.findMany({ orderBy: { name: 'asc' } });

  const loaded: RoomWithMessages[] = await Promise.all(
    rooms.map(async (room) => {
      try {
        const messages = await recentMessages(room.switchRoomId, 6);
        return { ...room, messages };
      } catch (error) {
        return {
          ...room,
          messages: [],
          error: error instanceof Error ? error.message : 'Could not reach Switch',
        };
      }
    })
  );

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Live collaboration"
        title="Rooms"
        subtitle="The same conversations happen in your team chat and Switch. Agents work in these rooms; the app keeps the human approval step in front of everything they draft."
        actions={
          <a
            href={process.env.SWITCH_CHAT_URL ?? 'https://t.me'}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            Open team chat
            <ExternalLink className="h-4 w-4" />
          </a>
        }
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Mention the agent', body: 'In a team chat room, type @agent-name and your request.' },
          { title: 'Agent drafts in-room', body: 'The reply lands in Switch, the team chat and this app.' },
          { title: 'Approval card appears', body: 'The room gets a signed card. One tap opens the decision.' },
          { title: 'A person approves', body: 'The app records the reviewer, then publishes to the display.' },
        ].map((step, index) => (
          <div key={step.title} className="card flex items-start gap-3 p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-forest text-xs font-bold text-paper">
              {index + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{step.title}</p>
              <p className="mt-0.5 text-xs leading-5 text-ink-soft/75">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {loaded.map((room) => {
          const channelUrl = chatUrl(room.mattermostChannel);
          return (
            <section key={room.id} className="card overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-line bg-paper/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/8 text-forest">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-semibold text-ink">{room.name}</h2>
                    <p className="text-[11px] text-ink-soft/65">
                      <span className="font-medium text-forest">@{room.agentName}</span> · Switch room{' '}
                      <span className="font-mono text-[10px]">{room.switchRoomId.slice(0, 8)}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="pill bg-forest/8 text-forest">
                    <span className="pill-dot bg-forest" />
                    Agent connected
                  </span>
                  {channelUrl ? (
                    <a
                      href={channelUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary px-3 py-1.5 text-xs"
                    >
                      Open chat
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>

              {room.error ? (
                <div className="flex items-start gap-3 px-5 py-5 text-sm text-clay">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-semibold">Could not load messages from Switch.</p>
                    <p className="mt-0.5 text-xs leading-5 text-clay/80">{room.error}</p>
                  </div>
                </div>
              ) : room.messages.length === 0 ? (
                <p className="px-5 py-5 text-sm text-ink-soft">
                  No messages yet. Say hello in the team chat.
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  {room.messages.map((message) => (
                    <li key={message.messageId} className="flex gap-3 px-5 py-3.5">
                      <span
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                          message.sender.kind === 'agent'
                            ? 'bg-amber/15 text-amber'
                            : 'bg-forest/8 text-forest'
                        }`}
                      >
                        {message.sender.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-ink">{message.sender.name}</p>
                          {message.sender.kind === 'agent' ? (
                            <span className="flex items-center gap-1 rounded-full bg-amber/10 px-2 py-0.5 text-[10px] font-semibold text-amber">
                              <Sparkles className="h-2.5 w-2.5" />
                              Agent
                            </span>
                          ) : null}
                          <span className="text-[10px] text-ink-soft/50">
                            {relativeTime(message.sentAt)}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-3 text-sm leading-6 whitespace-pre-wrap text-ink-soft">
                          {message.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-line bg-paper-deep/40 px-5 py-4 text-xs leading-5 text-ink-soft sm:flex-row sm:items-center sm:justify-between">
        <p>
          Looking for something specific? The teaching studio, notices and activities all send their
          briefs into these rooms automatically.
        </p>
        <Link href="/dashboard" className="btn-ghost shrink-0 px-0">
          Back to dashboard
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
