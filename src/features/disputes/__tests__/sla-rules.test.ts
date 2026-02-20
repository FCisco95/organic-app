import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyEvidenceTimeliness,
  computeReviewerResponseDeadline,
  DISPUTE_REVIEWER_RESPONSE_HOURS,
  isDeadlinePast,
  isDisputeWindowClosed,
} from '@/features/disputes/sla';

test('deadline helpers classify open and closed windows correctly', () => {
  const now = new Date('2026-02-20T12:00:00.000Z');
  const future = '2026-02-20T12:15:00.000Z';
  const past = '2026-02-20T11:59:00.000Z';

  assert.equal(isDeadlinePast(future, now), false);
  assert.equal(isDeadlinePast(past, now), true);
  assert.equal(isDisputeWindowClosed(future, now), false);
  assert.equal(isDisputeWindowClosed(past, now), true);
});

test('evidence timeliness marks late uploads after response deadline', () => {
  const now = new Date('2026-02-20T12:00:00.000Z');
  const future = '2026-02-20T12:15:00.000Z';
  const past = '2026-02-20T11:59:00.000Z';

  assert.deepEqual(classifyEvidenceTimeliness(future, now), {
    isLate: false,
    lateReason: null,
  });

  assert.deepEqual(classifyEvidenceTimeliness(past, now), {
    isLate: true,
    lateReason: 'uploaded_after_response_deadline',
  });

  assert.deepEqual(classifyEvidenceTimeliness(null, now), {
    isLate: false,
    lateReason: null,
  });
});

test('reviewer response deadline uses the fixed SLA window by default', () => {
  const now = new Date('2026-02-20T12:00:00.000Z');
  const deadline = computeReviewerResponseDeadline(now);
  const expected = new Date(
    now.getTime() + DISPUTE_REVIEWER_RESPONSE_HOURS * 60 * 60 * 1000
  ).toISOString();
  assert.equal(deadline, expected);
});
