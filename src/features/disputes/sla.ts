export const DISPUTE_SUBMISSION_WINDOW_HOURS = 48;
export const DISPUTE_REVIEWER_RESPONSE_HOURS = 72;
export const DISPUTE_SLA_EXTENSION_HOURS = 24;
const DEFAULT_AT_RISK_HOURS = 24;

export type DisputeEvidenceLateReason = 'uploaded_after_response_deadline';
export type DisputeSlaUrgency = 'overdue' | 'at_risk' | 'on_track' | 'no_deadline';

function parseDateOrNull(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed;
}

export function isDeadlinePast(
  value: string | null | undefined,
  now: Date = new Date()
): boolean {
  const deadline = parseDateOrNull(value);
  if (!deadline) return false;
  return deadline.getTime() <= now.getTime();
}

export function isDisputeWindowClosed(
  disputeWindowEndsAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  return isDeadlinePast(disputeWindowEndsAt, now);
}

export function getDisputeSlaUrgency(
  responseDeadline: string | null | undefined,
  now: Date = new Date(),
  atRiskHours: number = DEFAULT_AT_RISK_HOURS
): DisputeSlaUrgency {
  const deadline = parseDateOrNull(responseDeadline);
  if (!deadline) return 'no_deadline';

  const diffMs = deadline.getTime() - now.getTime();
  if (diffMs <= 0) return 'overdue';

  if (diffMs <= atRiskHours * 60 * 60 * 1000) {
    return 'at_risk';
  }

  return 'on_track';
}

export function isReviewerResponseTracked(status: string): boolean {
  return ['open', 'mediation', 'awaiting_response'].includes(status);
}

export function isEscalationCandidate(
  status: string,
  responseDeadline: string | null | undefined,
  now: Date = new Date()
): boolean {
  return (
    isReviewerResponseTracked(status) &&
    getDisputeSlaUrgency(responseDeadline, now) === 'overdue'
  );
}

export function classifyEvidenceTimeliness(
  responseDeadline: string | null | undefined,
  now: Date = new Date()
): { isLate: boolean; lateReason: DisputeEvidenceLateReason | null } {
  const isLate = isDeadlinePast(responseDeadline, now);
  return {
    isLate,
    lateReason: isLate ? 'uploaded_after_response_deadline' : null,
  };
}

export function computeReviewerResponseDeadline(
  now: Date = new Date(),
  hours: number = DISPUTE_REVIEWER_RESPONSE_HOURS
): string {
  return new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
}
