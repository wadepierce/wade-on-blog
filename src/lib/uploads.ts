import sharp from 'sharp';
import { nanoid } from 'nanoid';
import fs from 'node:fs/promises';
import path from 'node:path';

export function uploadsDir(): string {
  return process.env.UPLOADS_DIR || path.resolve('./.uploads');
}

export async function ensureUploadsDir(): Promise<void> {
  await fs.mkdir(uploadsDir(), { recursive: true });
}

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 10 * 1024 * 1024;

export async function processAndSaveImage(
  buffer: Buffer,
  mimeType: string,
): Promise<{ url: string; filename: string }> {
  if (!ALLOWED.has(mimeType)) {
    throw new Error(`unsupported mime type: ${mimeType}`);
  }
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error('file too large');
  }

  await ensureUploadsDir();

  const out = await sharp(buffer, { animated: mimeType === 'image/gif' })
    .rotate()
    .resize({ width: 2000, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const filename = `${nanoid(10)}.webp`;
  const filepath = path.join(uploadsDir(), filename);
  await fs.writeFile(filepath, out);

  return { url: `/uploads/${filename}`, filename };
}

export async function readUpload(filename: string): Promise<Buffer | null> {
  // Path traversal guard — only accept bare filenames
  if (filename !== path.basename(filename)) return null;
  const filepath = path.join(uploadsDir(), filename);
  try {
    return await fs.readFile(filepath);
  } catch {
    return null;
  }
}
