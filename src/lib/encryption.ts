import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const FORMAT_VERSION = 'v1';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;

function decodeMasterKey(masterKey: string): Buffer {
  const trimmed = masterKey.trim();

  if (!trimmed) {
    throw new Error('TWITTER_TOKEN_ENCRYPTION_KEY is required');
  }

  if (/^[a-fA-F0-9]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  const normalizedBase64 = trimmed.replace(/-/g, '+').replace(/_/g, '/');
  const base64Buffer = Buffer.from(normalizedBase64, 'base64');
  if (base64Buffer.length === KEY_LENGTH) {
    return base64Buffer;
  }

  const utf8Buffer = Buffer.from(trimmed, 'utf8');
  if (utf8Buffer.length === KEY_LENGTH) {
    return utf8Buffer;
  }

  throw new Error(
    'TWITTER_TOKEN_ENCRYPTION_KEY must be 32 raw bytes, 64 hex chars, or base64/base64url for 32 bytes'
  );
}

export function encryptToken(plaintext: string, masterKey: string): string {
  const key = decodeMasterKey(masterKey);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    FORMAT_VERSION,
    iv.toString('base64url'),
    authTag.toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.');
}

export function decryptToken(ciphertext: string, masterKey: string): string {
  const [version, ivPart, authTagPart, encryptedPart] = ciphertext.split('.');

  if (!version || !ivPart || !authTagPart || !encryptedPart) {
    throw new Error('Invalid encrypted token format');
  }

  if (version !== FORMAT_VERSION) {
    throw new Error('Unsupported encrypted token version');
  }

  const key = decodeMasterKey(masterKey);
  const iv = Buffer.from(ivPart, 'base64url');
  const authTag = Buffer.from(authTagPart, 'base64url');
  const encrypted = Buffer.from(encryptedPart, 'base64url');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
