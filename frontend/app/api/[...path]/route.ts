import { NextRequest, NextResponse } from 'next/server';

// Read at request time (runtime) — works correctly in Docker standalone mode.
const BACKEND = process.env.API_URL || 'http://localhost:3001';

async function proxy(req: NextRequest): Promise<NextResponse> {
  // Reconstruct backend URL from the incoming path
  const incoming = req.nextUrl.pathname; // e.g. /api/upload-ics
  const search   = req.nextUrl.search;   // e.g. ?foo=bar
  const target   = `${BACKEND}${incoming}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    // Skip headers that must not be forwarded
    if (['host', 'connection'].includes(key.toLowerCase())) return;
    headers.set(key, value);
  });

  const isBodyless = ['GET', 'HEAD'].includes(req.method);

  const upstream = await fetch(target, {
    method:  req.method,
    headers,
    body:    isBodyless ? undefined : req.body,
    // Required for streaming request bodies (file uploads)
    // @ts-expect-error — Node 18 fetch supports duplex
    duplex: 'half',
  });

  const resHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    // Let Next.js manage transfer-encoding
    if (key.toLowerCase() === 'transfer-encoding') return;
    resHeaders.set(key, value);
  });

  return new NextResponse(upstream.body, {
    status:  upstream.status,
    headers: resHeaders,
  });
}

export const GET     = proxy;
export const POST    = proxy;
export const PUT     = proxy;
export const PATCH   = proxy;
export const DELETE  = proxy;
export const OPTIONS = proxy;
