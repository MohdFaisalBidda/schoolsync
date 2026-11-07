import 'server-only';

import type { SwitchRoom } from '@prisma/client';

import { prisma } from './db';

const API_URL = (process.env.SWITCH_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

type GatewayMessage = {
  messageId: string;
  seq: number;
  roomId: string;
  sentAt: string;
  sender: { name: string; kind: string; agentId?: string | null; userId?: string | null };
  body: string;
};

type GatewayPage = { messages: GatewayMessage[]; headSeq: number; hasMore: boolean };

let cachedCookie: string | null = null;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

async function login(): Promise<string> {
  const email = requireEnv('SWITCH_GATEWAY_EMAIL');
  const password = requireEnv('SWITCH_GATEWAY_PASSWORD');
  const response = await fetch(`${API_URL}/gateway/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Switch gateway login failed: ${response.status} ${await response.text()}`);
  }
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  const raw = headers.getSetCookie?.() ?? [response.headers.get('set-cookie') ?? ''];
  const cookie = raw
    .map((value) => value.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
  if (!cookie) throw new Error('Switch gateway login returned no session cookie');
  cachedCookie = cookie;
  return cookie;
}

async function gatewayFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const cookie = cachedCookie ?? (await login());
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Cookie: cookie,
    },
    cache: 'no-store',
  });
  if (response.status === 401) {
    const fresh = await login();
    return fetch(`${API_URL}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Cookie: fresh },
      cache: 'no-store',
    });
  }
  return response;
}

export async function recentMessages(roomId: string, limit = 20): Promise<GatewayMessage[]> {
  const response = await gatewayFetch(`/gateway/chats/${roomId}/messages?limit=${limit}`);
  if (!response.ok) {
    throw new Error(`Switch messages failed: ${response.status} ${await response.text()}`);
  }
  const page = (await response.json()) as GatewayPage;
  return page.messages;
}

export async function sendToRoom(
  roomId: string,
  body: string,
  mentionAgentIds: string[]
): Promise<GatewayMessage> {
  const response = await gatewayFetch(`/gateway/chats/${roomId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestId: crypto.randomUUID(),
      body,
      mentionAgentIds,
    }),
  });
  if (!response.ok) {
    throw new Error(`Switch send failed: ${response.status} ${await response.text()}`);
  }
  const sent = (await response.json()) as { messages: GatewayMessage[] };
  const message = sent.messages[0];
  if (!message) throw new Error('Switch send returned no message');
  return message;
}

export async function waitForAgentReply(
  roomId: string,
  agentId: string,
  afterSeq: number,
  timeoutMs = 180_000
): Promise<GatewayMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const messages = await recentMessages(roomId, 50);
    const reply = messages.find(
      (message) => message.sender.agentId === agentId && message.seq > afterSeq
    );
    if (reply && reply.body.trim()) return reply;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error('The agent did not reply in time. Check that the agent is running and try again.');
}

export async function roomByPurpose(purpose: string): Promise<SwitchRoom> {
  const room = await prisma.switchRoom.findUnique({ where: { purpose } });
  if (!room) {
    throw new Error(
      `No Switch room is configured for "${purpose}". Run the seed script after setting the room ids.`
    );
  }
  return room;
}

export async function askAgent(purpose: string, prompt: string) {
  const room = await roomByPurpose(purpose);
  const sent = await sendToRoom(room.switchRoomId, `@${room.agentName} ${prompt}`, [room.agentId]);
  const reply = await waitForAgentReply(room.switchRoomId, room.agentId, sent.seq);
  return { room, sent, reply };
}

function agentTokenFor(purpose: string): string {
  if (purpose === 'operations' && process.env.SWITCH_OPERATIONS_AGENT_TOKEN) {
    return process.env.SWITCH_OPERATIONS_AGENT_TOKEN;
  }
  if (purpose === 'activities' && process.env.SWITCH_ACTIVITIES_AGENT_TOKEN) {
    return process.env.SWITCH_ACTIVITIES_AGENT_TOKEN;
  }
  return requireEnv('SWITCH_TEACHING_AGENT_TOKEN');
}

export async function postAsAgent(purpose: string, content: string): Promise<void> {
  const room = await roomByPurpose(purpose);
  const token = agentTokenFor(purpose);
  const response = await fetch(`${API_URL}/agents/${room.agentId}/message`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ room_id: room.switchRoomId, content }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Switch agent message failed: ${response.status} ${await response.text()}`);
  }
}

export function chatUrl(value?: string | null): string | null {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const base = process.env.SWITCH_PUBLIC_URL ?? 'http://localhost:8065';
  return `${base}/switch/channels/${value}`;
}
