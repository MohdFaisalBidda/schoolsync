import 'server-only';

import { timingSafeEqual } from 'node:crypto';

export const DISPLAY_ROOMS = ['classroom', 'operations', 'activities'] as const;
export type DisplayRoom = (typeof DISPLAY_ROOMS)[number];

export function isDisplayRoom(value: string): value is DisplayRoom {
  return (DISPLAY_ROOMS as readonly string[]).includes(value);
}

export function displayKey(): string {
  const value = process.env.DISPLAY_KEY;
  if (!value) throw new Error('DISPLAY_KEY must be set to open a classroom display');
  return value;
}

export function displayAccessValid(provided: string | undefined): boolean {
  const expected = displayKey();
  if (!provided) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function displayUrl(room: DisplayRoom): string {
  const base = process.env.APP_BASE_URL ?? 'http://localhost:3100';
  return `${base.replace(/\/$/, '')}/display/${room}?key=${encodeURIComponent(displayKey())}`;
}
