'use client';

import { useActionState, useState } from 'react';
import { ArrowRight, KeyRound, Mail } from 'lucide-react';

import { loginAction } from '@/app/actions/auth';
import type { ActionState } from '@/lib/forms';

const DEMO_ACCOUNTS = [
  { role: 'Teacher', email: 'teacher@schoolsync.local', blurb: 'Worksheet workflow' },
  { role: 'Principal', email: 'principal@schoolsync.local', blurb: 'Notice approvals' },
  { role: 'Coordinator', email: 'coordinator@schoolsync.local', blurb: 'Activity plans' },
  { role: 'Student', email: 'student@schoolsync.local', blurb: 'Approved work' },
  { role: 'Parent', email: 'parent@schoolsync.local', blurb: 'Family notices' },
  { role: 'Admin', email: 'admin@schoolsync.local', blurb: 'Full access' },
];

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, null);
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email);

  return (
    <div className="w-full max-w-md">
      <div className="mb-8">
        <p className="eyebrow mb-2">Welcome back</p>
        <h1 className="text-4xl text-forest">Sign in to SchoolSync</h1>
        <p className="mt-3 text-sm leading-6 text-ink-soft">
          One calm place for lessons, notices, activities and approvals — with AI agents doing the
          first draft.
        </p>
      </div>

      <form action={action} className="space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-soft/45" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input pl-10"
              placeholder="you@schoolsync.local"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ink-soft/45" />
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input pl-10"
              placeholder="Your demo password"
            />
          </div>
          <p className="mt-2 text-xs text-ink-soft/70">
            Demo accounts share the <span className="font-mono">DEMO_PASSWORD</span> in{' '}
            <span className="font-mono">.env.local</span>.
          </p>
        </div>

        {state?.error ? (
          <p
            role="alert"
            className="rounded-xl border border-clay/20 bg-clay/5 px-3.5 py-2.5 text-sm text-clay"
          >
            {state.error}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="btn-primary w-full py-3">
          {pending ? 'Signing in…' : 'Sign in'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-[11px] font-semibold tracking-[0.14em] text-ink-soft/60 uppercase">
            Try a role
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => setEmail(account.email)}
              className={`rounded-xl border px-3 py-2.5 text-left transition ${
                email === account.email
                  ? 'border-forest/30 bg-forest/5'
                  : 'border-line bg-card hover:border-moss/40 hover:bg-paper-deep/50'
              }`}
            >
              <span className="block text-xs font-semibold text-ink">{account.role}</span>
              <span className="block text-[11px] text-ink-soft/70">{account.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
