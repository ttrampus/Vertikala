import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Shared plumbing for pages whose content is editable from the site itself
// (alpine school, about). Each page is one JSONB row in site_content, merged
// over the defaults that still live in code — so a page renders correctly
// before anyone has ever saved it, and if Supabase is unreachable.

// Shallow-merge per section: a saved section replaces the default one field at
// a time, while arrays are taken whole so a deleted row actually disappears
// instead of reappearing from the defaults.
export function mergeContent(defaults, saved) {
  if (!saved || typeof saved !== "object") return defaults;
  const out = { ...defaults };
  for (const [key, def] of Object.entries(defaults)) {
    const val = saved[key];
    if (val === undefined || val === null) continue;
    if (Array.isArray(def)) out[key] = Array.isArray(val) ? val : def;
    else if (def && typeof def === "object") out[key] = { ...def, ...val };
    else out[key] = val;
  }
  return out;
}

// Drag-and-drop needs an id per row that survives reordering — an array index
// is not one (it changes as things move, which makes rows jump back). We add a
// throwaway __k to every list row while the form is open and strip it on save,
// so nothing extra is ever written to the database.
let counter = 0;
const nextKey = () => `k${++counter}`;

export function withKeys(value) {
  if (Array.isArray(value)) {
    return value.map((row) =>
      row && typeof row === "object" ? { ...withKeys(row), __k: nextKey() } : row
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, withKeys(v)]));
  }
  return value;
}

export function stripKeys(value) {
  if (Array.isArray(value)) return value.map(stripKeys);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([k]) => k !== "__k").map(([k, v]) => [k, stripKeys(v)])
    );
  }
  return value;
}

/**
 * Loads a page's saved content and gives back a save() that reports failure
 * instead of swallowing it. `pageId` is the site_content row id.
 */
export function usePageContent(pageId, defaults) {
  const [content, setContent] = useState(defaults);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    supabase.from("site_content").select("content").eq("id", pageId).maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled || err || !data?.content) return;
        setContent(mergeContent(defaults, data.content));
      });
    return () => { cancelled = true; };
  }, [pageId]);

  const save = async (next) => {
    setSaving(true);
    setError("");
    const clean = stripKeys(next);
    // .select(): an RLS-blocked write returns no error and no rows, so without
    // asking for the row back a rejected save would look like a successful one.
    const { data, error: err } = await supabase
      .from("site_content")
      .upsert({ id: pageId, content: clean }, { onConflict: "id" })
      .select("id");
    setSaving(false);
    if (err || !data?.length) {
      setError(err?.message || "Shranjevanje ni uspelo — nimate pravic za urejanje te strani.");
      return false;
    }
    setContent(mergeContent(defaults, clean));
    setEditing(false);
    return true;
  };

  return { content, editing, setEditing, saving, error, setError, save };
}
