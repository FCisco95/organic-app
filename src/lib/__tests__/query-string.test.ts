import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQueryString } from '@/lib/query-string';

test('returns empty string when no filters', () => {
  assert.equal(buildQueryString({}), '');
});

test('skips null values', () => {
  assert.equal(buildQueryString({ a: null }), '');
});

test('skips undefined values', () => {
  assert.equal(buildQueryString({ a: undefined }), '');
});

test('skips empty string values', () => {
  assert.equal(buildQueryString({ a: '' }), '');
});

test('includes zero as a valid value', () => {
  assert.equal(buildQueryString({ page: 0 }), '?page=0');
});

test('includes false as a valid value', () => {
  assert.equal(buildQueryString({ active: false }), '?active=false');
});

test('builds query from multiple params', () => {
  const result = buildQueryString({ page: 1, limit: 20, search: 'hello' });
  assert.equal(result, '?page=1&limit=20&search=hello');
});

test('skips mixed null/undefined while keeping valid', () => {
  const result = buildQueryString({ a: 'yes', b: null, c: undefined, d: 42 });
  assert.equal(result, '?a=yes&d=42');
});
