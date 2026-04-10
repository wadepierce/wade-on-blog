import type { APIRoute } from 'astro';
import { verifyRegistration } from '@/lib/passkey';
import {
  getChallengeCookie,
  clearChallengeCookie,
  createSession,
  setSessionCookie,
} from '@/lib/auth';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) => {
  const raw = getChallengeCookie(cookies);
  if (!raw) {
    return new Response(JSON.stringify({ error: 'no challenge' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let parsed: { challenge: string; userId: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: 'bad challenge cookie' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();

  try {
    await verifyRegistration(parsed.userId, body, parsed.challenge);
  } catch (err) {
    // Roll back the placeholder user so enrollment can be retried
    await db.delete(schema.users).where(eq(schema.users.id, parsed.userId));
    clearChallengeCookie(cookies);
    return new Response(
      JSON.stringify({ error: 'verification failed', detail: String(err) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  clearChallengeCookie(cookies);

  const session = await createSession(parsed.userId);
  setSessionCookie(cookies, session.id, session.expiresAt);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
