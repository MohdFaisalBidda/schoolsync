import Link from 'next/link';
import { ArrowLeft, CalendarDays } from 'lucide-react';

import { createActivityAction } from '@/app/actions/activities';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/page-header';
import { requireRole } from '@/lib/auth';

export default async function NewActivityPage() {
  await requireRole('COORDINATOR', 'ADMIN');

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="School activities"
        title="New activity"
        subtitle="Set the event. The activities agent drafts a practical run sheet; the coordinator approves before it is announced."
        backHref="/activities"
        backLabel="Back to activities"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <section className="card p-5 sm:p-7">
          <ActionButton
            action={createActivityAction}
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
                placeholder="e.g. School garden day"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="eventDate">
                  Date
                </label>
                <input
                  id="eventDate"
                  name="eventDate"
                  type="date"
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="location">
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  className="input"
                  required
                  placeholder="e.g. School garden"
                />
              </div>
            </div>

            <div>
              <label className="label" htmlFor="description">
                Description for the activities agent
              </label>
              <textarea
                id="description"
                name="description"
                className="textarea min-h-32"
                required
                placeholder="What will students do? What should the agent plan for?"
              />
              <p className="mt-2 text-xs text-ink-soft/65">
                The plan includes a timed run sheet, materials and staff roles — one page, ready for
                review.
              </p>
            </div>
          </ActionButton>
        </section>

        <aside className="space-y-4">
          <section className="card bg-forest/[0.04] p-5">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-paper">
              <CalendarDays className="h-4 w-4" />
            </span>
            <h2 className="text-lg text-ink">Approval, then announcement</h2>
            <p className="mt-2 text-xs leading-5 text-ink-soft">
              The coordinator reviews the agent&apos;s plan. On approval, it is published to students
              and families and posted to the School Activities room in Switch, where the conversation
              continues in the team chat.
            </p>
          </section>
          <Link href="/activities" className="btn-ghost w-full">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Link>
        </aside>
      </div>
    </div>
  );
}
