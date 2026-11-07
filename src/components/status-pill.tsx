import type { ContentStatus } from '@prisma/client';

import { STATUS_LABELS } from '@/lib/roles';

const TONES: Record<ContentStatus, string> = {
  DRAFT: 'bg-ink/5 text-ink-soft',
  PENDING_APPROVAL: 'bg-amber/10 text-amber',
  APPROVED: 'bg-forest/8 text-forest',
  REJECTED: 'bg-clay/8 text-clay',
};

const DOTS: Record<ContentStatus, string> = {
  DRAFT: 'bg-ink-soft/50',
  PENDING_APPROVAL: 'bg-amber',
  APPROVED: 'bg-forest',
  REJECTED: 'bg-clay',
};

export function StatusPill({
  status,
  label,
}: {
  status: ContentStatus;
  label?: string;
}) {
  return (
    <span className={`pill ${TONES[status]}`}>
      <span className={`pill-dot ${DOTS[status]}`} />
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}
