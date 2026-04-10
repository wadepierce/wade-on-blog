import type { APIRoute } from 'astro';
import { readUpload } from '@/lib/uploads';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const filename = params.filename;
  if (!filename) return new Response('not found', { status: 404 });
  const buf = await readUpload(filename);
  if (!buf) return new Response('not found', { status: 404 });

  // All uploads are webp after processing; gif was converted to animated webp
  const contentType = filename.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';

  return new Response(new Uint8Array(buf), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
