import { headers } from 'next/headers';

/**
 * Extract client IP from a Headers object.
 * Checks x-forwarded-for (first entry in comma-separated list), then x-real-ip.
 * Returns null if neither header is present.
 */
export function getClientIpFromHeaders(h: Headers): string | null {
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('x-real-ip') ??
    null
  );
}

/**
 * Get client IP in server actions / server components.
 * Convenience wrapper that reads from next/headers' headers().
 */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  return getClientIpFromHeaders(h);
}
