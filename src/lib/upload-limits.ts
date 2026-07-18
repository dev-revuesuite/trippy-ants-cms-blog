/** Keep in sync with `serverActions.bodySizeLimit` in next.config.mjs (Vercel-safe). */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = '4 MB';

const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|heic|heif|svg)$/i;

export function isAllowedImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  if (!file.type || file.type === 'application/octet-stream') {
    return IMAGE_EXT.test(file.name);
  }
  return false;
}

export function validateImageFile(file: File): string | null {
  if (!isAllowedImageFile(file)) {
    return 'Only image files are supported (JPEG, PNG, WebP, GIF, etc.).';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `File must be ${MAX_UPLOAD_LABEL} or smaller. Try compressing the image or exporting at a lower resolution.`;
  }
  return null;
}
