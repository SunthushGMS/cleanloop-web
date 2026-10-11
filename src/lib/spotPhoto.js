import { ALLOWED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "@/lib/spotConstants";

// Leading "magic bytes" of each allowed format. We check the file's actual
// content rather than trusting the type the browser claims.
function sniffImageType(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (buf.length >= 8 && PNG.every((b, i) => buf[i] === b)) return "image/png";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/**
 * Validates an uploaded photo (a File from request.formData()).
 * Returns { photo } ready to store, { photo: null } when no file was sent,
 * or { error } with a user-facing message.
 */
export async function readUploadedPhoto(file) {
  if (!file || typeof file === "string" || file.size === 0) return { photo: null };

  if (file.size > MAX_PHOTO_BYTES) {
    return { error: `Photo must be under ${Math.round(MAX_PHOTO_BYTES / 1024)} KB` };
  }

  const data = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImageType(data);
  if (!contentType || !ALLOWED_PHOTO_TYPES.includes(contentType)) {
    return { error: "Photo must be a JPG, PNG or WebP image" };
  }

  return { photo: { data, contentType, size: data.length } };
}
