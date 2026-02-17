/**
 * Safely parse JSON from a Request body.
 * Returns { data, error } instead of throwing on malformed input.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request
): Promise<{ data: T; error: string | null }> {
  try {
    const data = (await request.json()) as T;
    return { data, error: null };
  } catch {
    return { data: {} as T, error: 'Invalid JSON in request body' };
  }
}
