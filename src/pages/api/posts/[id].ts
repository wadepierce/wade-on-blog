import type { APIRoute } from 'astro';
import { db, schema } from '@/db';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { ensureUniqueSlug } from '@/lib/slug';
import { renderMarkdown, firstParagraph } from '@/lib/markdown';

export const prerender = false;

export const PATCH: APIRoute = async (ctx) => {
  const denied = requireAdmin(ctx, 'api');
  if (denied) return denied;

  const id = ctx.params.id!;
  const body = await ctx.request.json();

  const [existing] = await db.select().from(schema.posts).where(eq(schema.posts.id, id)).limit(1);
  if (!existing) {
    return new Response(JSON.stringify({ error: 'not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const updates: Partial<typeof schema.posts.$inferInsert> = { updatedAt: new Date() };

  if (typeof body.title === 'string') updates.title = body.title.trim() || 'Untitled';

  if (typeof body.contentMd === 'string') {
    updates.contentMd = body.contentMd;
    updates.contentHtml = await renderMarkdown(body.contentMd);
    if (typeof body.excerpt !== 'string' && !existing.excerpt) {
      updates.excerpt = firstParagraph(body.contentMd);
    }
  }

  if (typeof body.excerpt === 'string') updates.excerpt = body.excerpt;

  if (typeof body.slug === 'string' && body.slug !== existing.slug) {
    updates.slug = await ensureUniqueSlug(body.slug, id);
  }

  if (typeof body.published === 'boolean') {
    updates.published = body.published;
    if (body.published && !existing.publishedAt) {
      updates.publishedAt = new Date();
    }
  }

  const [row] = await db
    .update(schema.posts)
    .set(updates)
    .where(eq(schema.posts.id, id))
    .returning();

  return new Response(JSON.stringify(row), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const DELETE: APIRoute = async (ctx) => {
  const denied = requireAdmin(ctx, 'api');
  if (denied) return denied;

  const id = ctx.params.id!;
  await db.delete(schema.posts).where(eq(schema.posts.id, id));
  return new Response(null, { status: 204 });
};
