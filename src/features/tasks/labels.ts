/** Canonical label keys stored in the database (locale-independent). */
export const STANDARD_LABEL_KEYS = ['Growth', 'Design', 'Dev', 'Research'] as const;

const LABEL_I18N: Record<string, string> = {
  Growth: 'standardLabels.growth',
  Design: 'standardLabels.design',
  Dev: 'standardLabels.dev',
  Research: 'standardLabels.research',
};

/**
 * Returns the translated display name for a label.
 * Standard labels are looked up via i18n; custom labels pass through unchanged.
 * @param t Must be scoped to a namespace containing `standardLabels.*` keys (i.e. 'Tasks' or 'TaskDetail').
 */
export function getLabelDisplay(label: string, t: (key: string) => string): string {
  const i18nKey = LABEL_I18N[label];
  return i18nKey ? t(i18nKey) : label;
}
