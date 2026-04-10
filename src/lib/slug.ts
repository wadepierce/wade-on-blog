import { db, schema } from '@/db';
import { eq, and, ne } from 'drizzle-orm';

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80) || 'untitled';
}

/**
 * Returns a unique slug by appending -2, -3, ... if needed.
 * Pass excludeId when updating a post to allow keeping its own slug.
 */
export async function ensureUniqueSlug(base: string, excludeId?: string): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let n = 1;
  // Small loop: blogs won't have thousands of collisions
  while (true) {
    const where = excludeId
      ? and(eq(schema.posts.slug, candidate), ne(schema.posts.id, excludeId))
      : eq(schema.posts.slug, candidate);
    const rows = await db.select({ id: schema.posts.id }).from(schema.posts).where(where).limit(1);
    if (rows.length === 0) return candidate;
    n += 1;
    candidate = `${root}-${n}`;
  }
}
