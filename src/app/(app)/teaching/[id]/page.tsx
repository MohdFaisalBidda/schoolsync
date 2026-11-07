import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Check, ExternalLink, RotateCcw, Sparkles, X } from 'lucide-react';

import { generateMaterialAction, decideMaterialAction } from '@/app/actions/materials';
import { ActionButton } from '@/components/action-button';
import { Markdown } from '@/components/markdown';
import { PageHeader } from '@/components/page-header';
import { StatusPill } from '@/components/status-pill';
import { requireUser } from '@/lib/auth';
import { formatDate, relativeTime } from '@/lib/date';
import { prisma } from '@/lib/db';
import { canReview, canCreate } from '@/lib/roles';
import { chatUrl } from '@/lib/switch';

export default async function MaterialDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const material = await prisma.teachingMaterial.findUnique({
    where: { id },
    include: {
      author: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  });

  if (!material) notFound();

  const isLearner = user.role === 'STUDENT' || user.role === 'PARENT';
  if (isLearner && (material.status !== 'APPROVED' || material.gradeLevel !== user.gradeLevel)) {
    notFound();
  }

  const room = await prisma.switchRoom.findUnique({ where: { purpose: 'classroom' } });
  const canGenerate = canCreate(user.role, 'MATERIAL') && material.status !== 'APPROVED';
  const canDecide = canReview(user.role, 'MATERIAL') && material.status === 'PENDING_APPROVAL';

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow={`${material.subject} · ${material.gradeLevel}`}
        title={material.title}
        subtitle={`Prepared by ${material.author.name} · updated ${relativeTime(material.updatedAt)}`}
        backHref="/teaching"
        backLabel="Back to worksheets"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)]">
        <section className="card p-5 sm:p-7">
          <div className="mb-5 flex items-center justify-between">
            <p className="eyebrow">Worksheet</p>
            <StatusPill status={material.status} />
          </div>

          {material.content ? (
            <Markdown>{material.content}</Markdown>
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-paper/50 p-6">
              <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-forest/8 text-forest">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-lg text-ink">Nothing drafted yet</h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-ink-soft">
                Ask the teaching agent to turn this brief into a classroom-ready worksheet. It will
                appear here for review, and stay hidden from students until approved.
              </p>
              <p className="mt-4 rounded-xl bg-card p-3 text-xs leading-5 text-ink-soft">
                <span className="font-semibold text-ink">Brief:</span> {material.prompt}
              </p>
            </div>
          )}

          {material.content ? (
            <details className="mt-6 border-t border-line pt-4">
              <summary className="cursor-pointer text-xs font-semibold text-ink-soft hover:text-forest">
                View the original brief
              </summary>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{material.prompt}</p>
            </details>
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="card p-5">
            <p className="eyebrow mb-3">Status</p>
            <StatusPill status={material.status} />
            <dl className="mt-4 space-y-2.5 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft/65">Author</dt>
                <dd className="font-medium text-ink">{material.author.name}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-soft/65">Created</dt>
                <dd className="font-medium text-ink">{formatDate(material.createdAt)}</dd>
              </div>
              {material.approvedAt ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft/65">Approved</dt>
                  <dd className="font-medium text-ink">{formatDate(material.approvedAt)}</dd>
                </div>
              ) : null}
              {material.approvedBy ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft/65">Reviewer</dt>
                  <dd className="font-medium text-ink">{material.approvedBy.name}</dd>
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
                  <Sparkles className="h-3.5 w-3.5 text-forest" />
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
                {material.content
                  ? 'Regenerate a fresh draft. The current text will be replaced.'
                  : 'Send the brief to the teaching agent in the Classroom Lab room.'}
              </p>
              <ActionButton
                action={generateMaterialAction}
                fields={{ id: material.id }}
                label={material.content ? 'Regenerate draft' : 'Generate with agent'}
                pendingLabel="Asking the agent… up to 3 min"
                icon={<Sparkles className="h-4 w-4" />}
              />
            </section>
          ) : null}

          {canDecide ? (
            <section className="card border-amber/25 p-5">
              <p className="eyebrow mb-2 text-amber">Review</p>
              <p className="mb-3 text-xs leading-5 text-ink-soft">
                Approving publishes this worksheet to {material.gradeLevel} students and families.
              </p>
              <div className="space-y-3">
                <ActionButton
                  action={decideMaterialAction}
                  fields={{ id: material.id, decision: 'approve' }}
                  label="Approve worksheet"
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
                  action={decideMaterialAction}
                  fields={{ id: material.id, decision: 'reject' }}
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

          {material.status === 'REJECTED' ? (
            <section className="card border-clay/20 p-5">
              <p className="eyebrow mb-2 text-clay">Sent back</p>
              <p className="text-xs leading-5 text-ink-soft">
                This draft needs another pass. Regenerate it or edit the brief, then resubmit.
              </p>
            </section>
          ) : null}

          <Link href="/teaching" className="btn-ghost w-full">
            <ArrowLeft className="h-4 w-4" />
            All worksheets
          </Link>
          {material.status === 'APPROVED' ? (
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-forest">
              <RotateCcw className="h-3 w-3" />
              Available to students and families
            </p>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
