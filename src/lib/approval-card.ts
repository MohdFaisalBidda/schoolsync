import 'server-only';

import type { ApprovalKind } from '@prisma/client';

import { approvalUrl } from './approval-links';
import { KIND_LABELS } from './roles';
import { postAsAgent } from './switch';

const ROOM_FOR_KIND: Record<ApprovalKind, string> = {
  MATERIAL: 'classroom',
  NOTICE: 'operations',
  ACTIVITY: 'activities',
};

export async function postApprovalCard(
  kind: ApprovalKind,
  id: string,
  title: string,
  detail: string
): Promise<{ warning?: string }> {
  try {
    const url = approvalUrl(kind, id);
    const text = [
      `Approval needed - ${KIND_LABELS[kind]}`,
      title,
      detail,
      '',
      'Nothing is published until a person approves.',
      `Review and decide: ${url}`,
    ].join('\n');

    await postAsAgent(ROOM_FOR_KIND[kind], text);
    return {};
  } catch (error) {
    return {
      warning: `The draft is saved, but the approval card could not be posted to chat: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
    };
  }
}
