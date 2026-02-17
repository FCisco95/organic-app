import { createHash, randomBytes } from 'crypto';

function toBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function generateCodeVerifier(byteLength = 64): string {
  return toBase64Url(randomBytes(byteLength));
}

export function createCodeChallenge(codeVerifier: string): string {
  return toBase64Url(createHash('sha256').update(codeVerifier).digest());
}

export function generatePkcePair(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = generateCodeVerifier();
  return {
    codeVerifier,
    codeChallenge: createCodeChallenge(codeVerifier),
  };
}
