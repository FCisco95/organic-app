const FALSEY = new Set(['0', 'false', 'off', 'no']);

function normalizeFlag(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

export function isIdeasIncubatorEnabled(): boolean {
  const value =
    process.env.NEXT_PUBLIC_IDEAS_INCUBATOR_ENABLED ?? process.env.IDEAS_INCUBATOR_ENABLED;

  if (!value) {
    return true;
  }

  return !FALSEY.has(normalizeFlag(value));
}
