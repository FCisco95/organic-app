import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskSchema, updateTaskSchema } from '../schemas';

test('createTaskSchema accepts proposal-linked task payload', () => {
  const parsed = createTaskSchema.safeParse({
    title: 'Implement finalized governance proposal',
    task_type: 'custom',
    priority: 'medium',
    proposal_id: '11111111-1111-1111-1111-111111111111',
    proposal_version_id: '22222222-2222-2222-2222-222222222222',
  });

  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.proposal_id, '11111111-1111-1111-1111-111111111111');
    assert.equal(parsed.data.proposal_version_id, '22222222-2222-2222-2222-222222222222');
  }
});

test('createTaskSchema rejects proposal_version_id without proposal_id', () => {
  const parsed = createTaskSchema.safeParse({
    title: 'Invalid provenance payload',
    task_type: 'custom',
    priority: 'medium',
    proposal_version_id: '22222222-2222-2222-2222-222222222222',
  });

  assert.equal(parsed.success, false);
});

test('updateTaskSchema rejects proposal_id mutation', () => {
  const parsed = updateTaskSchema.safeParse({
    proposal_id: '33333333-3333-3333-3333-333333333333',
  });

  assert.equal(parsed.success, false);
});
