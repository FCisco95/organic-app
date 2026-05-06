/**
 * Translation-aware sprint phase label resolver.
 *
 * The sprint status enum on the DB side uses snake_case identifiers
 * (`active`, `dispute_window`, etc). The bento hero needs to surface a
 * human-readable, localized label. This helper looks up the phase key
 * under `Dashboard.sprintHero.phaseLabel.<status>`, falling back to
 * `unknown` (or a dash for null) so a new DB enum value never crashes
 * the UI when translations haven't shipped yet.
 */
const KNOWN_STATUSES = new Set([
  'draft',
  'active',
  'review',
  'dispute_window',
  'settlement',
  'completed',
  'cancelled',
]);

type TFunction = (key: string) => string;

export function resolveSprintPhaseLabel(status: string | null, t: TFunction): string {
  if (!status) return '—';
  const normalized = status.trim().toLowerCase();
  if (KNOWN_STATUSES.has(normalized)) {
    return t(`phaseLabel.${normalized}`);
  }
  return t('phaseLabel.unknown');
}
