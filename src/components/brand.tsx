export function Crest({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="42" height="42" rx="13" fill="currentColor" opacity="0.12" />
      <path
        d="M24 12.5c-3.7-2.4-8.1-2.8-12-1.4v19.2c3.9-1.4 8.3-1 12 1.4 3.7-2.4 8.1-2.8 12-1.4V11.1c-3.9-1.4-8.3-1-12 1.4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M24 13v18.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 17.5c2.2-.3 4.3 0 6.2.9M15 22c2.2-.3 4.3 0 6.2.9M33 17.5c-2.2-.3-4.3 0-6.2.9M33 22c-2.2-.3-4.3 0-6.2.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
