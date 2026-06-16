import { NextResponse, type NextRequest } from 'next/server';
import { getClientIpFromHeaders } from '@/lib/utils/get-client-ip';

export async function GET(request: NextRequest) {
  const ip = getClientIpFromHeaders(request.headers) ?? 'unknown';
  return NextResponse.json({ ip });
}
