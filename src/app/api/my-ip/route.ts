import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return NextResponse.json({ ip });
}
