import { supabase } from "@/lib/supabaseClient";
import { thumbPath } from "@/lib/thumbs";

const BUCKET = "blog-images";
const PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;

// Bucket-relative path for a URL that points into our storage, else null
// (external URLs — e.g. YouTube thumbnails or never-rehosted images — stay).
function storagePath(url) {
  if (typeof url !== "string") return null;
  const i = url.indexOf(PUBLIC_MARKER);
  if (i < 0) return null;
  return url.slice(i + PUBLIC_MARKER.length).split(/[?#]/)[0] || null;
}

// Every storage file a post references: featured image, gallery images,
// and inline <img>/<video> assets in the content HTML.
function collectPaths(post) {
  const urls = [post.featured_image, ...(post.images || [])];
  for (const m of (post.content || "").matchAll(/(?:src|poster)=["']([^"']+)["']/gi)) {
    urls.push(m[1]);
  }
  return urls.map(storagePath).filter(Boolean);
}

// Which of `paths` are still referenced by surviving posts? The WP importer
// dedupes shared images onto one content-hashed file, so a file may belong
// to several posts — those must survive. Runs after the rows are deleted,
// so any match is a post that still needs the file.
async function stillReferenced(paths) {
  const used = new Set();
  for (let i = 0; i < paths.length; i += 20) {
    const chunk = paths.slice(i, i + 20);
    const or = chunk
      .flatMap((p) => [`content.ilike.%${p}%`, `featured_image.ilike.%${p}%`])
      .join(",");
    const { data, error } = await supabase
      .from("BlogPost").select("content, featured_image, images").or(or);
    if (error) { chunk.forEach((p) => used.add(p)); continue; } // can't verify → keep
    for (const post of data || []) {
      const haystack = `${post.content || ""}\n${post.featured_image || ""}\n${(post.images || []).join("\n")}`;
      for (const p of chunk) if (haystack.includes(p)) used.add(p);
    }
  }
  return used;
}

// Soft delete: hide posts without destroying them. Sets deleted_at so the row
// (and its images) survive and can be restored from the admin trash. This is
// the default "delete" everywhere in the UI — a compromised or mistaken delete
// is now a one-click undo instead of permanent data loss.
export async function softDeletePosts(ids) {
  if (!ids?.length) return { error: null };
  const stamp = new Date().toISOString();
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await supabase
      .from("BlogPost")
      .update({ deleted_at: stamp })
      .in("id", ids.slice(i, i + 100));
    if (error) return { error };
  }
  return { error: null };
}

// Restore soft-deleted posts (clears deleted_at).
export async function restorePosts(ids) {
  if (!ids?.length) return { error: null };
  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await supabase
      .from("BlogPost")
      .update({ deleted_at: null })
      .in("id", ids.slice(i, i + 100));
    if (error) return { error };
  }
  return { error: null };
}

// PERMANENT delete plus (best-effort) their files in the blog-images bucket.
// Storage cleanup failure never fails the call — the rows are already gone.
// Only reachable from the admin trash ("permanently delete") — irreversible.
export async function purgePostsWithImages(ids) {
  // Chunk: hundreds of UUIDs in one .in() overflow the request URL.
  const doomed = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase
      .from("BlogPost").select("content, featured_image, images")
      .in("id", ids.slice(i, i + 100));
    doomed.push(...(data || []));
  }

  for (let i = 0; i < ids.length; i += 100) {
    const { error } = await supabase.from("BlogPost").delete().in("id", ids.slice(i, i + 100));
    if (error) return { error };
  }

  try {
    const paths = [...new Set((doomed || []).flatMap(collectPaths))];
    if (paths.length) {
      const used = await stillReferenced(paths);
      // A removable original takes its card thumb along; thumbs of files
      // another post still uses are kept because their original is kept.
      const removable = paths
        .filter((p) => !used.has(p))
        .flatMap((p) => (p.startsWith("thumbs/") ? [p] : [p, thumbPath(p)]));
      let removed = 0;
      for (let i = 0; i < removable.length; i += 100) {
        const batch = removable.slice(i, i + 100);
        const { data, error: rmErr } = await supabase.storage.from(BUCKET).remove(batch);
        if (rmErr) console.warn("Storage cleanup failed:", rmErr.message);
        removed += data?.length || 0;
      }
      // remove() reports success but deletes nothing when RLS denies it
      if (removed < removable.length) {
        console.warn(`Storage cleanup: ${removable.length - removed} of ${removable.length} files were not deleted (missing storage DELETE policy?)`);
      }
    }
  } catch (e) {
    console.warn("Storage cleanup skipped:", e);
  }
  return { error: null };
}
