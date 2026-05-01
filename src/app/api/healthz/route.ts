import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

function findMeta(): string | null {
  const cwd = process.cwd();
  const candidates = [
    join(cwd, '.deploy-meta'),
    join(cwd, '.next', 'standalone', '.deploy-meta'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return readFileSync(p, 'utf-8');
  }
  return null;
}

export async function GET() {
  const content = findMeta();
  if (!content)
    return NextResponse.json({ status: 'ok', note: 'deploy-meta not found' });

  const meta: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const idx = line.indexOf('=');
    if (idx !== -1) meta[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return NextResponse.json({ status: 'ok', ...meta });
}
