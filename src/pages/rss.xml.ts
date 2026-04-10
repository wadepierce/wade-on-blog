import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { db, schema } from '@/db';
import { desc, eq } from 'drizzle-orm';

export const prerender = false;

export async function GET(ctx: APIContext) {
  const posts = await db
    .select({
      slug: schema.posts.slug,
      title: schema.posts.title,
      excerpt: schema.posts.excerpt,
      publishedAt: schema.posts.publishedAt,
    })
    .from(schema.posts)
    .where(eq(schema.posts.published, true))
    .orderBy(desc(schema.posts.publishedAt));

  return rss({
    title: 'wade on blog',
    description: 'wade on blog',
    site: ctx.site ?? process.env.RP_ORIGIN ?? 'http://localhost:4321',
    items: posts.map((p) => ({
      title: p.title,
      link: `/posts/${p.slug}`,
      description: p.excerpt,
      pubDate: p.publishedAt ?? new Date(),
    })),
  });
}
