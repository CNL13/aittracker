import type { VercelRequest, VercelResponse } from '@vercel/node';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function getHeaderValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function getRequestHost(req: VercelRequest): string | undefined {
  const headers = req.headers || {};
  return getHeaderValue(headers['x-forwarded-host']) || getHeaderValue(headers.host);
}

function parseOrigin(value: string | undefined): URL | null {
  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAllowedOrigin(req: VercelRequest): boolean {
  const headers = req.headers || {};
  const origin = parseOrigin(getHeaderValue(headers.origin));
  const referer = parseOrigin(getHeaderValue(headers.referer));
  const source = origin || referer;

  if (!source) {
    return true;
  }

  const requestHost = getRequestHost(req);
  const appUrl = process.env.APP_URL ? parseOrigin(process.env.APP_URL) : null;
  const allowedHosts = new Set(
    [
      requestHost,
      appUrl?.host,
      'localhost:3000',
      'localhost:5173',
      'localhost:5174',
      '127.0.0.1:5173',
      '127.0.0.1:5174',
    ]
      .filter(Boolean)
      .map((host) => String(host).toLowerCase()),
  );

  return allowedHosts.has(source.host.toLowerCase());
}

export function rejectInvalidMutation(req: VercelRequest, res: VercelResponse): boolean {
  if (!MUTATING_METHODS.has(req.method || '')) {
    return false;
  }

  if (!isAllowedOrigin(req)) {
    res.status(403).json({ error: 'Invalid request origin' });
    return true;
  }

  return false;
}

export function currentDateInBusinessTz(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
