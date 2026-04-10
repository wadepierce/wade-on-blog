import type { APIRoute } from 'astro';
import { verifyAuthentication } from '@/lib/passkey';
import {
  getChallengeCookie,
  clearChallengeCookie,
  createSession,
  setSessionCookie,
} from '@/lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, request }) => {
  const raw = getChallengeCookie(cookies);
  if (!raw) {
    return new Response(JSON.stringify({ error: 'no challenge' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let parsed: { challenge: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return new Response(JSON.stringify({ error: 'bad challenge cookie' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();

  let userId: string;
  try {
    ({ userId } = await verifyAuthentication(body, parsed.challenge));
  } catch (err) {
    clearChallengeCookie(cookies);
    return new Response(
      JSON.stringify({ error: 'verification failed', detail: String(err) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  clearChallengeCookie(cookies);

  const session = await createSession(userId);
  setSessionCookie(cookies, session.id, session.expiresAt);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
