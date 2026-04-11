import type { APIRoute } from 'astro';
import { buildRegistrationOptions } from '@/lib/passkey';
import { requireAdmin, setChallengeCookie } from '@/lib/auth';

export const prerender = false;

/**
 * Logged-in admin adds an additional passkey (e.g. desktop after enrolling on phone).
 * Reuses the same challenge-cookie pattern as first-run enrollment, but the user
 * already exists — we just build options for the current user and stash the challenge.
 */
export const POST: APIRoute = async (ctx) => {
  const denied = requireAdmin(ctx, 'api');
  if (denied) return denied;

  const user = ctx.locals.user!;
  const options = await buildRegistrationOptions({ id: user.id, email: user.email });

  setChallengeCookie(
    ctx.cookies,
    JSON.stringify({ challenge: options.challenge, userId: user.id }),
  );

  return new Response(JSON.stringify(options), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
