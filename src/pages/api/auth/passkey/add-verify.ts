import type { APIRoute } from 'astro';
import { verifyRegistration } from '@/lib/passkey';
import {
  getChallengeCookie,
  clearChallengeCookie,
  requireAdmin,
} from '@/lib/auth';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const denied = requireAdmin(ctx, 'api');
  if (denied) return denied;

  const user = ctx.locals.user!;

  const raw = getChallengeCookie(ctx.cookies);
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

  // The challenge cookie is user-scoped — reject if it doesn't match the session.
  if (parsed.userId !== user.id) {
    clearChallengeCookie(ctx.cookies);
    return new Response(JSON.stringify({ error: 'challenge/user mismatch' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await ctx.request.json();

  try {
    await verifyRegistration(user.id, body, parsed.challenge);
  } catch (err) {
    clearChallengeCookie(ctx.cookies);
    return new Response(
      JSON.stringify({ error: 'verification failed', detail: String(err) }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  clearChallengeCookie(ctx.cookies);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
