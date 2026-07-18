/**
 * Client-side image compression for proofs/certificates before upload.
 * Downscales to maxDim and re-encodes as JPEG at given quality.
 */
export interface CompressOptions {
  maxDim?: number; // max width/height in px
  quality?: number; // 0..1 for JPEG
  mimeType?: "image/jpeg" | "image/webp";
}

export async function compressImage(
  file: File,
  { maxDim = 1600, quality = 0.75, mimeType = "image/jpeg" }: CompressOptions = {}
): Promise<File> {
  // Skip non-images and small files (<200KB)
  if (!file.type.startsWith("image/") || file.size < 200 * 1024) return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, quality)
  );
  if (!blob || blob.size >= file.size) return file;

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const newName = file.name.replace(/\.[^.]+$/, "") + "." + ext;
  return new File([blob], newName, { type: mimeType, lastModified: Date.now() });
}
