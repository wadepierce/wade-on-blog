import type { APIRoute } from 'astro';
import { db, schema } from '@/db';
import { desc } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';
import { ensureUniqueSlug } from '@/lib/slug';
import { renderMarkdown, firstParagraph } from '@/lib/markdown';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const denied = requireAdmin(ctx, 'api');
  if (denied) return denied;

  const rows = await db
    .select({
      id: schema.posts.id,
      slug: schema.posts.slug,
      title: schema.posts.title,
      published: schema.posts.published,
      publishedAt: schema.posts.publishedAt,
      updatedAt: schema.posts.updatedAt,
    })
    .from(schema.posts)
    .orderBy(desc(schema.posts.updatedAt));

  return new Response(JSON.stringify(rows), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async (ctx) => {
  const denied = requireAdmin(ctx, 'api');
  if (denied) return denied;

  const body = await ctx.request.json();
  const title = (body.title ?? 'Untitled').toString().trim() || 'Untitled';
  const contentMd = (body.contentMd ?? '').toString();
  const excerpt = (body.excerpt ?? firstParagraph(contentMd)).toString();
  const slug = await ensureUniqueSlug(body.slug ?? title);
  const contentHtml = await renderMarkdown(contentMd);

  const [row] = await db
    .insert(schema.posts)
    .values({
      title,
      slug,
      excerpt,
      contentMd,
      contentHtml,
      published: false,
    })
    .returning();

  return new Response(JSON.stringify(row), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
