export type ActionState = {
  ok: boolean;
  error?: string;
  message?: string;
  warning?: string;
} | null;

export const GRADE_LEVELS = ['Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

export const SUBJECTS = ['Science', 'Mathematics', 'English', 'Social Studies', 'Art', 'Music', 'Physical Education'];

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong';
}
