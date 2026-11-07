'use client';

import { useActionState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

import type { ActionState } from '@/lib/forms';

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  fields: Record<string, string>;
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
} as const;

export function ActionButton({
  action,
  fields,
  label,
  pendingLabel,
  variant = 'primary',
  className = '',
  icon,
  children,
}: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  return (
    <form action={formAction} className={className}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      {children}
      <button type="submit" disabled={pending} className={`${VARIANTS[variant]} w-full`}>
        {pending ? (pendingLabel ?? 'Working…') : label}
        {!pending ? icon : null}
      </button>
      {state?.error ? (
        <p
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-clay/20 bg-clay/5 px-3 py-2 text-xs leading-5 text-clay"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-forest/15 bg-forest/5 px-3 py-2 text-xs leading-5 text-forest">
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {state.message}
        </p>
      ) : null}
      {state?.warning ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-amber/25 bg-amber/8 px-3 py-2 text-xs leading-5 text-amber">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {state.warning}
        </p>
      ) : null}
    </form>
  );
}
