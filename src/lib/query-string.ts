/**
 * Build a URL query string from a record, skipping null/undefined/empty values.
 *
 * Returns an empty string when no params qualify, or `?key=val&…` otherwise.
 */
export function buildQueryString(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}
