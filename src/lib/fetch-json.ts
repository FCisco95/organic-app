/**
 * Shared typed fetch helper for client-side API calls.
 *
 * - Automatically sets `Content-Type: application/json` when body is not FormData.
 * - Throws a descriptive error when the response is not OK.
 * - Disables Next.js caching by default (`cache: 'no-store'`).
 */
export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;

  const response = await fetch(url, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
    cache: init?.cache ?? 'no-store',
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string } & T;

  if (!response.ok) {
    throw new Error(data.error ?? `Request failed with status ${response.status}`);
  }

  return data as T;
}
