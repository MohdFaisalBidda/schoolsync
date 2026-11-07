'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import type { Role } from '@prisma/client';

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  badge?: boolean;
};

function itemsFor(role: Role): Item[] {
  const allRoles: Role[] = ['STUDENT', 'TEACHER', 'PARENT', 'COORDINATOR', 'PRINCIPAL', 'ADMIN'];
  return [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: allRoles },
    {
      href: '/teaching',
      label:
        role === 'STUDENT' || role === 'PARENT'
          ? 'Worksheets'
          : role === 'TEACHER'
            ? 'Teaching studio'
            : 'Curriculum',
      icon: Sparkles,
      roles: allRoles,
    },
    { href: '/notices', label: 'Notices', icon: Megaphone, roles: allRoles },
    { href: '/activities', label: 'Activities', icon: CalendarDays, roles: allRoles },
    {
      href: '/approvals',
      label: 'Approvals',
      icon: ClipboardCheck,
      roles: ['TEACHER', 'COORDINATOR', 'PRINCIPAL', 'ADMIN'],
      badge: true,
    },
    { href: '/collaboration', label: 'Rooms', icon: MessagesSquare, roles: allRoles },
    { href: '/admin', label: 'Admin', icon: ShieldCheck, roles: ['ADMIN'] },
  ];
}

export function AppNav({
  role,
  pending,
  mobile = false,
}: {
  role: Role;
  pending: number;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const items = itemsFor(role).filter((item) => item.roles.includes(role));

  if (mobile) {
    return (
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active ? 'bg-forest text-paper' : 'text-ink-soft hover:bg-paper-deep'
              }`}
            >
              <item.icon className="h-3.5 w-3.5" />
              {item.label}
              {item.badge && pending > 0 ? (
                <span className="rounded-full bg-amber px-1.5 text-[10px] text-white">{pending}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-1.5 px-3">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
              active
                ? 'bg-paper text-forest shadow-[0_8px_24px_-16px_rgba(0,0,0,0.7)]'
                : 'text-paper/60 hover:bg-paper/[0.07] hover:text-paper'
            }`}
          >
            <item.icon
              className={`h-4 w-4 ${active ? 'text-forest' : 'text-paper/40 group-hover:text-paper/80'}`}
            />
            <span className="flex-1">{item.label}</span>
            {item.badge && pending > 0 ? (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  active ? 'bg-amber text-white' : 'bg-amber/90 text-white'
                }`}
              >
                {pending}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppMark() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-paper/10 text-paper">
      <GraduationCap className="h-5 w-5" />
    </span>
  );
}
