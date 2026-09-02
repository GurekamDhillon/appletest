import { NextFunction, Request, Response } from 'express';

const ACCESS_CODE = process.env.ACCESS_CODE;

if (!ACCESS_CODE) {
  throw new Error('ACCESS_CODE environment variable is required.');
}

const COOKIE_NAME = 'fieldops_session';

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const match = header
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match?.slice(name.length + 1);
}

export function requireAccessCode(req: Request, res: Response, next: NextFunction): void {
  const header = req.header('X-Access-Code');
  const cookie = readCookie(req, COOKIE_NAME);
  if (header === ACCESS_CODE || cookie === ACCESS_CODE) {
    next();
    return;
  }
  res.status(401).json({ error: 'Invalid or missing access code.' });
}

export function login(req: Request, res: Response): void {
  const { code } = req.body ?? {};
  if (code !== ACCESS_CODE) {
    res.status(401).json({ error: 'Incorrect access code.' });
    return;
  }
  const maxAgeSeconds = 60 * 60 * 24 * 30;
  res.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${encodeURIComponent(code)}; HttpOnly; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`
  );
  res.json({ ok: true });
}
