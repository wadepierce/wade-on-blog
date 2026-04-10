import type { APIRoute } from 'astro';
import { clearSessionCookie, deleteSession } from '@/lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, locals, redirect }) => {
  if (locals.sessionId) {
    await deleteSession(locals.sessionId);
  }
  clearSessionCookie(cookies);
  return redirect('/admin/login');
};
