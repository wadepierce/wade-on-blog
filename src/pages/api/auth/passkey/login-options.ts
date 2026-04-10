import type { APIRoute } from 'astro';
import { buildAuthenticationOptions } from '@/lib/passkey';
import { setChallengeCookie } from '@/lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies }) => {
  const options = await buildAuthenticationOptions();
  setChallengeCookie(cookies, JSON.stringify({ challenge: options.challenge }));
  return new Response(JSON.stringify(options), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
