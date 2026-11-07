import { LogOut } from 'lucide-react';

import { AppNav } from '@/components/app-nav';
import { Crest } from '@/components/brand';
import { logoutAction } from '@/app/actions/auth';
import { ROLE_LABELS } from '@/lib/roles';
import type { Role } from '@prisma/client';

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Sidebar({
  name,
  role,
  pending,
}: {
  name: string;
  role: Role;
  pending: number;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-6 pt-7 pb-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper/10 text-paper">
          <Crest className="h-7 w-7" />
        </span>
        <div>
          <p className="font-display text-lg leading-tight text-paper">SchoolSync</p>
          <p className="text-[10px] tracking-[0.18em] text-paper/40 uppercase">Powered by Switch</p>
        </div>
      </div>

      <div className="mb-3 px-6">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-paper/15 bg-paper/5 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-paper/60 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {ROLE_LABELS[role]}
        </span>
      </div>

      <AppNav role={role} pending={pending} />

      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-paper/10 bg-paper/[0.05] p-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber/20 text-xs font-bold text-amber-soft">
              {initials(name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-paper">{name}</p>
              <p className="truncate text-[11px] text-paper/45">{ROLE_LABELS[role]}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                aria-label="Sign out"
                className="rounded-lg p-1.5 text-paper/40 transition hover:bg-paper/10 hover:text-paper"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MobileHeader({
  name,
  role,
  pending,
}: {
  name: string;
  role: Role;
  pending: number;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/92 backdrop-blur lg:hidden">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-paper">
            <Crest className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-base leading-tight text-forest">SchoolSync</p>
            <p className="text-[9px] tracking-[0.16em] text-ink-soft/50 uppercase">
              {ROLE_LABELS[role]}
            </p>
          </div>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label={`Sign out ${name}`}
            className="rounded-full border border-line bg-card p-2 text-ink-soft"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
      <AppNav role={role} pending={pending} mobile />
    </header>
  );
}
