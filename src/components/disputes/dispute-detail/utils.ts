import { formatDistanceToNow, format } from 'date-fns';

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return 'recently';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'recently';
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return format(date, 'PPp');
}
