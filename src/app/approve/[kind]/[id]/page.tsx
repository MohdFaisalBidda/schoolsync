import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowRight, Check, Clock3, ShieldCheck, X } from 'lucide-react';

import { decideApprovalAction } from '@/app/actions/approvals';
import { ActionButton } from '@/components/action-button';
import { Crest } from '@/components/brand';
import { StatusPill } from '@/components/status-pill';
import { verifyApprovalToken } from '@/lib/approval-links';
import { getCurrentUser } from '@/lib/auth';
import { formatDate, relativeTime } from '@/lib/date';
import { prisma } from '@/lib/db';
import { KIND_LABELS, canReview } from '@/lib/roles';

const KINDS = ['MATERIAL', 'NOTICE', 'ACTIVITY'] as const;
type Kind = (typeof KINDS)[number];

function parseKind(value: string): Kind | null {
  const upper = value.toUpperCase();
  return (KINDS as readonly string[]).includes(upper) ? (upper as Kind) : null;
}

function hrefFor(kind: Kind, id: string): string {
  if (kind === 'MATERIAL') return `/teaching/${id}`;
  if (kind === 'NOTICE') return `/notices/${id}`;
  return `/activities/${id}`;
}

function InvalidLink({ message }: { message: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-paper px-5 py-12">
      <div className="card w-full max-w-lg p-7 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-clay/10 text-clay">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <h1 className="text-2xl text-forest">This approval link cannot be used</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{message}</p>
        <Link href="/dashboard" className="btn-primary mt-6">
          Open SchoolSync
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}

export default async function ChatApprovalPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string; id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { kind: rawKind, id } = await params;
  const { token } = await searchParams;
  const kind = parseKind(rawKind);

  if (!kind || !token || !verifyApprovalToken(kind, id, token)) {
    return (
      <InvalidLink message="The link is incomplete, has expired, or was issued for a different approval. Open the card in chat again, or use the Approvals page." />
    );
  }

  const approval = await prisma.approval.findUnique({
    where: { kind_entityId: { kind, entityId: id } },
    include: {
      requester: { select: { name: true } },
      reviewer: { select: { name: true } },
    },
  });

  if (!approval) notFound();

  const user = await getCurrentUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/approve/${kind.toLowerCase()}/${id}?token=${token}`)}`
    );
  }

  const allowed = canReview(user.role, kind);
  const detailHref = hrefFor(kind, id);

  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-5 py-8 sm:px-8 sm:py-12">
        <header className="flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 text-forest">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest text-paper">
              <Crest className="h-6 w-6" />
            </span>
            <span>
              <span className="block font-display text-lg leading-tight">SchoolSync</span>
              <span className="block text-[10px] tracking-[0.18em] text-ink-soft/55 uppercase">
                Chat approval
              </span>
            </span>
          </Link>
          <span className="pill bg-forest/8 text-forest">
            <ShieldCheck className="h-3 w-3" />
            Signed link
          </span>
        </header>

        <section className="card mt-10 overflow-hidden">
          <div className="border-b border-line bg-forest px-6 py-5 text-paper sm:px-8">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-paper/50 uppercase">
              {KIND_LABELS[kind]} · approval card
            </p>
            <h1 className="mt-1 font-display text-2xl leading-tight sm:text-3xl">
              {approval.entityTitle}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-paper/60">
              <span>Requested by {approval.requester.name}</span>
              <span className="text-paper/25">·</span>
              <span>{relativeTime(approval.createdAt)}</span>
              <span className="text-paper/25">·</span>
              <span>{formatDate(approval.createdAt)}</span>
            </p>
          </div>

          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-3">
              <StatusPill status={approval.status} />
              {approval.status === 'PENDING_APPROVAL' ? (
                <span className="flex items-center gap-1.5 text-xs text-ink-soft/70">
                  <Clock3 className="h-3.5 w-3.5" />
                  Nothing is published until this is approved.
                </span>
              ) : null}
            </div>

            {approval.status === 'PENDING_APPROVAL' ? (
              allowed ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <ActionButton
                    action={decideApprovalAction}
                    fields={{ kind, id, decision: 'approve' }}
                    label="Approve"
                    pendingLabel="Approving…"
                    icon={<Check className="h-4 w-4" />}
                  >
                    <textarea
                      name="comment"
                      className="textarea mb-3 min-h-14"
                      placeholder="Optional note for the record"
                    />
                  </ActionButton>
                  <ActionButton
                    action={decideApprovalAction}
                    fields={{ kind, id, decision: 'reject' }}
                    label="Send back"
                    pendingLabel="Sending…"
                    variant="secondary"
                    icon={<X className="h-4 w-4" />}
                  >
                    <textarea
                      name="comment"
                      required
                      className="textarea mb-3 min-h-14"
                      placeholder="Required: what should change?"
                    />
                  </ActionButton>
                </div>
              ) : (
                <div className="mt-6 rounded-2xl border border-amber/25 bg-amber/8 px-4 py-3 text-sm leading-6 text-amber">
                  You are signed in as {user.name} ({user.role.toLowerCase()}). This decision
                  belongs to a different role. Sign in with the right account, or open the full
                  approval queue.
                </div>
              )
            ) : (
              <div className="mt-6 rounded-2xl border border-line bg-paper/60 px-4 py-3 text-sm leading-6 text-ink-soft">
                This approval was already {approval.status.toLowerCase().replace('_', ' ')}
                {approval.reviewer ? ` by ${approval.reviewer.name}` : ''}
                {approval.decidedAt ? ` · ${formatDate(approval.decidedAt)}` : ''}.
                {approval.comment ? ` “${approval.comment}”` : ''}
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
              <Link href={detailHref} className="btn-secondary">
                Open the full {KIND_LABELS[kind].toLowerCase()}
              </Link>
              <Link href="/approvals" className="btn-ghost">
                All approvals
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs leading-5 text-ink-soft/60">
          This link only opens one approval. The decision still needs a signed-in person with the
          right role.
        </p>
      </div>
    </main>
  );
}
