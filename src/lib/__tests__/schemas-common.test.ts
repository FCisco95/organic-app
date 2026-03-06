import assert from 'node:assert/strict';
import test from 'node:test';
import { commentBodySchema, paginationSchema, searchSchema, uuidParamSchema } from '@/lib/schemas/common';

// ─── commentBodySchema ──────────────────────────────────────────────────

test('commentBodySchema rejects empty string', () => {
  const result = commentBodySchema().safeParse('');
  assert.equal(result.success, false);
});

test('commentBodySchema rejects whitespace-only string', () => {
  const result = commentBodySchema().safeParse('   ');
  assert.equal(result.success, false);
});

test('commentBodySchema accepts valid comment', () => {
  const result = commentBodySchema().safeParse('Hello world');
  assert.equal(result.success, true);
  assert.equal(result.data, 'Hello world');
});

test('commentBodySchema trims whitespace', () => {
  const result = commentBodySchema().safeParse('  trimmed  ');
  assert.equal(result.success, true);
  assert.equal(result.data, 'trimmed');
});

test('commentBodySchema enforces custom max length', () => {
  const result = commentBodySchema(10).safeParse('12345678901');
  assert.equal(result.success, false);
});

test('commentBodySchema default max is 5000', () => {
  const long = 'a'.repeat(5000);
  assert.equal(commentBodySchema().safeParse(long).success, true);
  assert.equal(commentBodySchema().safeParse(long + 'x').success, false);
});

// ─── paginationSchema ───────────────────────────────────────────────────

test('paginationSchema provides defaults', () => {
  const result = paginationSchema.safeParse({});
  assert.equal(result.success, true);
  assert.deepEqual(result.data, { page: 1, limit: 20 });
});

test('paginationSchema coerces string numbers', () => {
  const result = paginationSchema.safeParse({ page: '3', limit: '50' });
  assert.equal(result.success, true);
  assert.deepEqual(result.data, { page: 3, limit: 50 });
});

test('paginationSchema rejects page < 1', () => {
  assert.equal(paginationSchema.safeParse({ page: 0 }).success, false);
});

test('paginationSchema rejects limit > 100', () => {
  assert.equal(paginationSchema.safeParse({ limit: 101 }).success, false);
});

test('paginationSchema rejects non-integer', () => {
  assert.equal(paginationSchema.safeParse({ page: 1.5 }).success, false);
});

// ─── searchSchema ───────────────────────────────────────────────────────

test('searchSchema accepts empty object', () => {
  const result = searchSchema.safeParse({});
  assert.equal(result.success, true);
});

test('searchSchema trims and accepts short string', () => {
  const result = searchSchema.safeParse({ search: '  hello  ' });
  assert.equal(result.success, true);
  assert.equal(result.data?.search, 'hello');
});

test('searchSchema rejects string over 200 chars', () => {
  assert.equal(searchSchema.safeParse({ search: 'a'.repeat(201) }).success, false);
});

// ─── uuidParamSchema ────────────────────────────────────────────────────

test('uuidParamSchema accepts valid UUID', () => {
  const result = uuidParamSchema.safeParse({ id: '550e8400-e29b-41d4-a716-446655440000' });
  assert.equal(result.success, true);
});

test('uuidParamSchema rejects non-UUID string', () => {
  assert.equal(uuidParamSchema.safeParse({ id: 'not-a-uuid' }).success, false);
});

test('uuidParamSchema rejects empty string', () => {
  assert.equal(uuidParamSchema.safeParse({ id: '' }).success, false);
});
