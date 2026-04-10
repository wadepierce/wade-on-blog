import type { APIContext, AstroCookies } from 'astro';
import { eq, and, gt } from 'drizzle-orm';
import { db, schema } from '@/db';
import crypto from 'node:crypto';

const SESSION_COOKIE = 'sid';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function newSessionId(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export async function createSession(userId: string): Promise<{ id: string; expiresAt: Date }> {
  const id = newSessionId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(schema.sessions).values({ id, userId, expiresAt });
  return { id, expiresAt };
}

export function setSessionCookie(cookies: AstroCookies, id: string, expiresAt: Date) {
  cookies.set(SESSION_COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export function clearSessionCookie(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
}

export function getSessionCookie(cookies: AstroCookies): string | null {
  return cookies.get(SESSION_COOKIE)?.value ?? null;
}

export async function getUserFromSession(sessionId: string | null) {
  if (!sessionId) return null;
  const rows = await db
    .select({
      sessionId: schema.sessions.id,
      userId: schema.users.id,
      email: schema.users.email,
      expiresAt: schema.sessions.expiresAt,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, sessionId), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return { id: row.userId, email: row.email, sessionId: row.sessionId };
}

export async function deleteSession(sessionId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
}

/**
 * Guards an admin route. Call at the top of any /admin page or protected API route.
 * For pages, returns a Response redirect if unauthorized (caller should `return` it).
 * For API routes, returns a 401 Response.
 */
export function requireAdmin(ctx: APIContext, mode: 'page' | 'api' = 'page'): Response | null {
  if (!ctx.locals.user) {
    if (mode === 'page') {
      return ctx.redirect('/admin/login');
    }
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return null;
}

// Short-lived challenge cookie used during WebAuthn flows
const CHALLENGE_COOKIE = 'webauthn_challenge';
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function setChallengeCookie(cookies: AstroCookies, challenge: string) {
  cookies.set(CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(Date.now() + CHALLENGE_TTL_MS),
  });
}

export function getChallengeCookie(cookies: AstroCookies): string | null {
  return cookies.get(CHALLENGE_COOKIE)?.value ?? null;
}

export function clearChallengeCookie(cookies: AstroCookies) {
  cookies.delete(CHALLENGE_COOKIE, { path: '/' });
}
