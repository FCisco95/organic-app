import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { globSync } from 'fs';
import { sanitizeHref, sanitizeReturnTo } from '../../src/lib/security';

describe('Frontend XSS Prevention', () => {
  const srcFiles = globSync('src/**/*.{tsx,ts}', {
    ignore: ['**/node_modules/**'],
    cwd: process.cwd(),
  });

  it('should not use dangerouslySetInnerHTML', () => {
    const violations: string[] = [];

    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      if (content.includes('dangerouslySetInnerHTML')) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });

  it('should not use innerHTML directly', () => {
    const violations: string[] = [];

    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      if (content.includes('.innerHTML') && !content.includes('// security-exempt')) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });

  it('should not use document.write', () => {
    const violations: string[] = [];

    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      if (content.includes('document.write') && !content.includes('// security-exempt')) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });

  it('should not use eval()', () => {
    const violations: string[] = [];

    for (const file of srcFiles) {
      const content = readFileSync(file, 'utf-8');
      // Match eval( but not .evaluate( or similar
      if (/\beval\s*\(/.test(content) && !content.includes('// security-exempt')) {
        violations.push(file);
      }
    }

    expect(violations).toEqual([]);
  });
});

describe('sanitizeReturnTo', () => {
  it('should allow safe relative paths', () => {
    expect(sanitizeReturnTo('/profile')).toBe('/profile');
    expect(sanitizeReturnTo('/tasks/123')).toBe('/tasks/123');
    expect(sanitizeReturnTo('/')).toBe('/');
  });

  it('should block absolute URLs', () => {
    expect(sanitizeReturnTo('https://evil.com')).toBe('/');
    expect(sanitizeReturnTo('http://evil.com/steal')).toBe('/');
  });

  it('should block protocol-relative URLs', () => {
    expect(sanitizeReturnTo('//evil.com')).toBe('/');
  });

  it('should block javascript: URIs', () => {
    expect(sanitizeReturnTo('javascript:alert(1)')).toBe('/');
    expect(sanitizeReturnTo('JAVASCRIPT:alert(1)')).toBe('/');
    expect(sanitizeReturnTo('JavaScript:void(0)')).toBe('/');
  });

  it('should block data: URIs', () => {
    expect(sanitizeReturnTo('data:text/html,<h1>evil</h1>')).toBe('/');
  });

  it('should block paths not starting with /', () => {
    expect(sanitizeReturnTo('evil.com')).toBe('/');
    expect(sanitizeReturnTo('relative/path')).toBe('/');
  });

  it('should return / for null/undefined', () => {
    expect(sanitizeReturnTo(null)).toBe('/');
  });
});

describe('sanitizeHref', () => {
  it('should allow safe http/https URLs', () => {
    expect(sanitizeHref('https://example.com')).toBe('https://example.com');
    expect(sanitizeHref('http://example.com')).toBe('http://example.com');
  });

  it('should allow relative paths', () => {
    expect(sanitizeHref('/tasks/123')).toBe('/tasks/123');
  });

  it('should block javascript: URIs', () => {
    expect(sanitizeHref('javascript:alert(1)')).toBeUndefined();
    expect(sanitizeHref('JAVASCRIPT:alert(document.cookie)')).toBeUndefined();
  });

  it('should block data: URIs', () => {
    expect(sanitizeHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
  });

  it('should block vbscript: URIs', () => {
    expect(sanitizeHref('vbscript:MsgBox("XSS")')).toBeUndefined();
  });

  it('should block protocol-relative URLs', () => {
    expect(sanitizeHref('//evil.com/steal')).toBeUndefined();
  });

  it('should return undefined for null/undefined', () => {
    expect(sanitizeHref(null)).toBeUndefined();
    expect(sanitizeHref(undefined)).toBeUndefined();
  });
});
