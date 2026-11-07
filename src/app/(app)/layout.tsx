import { requireUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { reviewKinds } from '@/lib/roles';
import { MobileHeader, Sidebar } from '@/components/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const kinds = reviewKinds(user.role);
  const pending = kinds.length
    ? await prisma.approval.count({
        where: { status: 'PENDING_APPROVAL', kind: { in: kinds } },
      })
    : 0;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[264px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh bg-forest lg:block">
        <Sidebar name={user.name} role={user.role} pending={pending} />
      </aside>
      <div className="flex min-h-dvh min-w-0 flex-col">
        <MobileHeader name={user.name} role={user.role} pending={pending} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-7 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
