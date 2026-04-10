import type { APIRoute } from 'astro';
import { requireAdmin } from '@/lib/auth';
import { processAndSaveImage } from '@/lib/uploads';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const denied = requireAdmin(ctx, 'api');
  if (denied) return denied;

  const form = await ctx.request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return new Response(JSON.stringify({ error: 'missing file' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const result = await processAndSaveImage(buf, file.type);
    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
