// Browser-only helper: shrinks a photo before upload.
// Re-drawing the image on a canvas and re-encoding it also drops EXIF
// metadata, including GPS location, so it never reaches the server.

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

function canvasToBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Resizes `file` so its longest side is at most `maxSize` px and re-encodes
 * it as JPEG, lowering quality until it's under `maxBytes`.
 * Throws an Error with a user-facing message if the file can't be used.
 */
export async function resizeImage(file, { maxSize = 800, maxBytes = 300 * 1024 } = {}) {
  if (!ACCEPTED.includes(file.type)) {
    // e.g. iPhone HEIC photos, which most browsers can't draw on a canvas.
    throw new Error("Please choose a JPG, PNG or WebP photo");
  }

  let bitmap;
  try {
    // "from-image" applies the camera's rotation before the EXIF data is dropped.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Couldn't read that photo. Try a different JPG or PNG.");
  }

  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  // White background so transparent PNGs don't turn black as JPEG.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  for (const quality of [0.85, 0.75, 0.65, 0.55, 0.45]) {
    const blob = await canvasToBlob(canvas, quality);
    if (blob && blob.size <= maxBytes) {
      return new File([blob], "spot-photo.jpg", { type: "image/jpeg" });
    }
  }
  throw new Error("That photo is too detailed to shrink enough. Try a different one.");
}
