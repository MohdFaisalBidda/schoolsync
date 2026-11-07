import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  backHref,
  backLabel,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {backHref ? (
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-soft/70 transition hover:text-forest"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel ?? 'Back'}
          </Link>
        ) : null}
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h1 className="text-3xl text-forest sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-soft">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
