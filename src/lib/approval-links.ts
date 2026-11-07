import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

import type { ApprovalKind } from '@prisma/client';

const LINK_TTL_SECONDS = 7 * 24 * 60 * 60;

function linkSecret(): string {
  const value = process.env.APPROVAL_LINK_SECRET ?? process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error('APPROVAL_LINK_SECRET or AUTH_SECRET must be set to at least 32 characters');
  }
  return value;
}

function appBaseUrl(): string {
  const value = process.env.APP_BASE_URL;
  if (!value) {
    throw new Error('APP_BASE_URL is not set. Set it to the app URL reachable from chat.');
  }
  return value.replace(/\/$/, '');
}

function signature(kind: ApprovalKind, id: string, expiresAt: number): string {
  return createHmac('sha256', linkSecret())
    .update(`${kind}:${id}:${expiresAt}`)
    .digest('base64url');
}

export function approvalToken(kind: ApprovalKind, id: string): string {
  const expiresAt = Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS;
  return `${expiresAt}.${signature(kind, id, expiresAt)}`;
}

export function verifyApprovalToken(kind: ApprovalKind, id: string, token: string): boolean {
  const [rawExpiresAt, provided] = token.split('.');
  if (!rawExpiresAt || !provided || !/^\d+$/.test(rawExpiresAt)) return false;
  const expiresAt = Number(rawExpiresAt);
  if (expiresAt < Math.floor(Date.now() / 1000)) return false;
  const expected = signature(kind, id, expiresAt);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function approvalUrl(kind: ApprovalKind, id: string): string {
  const token = approvalToken(kind, id);
  return `${appBaseUrl()}/approve/${kind.toLowerCase()}/${id}?token=${encodeURIComponent(token)}`;
}
