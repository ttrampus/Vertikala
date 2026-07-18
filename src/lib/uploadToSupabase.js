import { supabase } from "@/lib/supabaseClient";
import { thumbPath } from "@/lib/thumbs";

// Cap matches MAX_IMG_WIDTH in scripts/import-wp.mjs so new uploads store the
// same web-sized variant as the re-hosted WordPress images. The post lightbox
// shows this file fullscreen — 1600px is sharp on any normal screen.
const MAX_IMG_DIM = 1600;
const JPEG_QUALITY = 0.82;
// Re-encoding these through a canvas would break them (animation, vectors).
const NO_RESIZE_TYPES = ["image/gif", "image/svg+xml"];
// Below this size there is nothing worth re-encoding.
const RESIZE_MIN_BYTES = 500 * 1024;

async function resizeImage(file) {
  if (NO_RESIZE_TYPES.includes(file.type)) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = objectUrl;
    });

    const scale = Math.min(1, MAX_IMG_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    if (scale === 1 && file.size < RESIZE_MIN_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

    // Keep PNG as PNG to preserve transparency; photos become JPEG.
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;

    const ext = type === "image/png" ? "png" : "jpg";
    const baseName = file.name.replace(/\.\w+$/, "");
    return new File([blob], `${baseName}.${ext}`, { type });
  } catch {
    // Undecodable in this browser (e.g. HEIC) — upload the original as before.
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

// Card-sized companion (thumbs/<flat-path>.jpg, max 720px wide) so listing
// pages never download the full 1600px image just to fill a small card.
// Best-effort: a missing thumb only means cards fall back to the original.
const THUMB_MAX_DIM = 720;
const THUMB_QUALITY = 0.75;

async function uploadThumb(file, fileName) {
  if (NO_RESIZE_TYPES.includes(file.type)) return;
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = objectUrl;
    });
    const scale = Math.min(1, THUMB_MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", THUMB_QUALITY));
    if (!blob) return;
    await supabase.storage
      .from("blog-images")
      .upload(thumbPath(fileName), blob, { upsert: true, contentType: "image/jpeg" });
  } catch {
    // Undecodable (e.g. HEIC) or upload hiccup — the original still works.
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadToSupabase(file, folder = "inline") {
  const isImage = file.type?.startsWith("image/");
  if (isImage) file = await resizeImage(file);

  const ext = file.name.split(".").pop();
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  let uploadError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const { error } = await supabase.storage
      .from("blog-images").upload(fileName, file, { upsert: false });
    uploadError = error;
    if (!error) break;
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
  if (uploadError) throw new Error(uploadError.message);
  if (isImage) await uploadThumb(file, fileName);
  const { data } = supabase.storage.from("blog-images").getPublicUrl(fileName);
  return data.publicUrl;
}
