/** The server's error message for a failed request, or null when it went through. */
export async function failed(res: Response): Promise<string | null> {
  if (res.ok) return null;
  const body = await res.json().catch(() => null);
  return body?.error ?? `Request failed (${res.status})`;
}
