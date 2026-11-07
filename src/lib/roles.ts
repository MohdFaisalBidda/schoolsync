import type { Role } from '@prisma/client';

export const ROLE_LABELS: Record<Role, string> = {
  STUDENT: 'Student',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
  COORDINATOR: 'Coordinator',
  ADMIN: 'Administrator',
  PRINCIPAL: 'Principal',
};

export const ROLE_HOME: Record<Role, string> = {
  STUDENT: 'Approved worksheets and class activities',
  TEACHER: 'Create, generate and approve classroom material',
  PARENT: 'Approved notices for your child',
  COORDINATOR: 'Plan and approve school activities',
  ADMIN: 'Manage the school workspace',
  PRINCIPAL: 'Review and publish school notices',
};

export function isStaff(role: Role): boolean {
  return role === 'TEACHER' || role === 'COORDINATOR' || role === 'PRINCIPAL' || role === 'ADMIN';
}

export function canReview(role: Role, kind: 'MATERIAL' | 'NOTICE' | 'ACTIVITY'): boolean {
  if (role === 'ADMIN') return true;
  if (kind === 'MATERIAL') return role === 'TEACHER';
  if (kind === 'NOTICE') return role === 'PRINCIPAL';
  return role === 'COORDINATOR';
}

export function reviewKinds(role: Role): ('MATERIAL' | 'NOTICE' | 'ACTIVITY')[] {
  if (role === 'ADMIN') return ['MATERIAL', 'NOTICE', 'ACTIVITY'];
  if (role === 'TEACHER') return ['MATERIAL'];
  if (role === 'PRINCIPAL') return ['NOTICE'];
  if (role === 'COORDINATOR') return ['ACTIVITY'];
  return [];
}

export function canCreate(role: Role, kind: 'MATERIAL' | 'NOTICE' | 'ACTIVITY'): boolean {
  if (role === 'ADMIN') return true;
  if (kind === 'MATERIAL') return role === 'TEACHER';
  if (kind === 'NOTICE') return role === 'PRINCIPAL';
  return role === 'COORDINATOR';
}

export function noticeAudiencesFor(role: Role): ('ALL' | 'STUDENTS' | 'PARENTS' | 'STAFF')[] {
  if (role === 'STUDENT') return ['ALL', 'STUDENTS'];
  if (role === 'PARENT') return ['ALL', 'PARENTS'];
  return ['ALL', 'STUDENTS', 'PARENTS', 'STAFF'];
}

export function audienceLabel(audience: 'ALL' | 'STUDENTS' | 'PARENTS' | 'STAFF'): string {
  return {
    ALL: 'Whole school',
    STUDENTS: 'Students',
    PARENTS: 'Parents & guardians',
    STAFF: 'Staff',
  }[audience];
}

export const STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Awaiting approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;

export const KIND_LABELS = {
  MATERIAL: 'Teaching material',
  NOTICE: 'Notice',
  ACTIVITY: 'Activity',
} as const;
