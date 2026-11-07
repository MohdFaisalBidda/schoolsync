import Link from 'next/link';
import { ArrowLeft, Megaphone } from 'lucide-react';

import { createNoticeAction } from '@/app/actions/notices';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/page-header';
import { requireRole } from '@/lib/auth';

export default async function NewNoticePage() {
  await requireRole('PRINCIPAL', 'ADMIN');

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="School office"
        title="New notice"
        subtitle="Set the audience and the brief. The operations agent drafts it; the principal approves and distributes it through Switch."
        backHref="/notices"
        backLabel="Back to notices"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <section className="card p-5 sm:p-7">
          <ActionButton
            action={createNoticeAction}
            fields={{}}
            label="Save draft"
            pendingLabel="Saving…"
            className="space-y-4"
          >
            <div>
              <label className="label" htmlFor="title">
                Title
              </label>
              <input
                id="title"
                name="title"
                className="input"
                required
                placeholder="e.g. Parent–teacher conferences"
              />
            </div>

            <div>
              <label className="label" htmlFor="audience">
                Audience
              </label>
              <select id="audience" name="audience" className="select" defaultValue="ALL">
                <option value="ALL">Whole school</option>
                <option value="STUDENTS">Students</option>
                <option value="PARENTS">Parents &amp; guardians</option>
                <option value="STAFF">Staff</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="brief">
                Brief for the operations agent
              </label>
              <textarea
                id="brief"
                name="brief"
                className="textarea min-h-36"
                required
                placeholder="What should the notice say? Include dates, times, who to contact and any action families must take."
              />
              <p className="mt-2 text-xs text-ink-soft/65">
                Example: “Invite parents to 15-minute conferences next Wednesday and Thursday,
                3:30–6:00 PM, and ask them to book through the office by Monday.”
              </p>
            </div>
          </ActionButton>
        </section>

        <aside className="space-y-4">
          <section className="card bg-amber/[0.04] p-5">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber text-white">
              <Megaphone className="h-4 w-4" />
            </span>
            <h2 className="text-lg text-ink">Approval is built in</h2>
            <p className="mt-2 text-xs leading-5 text-ink-soft">
              A notice is never distributed straight from the agent. It moves through:
            </p>
            <ol className="mt-3 space-y-2 text-xs leading-5 text-ink-soft">
              <li>
                <span className="font-semibold text-ink">Draft</span> — only staff can see it.
              </li>
              <li>
                <span className="font-semibold text-ink">Awaiting approval</span> — the agent has
                written it; the principal reviews.
              </li>
              <li>
                <span className="font-semibold text-ink">Approved</span> — distributed to Switch and
                visible to the selected audience.
              </li>
            </ol>
          </section>
          <Link href="/notices" className="btn-ghost w-full">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Link>
        </aside>
      </div>
    </div>
  );
}
