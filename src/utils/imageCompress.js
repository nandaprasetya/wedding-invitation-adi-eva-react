// Client-side image helper: preserves Safari/iPhone-compatible JPG/PNG (no WebP conversion).

export function formatBytes(bytes) {
  const num = Number(bytes) || 0;
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${Math.round(num / 1024)} KB`;
  return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

export async function prepareImageForUpload(file, { maxWidth = 1600, quality = 0.86 } = {}) {
  const originalSize = Number(file?.size) || 0;
  const originalName = file?.name || 'image.jpg';
  const baseName = String(originalName).replace(/\.[^.]+$/, '');

  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return {
      blob: file,
      width: null,
      height: null,
      filename: originalName,
      originalSize,
      compressedSize: originalSize,
    };
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const scale = bitmap.width > maxWidth ? maxWidth / bitmap.width : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    // Keep original file untouched when already within dimensions and reasonable size
    const isJpeg = file.type === 'image/jpeg';
    const isPng = file.type === 'image/png';
    if (scale === 1 && (!isJpeg || originalSize <= 1.2 * 1024 * 1024)) {
      return {
        blob: file,
        width,
        height,
        filename: originalName,
        originalSize,
        compressedSize: originalSize,
      };
    }

    // Only re-encode JPEG or oversized PNG in their native Safari-compatible format (never WebP)
    if (!isJpeg && !isPng) {
      return {
        blob: file,
        width,
        height,
        filename: originalName,
        originalSize,
        compressedSize: originalSize,
      };
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        blob: file,
        width,
        height,
        filename: originalName,
        originalSize,
        compressedSize: originalSize,
      };
    }
    ctx.drawImage(bitmap, 0, 0, width, height);

    const targetMime = isPng ? 'image/png' : 'image/jpeg';
    const targetExt = isPng ? 'png' : 'jpg';
    const encodedBlob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), targetMime, isJpeg ? quality : undefined)
    );

    if (!encodedBlob || encodedBlob.type !== targetMime || encodedBlob.size >= originalSize) {
      return {
        blob: file,
        width,
        height,
        filename: originalName,
        originalSize,
        compressedSize: originalSize,
      };
    }

    return {
      blob: encodedBlob,
      width,
      height,
      filename: `${baseName}.${targetExt}`,
      originalSize,
      compressedSize: encodedBlob.size,
    };
  } finally {
    bitmap?.close?.();
  }
}
