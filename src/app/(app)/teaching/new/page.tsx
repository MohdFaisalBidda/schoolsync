import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

import { createMaterialAction } from '@/app/actions/materials';
import { ActionButton } from '@/components/action-button';
import { PageHeader } from '@/components/page-header';
import { requireRole } from '@/lib/auth';
import { GRADE_LEVELS, SUBJECTS } from '@/lib/forms';
import { STATUS_LABELS } from '@/lib/roles';

export default async function NewMaterialPage() {
  const user = await requireRole('TEACHER', 'ADMIN');

  return (
    <div className="fade-up">
      <PageHeader
        eyebrow="Teaching studio"
        title="New teaching material"
        subtitle="Describe what you need. The teaching agent writes the first draft in Switch, then you review it before students see it."
        backHref="/teaching"
        backLabel="Back to worksheets"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <section className="card p-5 sm:p-7">
          <ActionButton
            action={createMaterialAction}
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
                placeholder="e.g. The water cycle — Grade 5"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="subject">
                  Subject
                </label>
                <select id="subject" name="subject" className="select" defaultValue="Science">
                  {SUBJECTS.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="gradeLevel">
                  Grade
                </label>
                <select
                  id="gradeLevel"
                  name="gradeLevel"
                  className="select"
                  defaultValue={user.gradeLevel ?? 'Grade 5'}
                >
                  {GRADE_LEVELS.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="prompt">
                Brief for the teaching agent
              </label>
              <textarea
                id="prompt"
                name="prompt"
                className="textarea min-h-36"
                required
                placeholder="What should the worksheet cover? Include the number of questions, difficulty and anything to avoid."
              />
              <p className="mt-2 text-xs text-ink-soft/65">
                Example: “Ten practice questions on equivalent fractions, a worked example, and a
                separate answer key. Keep the reading level at Grade 5.”
              </p>
            </div>
          </ActionButton>
        </section>

        <aside className="space-y-4">
          <section className="card bg-forest/[0.04] p-5">
            <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-paper">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-lg text-ink">What happens next</h2>
            <ol className="mt-3 space-y-3 text-xs leading-5 text-ink-soft">
              <li>
                <span className="font-semibold text-ink">1. Save the brief.</span> It starts as a
                draft, visible only to staff.
              </li>
              <li>
                <span className="font-semibold text-ink">2. Ask the agent.</span> The teaching agent
                drafts in the Classroom Lab room in Switch.
              </li>
              <li>
                <span className="font-semibold text-ink">3. Review.</span> You approve, send it back,
                or regenerate it.
              </li>
              <li>
                <span className="font-semibold text-ink">4. Publish.</span> Approved work appears on
                student and parent dashboards.
              </li>
            </ol>
          </section>
          <div className="card p-5">
            <p className="eyebrow mb-2">Statuses</p>
            <dl className="space-y-2 text-xs text-ink-soft">
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <dt>{label}</dt>
                  <dd className="font-mono text-[10px] text-ink-soft/50">{key}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Link href="/teaching" className="btn-ghost w-full">
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Link>
        </aside>
      </div>
    </div>
  );
}
