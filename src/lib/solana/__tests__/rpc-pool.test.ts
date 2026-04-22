import { describe, it, expect } from 'vitest';
import { classifyRpcError, type RpcErrorKind } from '../rpc-pool';

function check(error: unknown, expected: RpcErrorKind): void {
  expect(classifyRpcError(error)).toBe(expected);
}

describe('classifyRpcError', () => {
  it('treats network timeouts as transient', () => {
    check(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }), 'transient');
    check(new Error('Request timed out'), 'transient');
  });

  it('treats ECONN* as transient', () => {
    check(Object.assign(new Error('econnreset'), { code: 'ECONNRESET' }), 'transient');
    check(Object.assign(new Error('refused'), { code: 'ECONNREFUSED' }), 'transient');
  });

  it('treats HTTP 429 and 5xx as transient', () => {
    check({ status: 429, message: 'rate limited' }, 'transient');
    check({ status: 503, message: 'service unavailable' }, 'transient');
    check({ response: { status: 502 }, message: 'bad gateway' }, 'transient');
  });

  it('treats JSON-RPC -32005 and -32603 as transient', () => {
    check({ code: -32005, message: 'rate limit exceeded' }, 'transient');
    check({ code: -32603, message: 'internal error' }, 'transient');
  });

  it('treats HTTP 4xx (excluding 429) as permanent', () => {
    check({ status: 400, message: 'bad request' }, 'permanent');
    check({ status: 401, message: 'unauthorized' }, 'permanent');
    check({ status: 404, message: 'not found' }, 'permanent');
  });

  it('treats JSON-RPC -32602 invalid params as permanent', () => {
    check({ code: -32602, message: 'invalid params' }, 'permanent');
  });

  it('treats "could not find account" as empty-ok', () => {
    check(new Error('could not find account'), 'empty-ok');
    check(new Error('Account does not exist'), 'empty-ok');
  });

  it('treats POJO errors with empty-ok message text as empty-ok', () => {
    check({ message: 'could not find account', status: 404 }, 'empty-ok');
    check({ message: 'Account does not exist' }, 'empty-ok');
  });

  it('treats unknown errors as transient (fail-open for retry)', () => {
    check(new Error('something weird'), 'transient');
    check('string error', 'transient');
    check(null, 'transient');
  });
});
