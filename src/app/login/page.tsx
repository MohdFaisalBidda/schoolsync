import { CheckCircle2, MessageSquare, Sparkles } from 'lucide-react';

import { Crest } from '@/components/brand';
import { LoginForm } from '@/components/login-form';

const STEPS = [
  {
    icon: Sparkles,
    title: 'Agents draft',
    body: 'A teaching agent prepares the worksheet, notice or activity plan inside Switch.',
  },
  {
    icon: CheckCircle2,
    title: 'People approve',
    body: 'The right teacher, principal or coordinator reviews before anything reaches a class.',
  },
  {
    icon: MessageSquare,
    title: 'Everyone stays in sync',
    body: 'Approved work lands in SchoolSync and the conversation continues in your team chat.',
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-forest p-12 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 grain opacity-[0.18]" />
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-moss/25 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-amber/15 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper/10 text-paper">
              <Crest className="h-7 w-7" />
            </span>
            <div>
              <p className="font-display text-xl tracking-tight">SchoolSync</p>
              <p className="text-[11px] tracking-[0.2em] text-paper/50 uppercase">Powered by Switch</p>
            </div>
          </div>

          <div className="mt-20 max-w-lg">
            <p className="mb-4 text-[11px] font-semibold tracking-[0.2em] text-paper/50 uppercase">
              The school, in one rhythm
            </p>
            <h1 className="font-display text-5xl leading-[1.08] tracking-tight">
              Less admin.
              <br />
              More teaching.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-paper/70">
              SchoolSync gives every role a clear next step — and puts an AI agent behind the
              busywork, with a human approval before anything goes out.
            </p>
          </div>
        </div>

        <div className="relative mt-16 grid gap-3">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="flex items-start gap-4 rounded-2xl border border-paper/10 bg-paper/[0.06] p-4 backdrop-blur-sm"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-paper/10">
                <step.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-paper/60">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="relative mt-10 text-[11px] text-paper/40">
          Built for the SchoolSync hackathon · Switch + Telegram
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest text-paper">
              <Crest className="h-6 w-6" />
            </span>
            <div>
              <p className="font-display text-lg text-forest">SchoolSync</p>
              <p className="text-[10px] tracking-[0.18em] text-ink-soft/60 uppercase">
                Powered by Switch
              </p>
            </div>
          </div>
          <div className="fade-up">
            <LoginForm next={next} />
          </div>
        </div>
      </section>
    </main>
  );
}
