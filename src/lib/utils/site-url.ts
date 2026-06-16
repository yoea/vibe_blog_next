import { headers } from 'next/headers';

function normalizeSiteUrl(siteUrl: string) {
  return siteUrl.replace(/\/+$/, '');
}

export async function getSiteUrl() {
  const requestHeaders = await headers();
  const forwardedHost = requestHeaders
    .get('x-forwarded-host')
    ?.split(',')[0]
    .trim();
  const host = forwardedHost || requestHeaders.get('host');

  if (host) {
    const forwardedProto = requestHeaders
      .get('x-forwarded-proto')
      ?.split(',')[0]
      .trim();
    const protocol =
      forwardedProto ||
      (process.env.NODE_ENV !== 'production' ? 'http' : 'https');
    return normalizeSiteUrl(`${protocol}://${host}`);
  }

  return normalizeSiteUrl(`http://localhost:${process.env.PORT || 3000}`);
}
