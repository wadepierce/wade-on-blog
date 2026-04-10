import type { APIRoute } from 'astro';
import { db, schema } from '@/db';
import { buildRegistrationOptions } from '@/lib/passkey';
import { setChallengeCookie } from '@/lib/auth';

export const prerender = false;

/**
 * First-run enrollment: only works if the users table is empty.
 * Creates a placeholder user (email = 'admin') if none exists, then returns options.
 * The real identity is the passkey itself.
 */
export const POST: APIRoute = async ({ cookies, request }) => {
  const existingUsers = await db.select({ id: schema.users.id }).from(schema.users).limit(1);
  if (existingUsers.length > 0) {
    return new Response(JSON.stringify({ error: 'enrollment closed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === 'string' && body.email.length > 0 ? body.email : 'admin';

  const [user] = await db.insert(schema.users).values({ email }).returning();
  if (!user) throw new Error('failed to create user');

  const options = await buildRegistrationOptions({ id: user.id, email: user.email });

  // Stash challenge + pending user id in cookie
  setChallengeCookie(
    cookies,
    JSON.stringify({ challenge: options.challenge, userId: user.id }),
  );

  return new Response(JSON.stringify(options), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
