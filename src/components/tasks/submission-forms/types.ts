import type { TaskWithRelations } from '@/features/tasks';

export interface SubmissionFormProps {
  task: TaskWithRelations;
  onSuccess?: () => void;
  onCancel?: () => void;
}
