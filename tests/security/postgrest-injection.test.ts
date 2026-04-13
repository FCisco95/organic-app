import { describe, it, expect } from 'vitest';
import { escapePostgrestValue } from '../../src/lib/security';

describe('escapePostgrestValue', () => {
  it('should strip commas (OR separator)', () => {
    expect(escapePostgrestValue('a,b')).toBe('ab');
    expect(escapePostgrestValue('test,name.eq.admin')).toBe('testname.eq.admin');
  });

  it('should strip parentheses (grouping operators)', () => {
    expect(escapePostgrestValue('a(b)c')).toBe('abc');
    expect(escapePostgrestValue('or(id.gt.0)')).toBe('orid.gt.0');
  });

  it('should strip all dangerous chars combined', () => {
    expect(escapePostgrestValue('a,b(c)d')).toBe('abcd');
  });

  it('should preserve dots (safe in ilike patterns)', () => {
    expect(escapePostgrestValue('john.smith')).toBe('john.smith');
    expect(escapePostgrestValue('user@example.com')).toBe('user@example.com');
  });

  it('should preserve percent signs (safe in ilike patterns)', () => {
    expect(escapePostgrestValue('100%')).toBe('100%');
  });

  it('should preserve backslashes', () => {
    expect(escapePostgrestValue('path\\to\\file')).toBe('path\\to\\file');
  });

  it('should preserve normal search text', () => {
    expect(escapePostgrestValue('John Smith')).toBe('John Smith');
    expect(escapePostgrestValue('hello world')).toBe('hello world');
    expect(escapePostgrestValue('café')).toBe('café');
  });

  it('should handle empty string', () => {
    expect(escapePostgrestValue('')).toBe('');
  });

  it('should handle email addresses (common search input)', () => {
    expect(escapePostgrestValue('user@example.com')).toBe('user@example.com');
    expect(escapePostgrestValue('john.doe@org.co')).toBe('john.doe@org.co');
  });

  it('should neutralize PostgREST filter breakout attempts', () => {
    // Attempt to inject an OR condition
    expect(escapePostgrestValue('test,email.eq.admin@evil.com')).toBe(
      'testemail.eq.admin@evil.com'
    );
    // Attempt to inject nested filter — commas and parens are stripped
    expect(escapePostgrestValue('x),id.gt.0,name.ilike.%y%,(z')).toBe(
      'xid.gt.0name.ilike.%y%z'
    );
  });
});
