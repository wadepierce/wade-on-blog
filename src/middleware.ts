import { defineMiddleware } from 'astro:middleware';
import { getSessionCookie, getUserFromSession } from '@/lib/auth';
import { ensureUploadsDir } from '@/lib/uploads';
import { runMigrations } from '@/db/migrate';

let bootPromise: Promise<void> | null = null;

async function bootOnce() {
  if (!bootPromise) {
    bootPromise = (async () => {
      await ensureUploadsDir();
      try {
        await runMigrations();
      } catch (err) {
        // Don't cache the failure — let the next request retry. A transient
        // database hiccup during cold start shouldn't permanently poison the
        // process.
        bootPromise = null;
        console.error('[boot] migration failed:', err);
        throw err;
      }
    })();
  }
  return bootPromise;
}

export const onRequest = defineMiddleware(async (context, next) => {
  await bootOnce();

  const sid = getSessionCookie(context.cookies);
  const user = await getUserFromSession(sid);
  context.locals.user = user ? { id: user.id, email: user.email } : null;
  context.locals.sessionId = user?.sessionId ?? null;

  return next();
});
