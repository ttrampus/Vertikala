import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { uploadToSupabase } from "@/lib/uploadToSupabase";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "../components/ImageUploader";
import ClimbMetaForm from "../components/ClimbMetaForm";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, ArrowLeft, Upload, X, Save, Send,
  Bold, Italic, Underline as UnderlineIcon, List, ListOrdered,
  Quote, Link as LinkIcon, Image as ImageIcon, Video,
  AlignLeft, AlignCenter, AlignRight, Heading2, Heading3,
  Minus, Undo, Redo, Columns2,
} from "lucide-react";

import { useEditor, EditorContent, Node, mergeAttributes } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { FigureNode } from "@/lib/FigureNode";
import { RawHtmlNode } from "@/lib/RawHtmlNode";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";

const categories = ["climbs", "trips", "events", "gear", "training", "news"];
const categoryLabels = { climbs: "Vzponi", trips: "Izleti", events: "Dogodki", gear: "Oprema", training: "Trening", news: "Novice" };
const VIDEO_MAX_BYTES = 50 * 1024 * 1024;

function extractYoutubeId(url) {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ── VideoNode: thumbnail preview in editor, real iframe in published HTML ─────
const VideoNode = Node.create({
  name: "videoNode",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      type: { default: "upload" },
      youtubeId: { default: null },
    };
  },

  parseHTML() {
  return [
    {
      tag: 'div[data-type="video-node"]',
      getAttrs: (dom) => {
        const videoType = dom.getAttribute("data-video-type");
        const youtubeId = dom.getAttribute("data-youtube-id");
        const video = dom.querySelector("video");
        const src = video ? video.getAttribute("src") : null;
        return {
          type: videoType || "upload",
          youtubeId: youtubeId || null,
          src: src || null,
        };
      },
    },
  ];
},

  renderHTML({ node }) {
    const { src, type, youtubeId } = node.attrs;
    if (type === "youtube" && youtubeId) {
      return ["div", { "data-type": "video-node", "data-video-type": "youtube", "data-youtube-id": youtubeId, style: "margin:12px 0;" },
        ["iframe", {
          src: `https://www.youtube-nocookie.com/embed/${youtubeId}`,
          width: "100%", height: "400", frameborder: "0",
          allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
          allowfullscreen: "true",
          style: "border-radius:10px;display:block;width:100%;",
        }],
      ];
    }
    return ["div", { "data-type": "video-node", "data-video-type": "upload", style: "margin:12px 0;" },
      ["video", {
        src, controls: "true", style: "width:100%;border-radius:10px;display:block;max-height:480px;background:#000;",
      }],
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const { src, type, youtubeId } = node.attrs;
      const wrapper = document.createElement("div");
      wrapper.setAttribute("data-type", "video-node");
      wrapper.style.cssText = "margin:12px 0;border-radius:10px;overflow:hidden;background:#000;position:relative;cursor:pointer;";

      if (type === "youtube" && youtubeId) {
        wrapper.style.aspectRatio = "16/9";
        const thumb = document.createElement("img");
        thumb.src = `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
        thumb.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;";
        wrapper.appendChild(thumb);
        const play = document.createElement("div");
        play.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;";
        play.innerHTML = `<div style="width:64px;height:64px;background:rgba(255,0,0,0.9);border-radius:50%;display:flex;align-items:center;justify-content:center;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
        </div>`;
        wrapper.appendChild(play);
        const label = document.createElement("div");
        label.style.cssText = "position:absolute;bottom:8px;left:10px;color:rgba(255,255,255,0.8);font-size:11px;font-family:sans-serif;";
        label.textContent = "YouTube · kliknite za odpiranje v novem zavihku";
        wrapper.appendChild(label);
        wrapper.addEventListener("click", () => {
          window.open(`https://www.youtube.com/watch?v=${youtubeId}`, "_blank");
        });
      } else {
        const video = document.createElement("video");
        video.src = src;
        video.controls = true;
        video.style.cssText = "width:100%;display:block;max-height:480px;background:#000;";
        wrapper.appendChild(video);
      }

      return { dom: wrapper };
    };
  },
});

// ── ImageRow node ─────────────────────────────────────────────────────────────
const ImageRow = Node.create({
  name: "imageRow",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      urls: { default: [] },
      gap: { default: 8 },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-row"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { urls, gap } = node.attrs;
    const gapPx = parseInt(gap, 10);
    const pct = Math.floor(100 / urls.length);
    const cells = urls.map((url) => {
      const cell = document.createElement("div");
      cell.style.cssText = `width:${pct}%;padding:0 ${gapPx / 2}px;box-sizing:border-box;`;
      const img = document.createElement("img");
      img.src = url;
      img.style.cssText = "width:100%;height:auto;display:block;border-radius:6px;";
      cell.appendChild(img);
      return cell.outerHTML;
    }).join("");
    return ["div", mergeAttributes(HTMLAttributes, {
      "data-type": "image-row",
      style: `display:flex;flex-direction:row;width:100%;margin:12px 0;`,
    }), ["span", { innerHTML: cells }]];
  },

  addNodeView() {
    return ({ node }) => {
      const { urls, gap } = node.attrs;
      const gapPx = parseInt(gap, 10);
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "display:flex;flex-direction:row;width:100%;margin:12px 0;overflow:hidden;";
      wrapper.setAttribute("data-type", "image-row");
      urls.forEach((url) => {
        const cell = document.createElement("div");
        cell.style.cssText = `flex:1;min-width:0;padding:0 ${gapPx / 2}px;box-sizing:border-box;`;
        const img = document.createElement("img");
        img.src = url;
        img.style.cssText = "width:100%;height:auto;display:block;border-radius:6px;";
        cell.appendChild(img);
        wrapper.appendChild(cell);
      });
      return { dom: wrapper };
    };
  },
});

function insertVideoNode(editor, { src, type, youtubeId }) {
  editor.chain().focus().insertContent({ type: "videoNode", attrs: { src, type, youtubeId } }).run();
}

function ToolBtn({ onClick, active, disabled, title, children }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title}
      className={`p-1.5 rounded-md transition-colors ${active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"} disabled:opacity-30 disabled:cursor-not-allowed`}>
      {children}
    </button>
  );
}

function Sep() {
  return <div className="w-px h-5 bg-border mx-1 self-center" />;
}

function VideoModal({ editor, onClose }) {
  const [tab, setTab] = useState("url");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUrl = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const ytId = extractYoutubeId(trimmed);
    if (ytId) {
      insertVideoNode(editor, { src: null, type: "youtube", youtubeId: ytId });
    } else {
      insertVideoNode(editor, { src: trimmed, type: "upload", youtubeId: null });
    }
    onClose();
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) { alert("Izberite video datoteko."); return; }
    if (file.size > VIDEO_MAX_BYTES) { alert("Video mora biti manjši od 50 MB."); return; }
    setUploading(true);
    try {
      const publicUrl = await uploadToSupabase(file, "videos");
      insertVideoNode(editor, { src: publicUrl, type: "upload", youtubeId: null });
      onClose();
    } catch (err) {
      alert(`Nalaganje ni uspelo: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-background rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border">
        <h3 className="font-semibold text-base mb-4">Vstavi video</h3>
        <div className="flex gap-1 mb-5 p-1 bg-muted rounded-lg">
          <button onClick={() => setTab("url")}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium ${tab === "url" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            YouTube / URL
          </button>
          <button onClick={() => setTab("upload")}
            className={`flex-1 text-sm py-1.5 rounded-md transition-colors font-medium ${tab === "upload" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Naloži z naprave
          </button>
        </div>
        {tab === "url" ? (
          <>
            <p className="text-xs text-muted-foreground mb-3">Prilepite YouTube URL — v urejevalniku se prikaže kot sličica, ob objavi pa se predvaja.</p>
            <Input value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..." onKeyDown={(e) => e.key === "Enter" && handleUrl()} autoFocus />
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" size="sm" onClick={onClose}>Prekliči</Button>
              <Button size="sm" onClick={handleUrl} disabled={!url.trim()}>Vstavi</Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-3">Izberite video z naprave. Največ 50 MB — priporočeno MP4.</p>
            <label className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border hover:border-primary/50 py-8 cursor-pointer transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
              {uploading
                ? <><Loader2 className="h-7 w-7 text-muted-foreground animate-spin" /><span className="text-sm text-muted-foreground">Nalagam…</span></>
                : <><Video className="h-7 w-7 text-muted-foreground" /><span className="text-sm text-muted-foreground">Kliknite za izbiro videa</span><span className="text-xs text-muted-foreground/60">MP4, MOV, WebM · največ 50 MB</span></>}
              <input type="file" accept="video/*" className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" size="sm" onClick={onClose}>Prekliči</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LinkModal({ onInsert, onClose }) {
  const [url, setUrl] = useState("");
  const handle = () => { if (url.trim()) { onInsert(url.trim()); onClose(); } };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-background rounded-2xl p-6 w-full max-w-md shadow-2xl border border-border">
        <h3 className="font-semibold text-base mb-1">Vstavi povezavo</h3>
        <Input value={url} onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..." onKeyDown={(e) => e.key === "Enter" && handle()} autoFocus />
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" size="sm" onClick={onClose}>Prekliči</Button>
          <Button size="sm" onClick={handle} disabled={!url.trim()}>Vstavi</Button>
        </div>
      </div>
    </div>
  );
}

function ImageResizeOverlay({ editorContainerRef, editor }) {
  const [selected, setSelected] = useState(null);
  const dragRef = useRef(null);
  const overlayBoxRef = useRef(null);
  const handleRefs = useRef({});
  const isDraggingRef = useRef(false);

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container) return;
    const onMouseDown = (e) => {
      if (e.target.tagName === "IMG" && container.contains(e.target)) {
        e.preventDefault();
        const img = e.target;
        const cr = container.getBoundingClientRect();
        const ir = img.getBoundingClientRect();
        setSelected({ el: img, x: ir.left - cr.left, y: ir.top - cr.top, w: ir.width, h: ir.height });
      } else if (!e.target.closest("[data-resize-handle]")) {
        setSelected(null);
      }
    };
    const onClickOutside = (e) => {
      if (!e.target.closest("[data-resize-handle]") && e.target.tagName !== "IMG") setSelected(null);
    };
    container.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [editorContainerRef]);

  useEffect(() => {
    if (!selected) return;
    const sync = () => {
      if (isDraggingRef.current) return;
      const container = editorContainerRef.current;
      if (!container || !selected.el) return;
      const cr = container.getBoundingClientRect();
      const ir = selected.el.getBoundingClientRect();
      setSelected((s) => s ? { ...s, x: ir.left - cr.left, y: ir.top - cr.top, w: ir.width, h: ir.height } : null);
    };
    const id = setInterval(sync, 50);
    return () => clearInterval(id);
  }, [selected, editorContainerRef]);

  const startDrag = (e, corner) => {
    e.preventDefault();
    e.stopPropagation();
    const container = editorContainerRef.current;
    if (!container) return;

    // Re-query live img in case the NodeView was recreated since selection
    let img = selected.el;
    if (!img || !img.isConnected) {
      img = container.querySelector('figure[data-type="figure"] img');
      if (!img) return;
    }

    const startX = e.clientX;
    const startW = img.getBoundingClientRect().width;
    const containerW = container.getBoundingClientRect().width;
    dragRef.current = { corner, startX, startW, img, containerW };
    img.dataset.resizing = "1";
    isDraggingRef.current = true;

    const onMove = (ev) => {
      ev.stopPropagation();
      const { corner, startX, startW, img, containerW } = dragRef.current;
      let delta = ev.clientX - startX;
      if (corner === "sw" || corner === "nw") delta = -delta;
      const newW = Math.max(60, Math.min(containerW, startW + delta));

      img.style.width = `${newW}px`;

      // Update overlay DOM directly — bypasses React batching so every frame paints live
      const cr = container.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      const ox = ir.left - cr.left;
      const oy = ir.top - cr.top;
      const ow = ir.width;
      const oh = ir.height;
      if (overlayBoxRef.current) {
        overlayBoxRef.current.style.left = `${ox}px`;
        overlayBoxRef.current.style.top = `${oy}px`;
        overlayBoxRef.current.style.width = `${ow}px`;
        overlayBoxRef.current.style.height = `${oh}px`;
      }
      const pos = { nw: [ox - 5, oy - 5], ne: [ox + ow - 5, oy - 5], sw: [ox - 5, oy + oh - 5], se: [ox + ow - 5, oy + oh - 5] };
      Object.entries(pos).forEach(([id, [l, t]]) => {
        const el = handleRefs.current[id];
        if (el) { el.style.left = `${l}px`; el.style.top = `${t}px`; }
      });
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove, { capture: true });
      document.removeEventListener("mouseup", onUp, { capture: true });
      delete img.dataset.resizing;
      isDraggingRef.current = false;

      if (editor) {
        const src = img.src;
        const finalWidth = img.style.width;
        editor.view.state.doc.descendants((node, pos) => {
          if (node.type.name === "figure" && node.attrs.src === src) {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, null, { ...node.attrs, width: finalWidth })
            );
            return false;
          }
        });
      }

      // Sync React state once with the final dimensions
      const cr = container.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      setSelected((s) => s ? { ...s, x: ir.left - cr.left, y: ir.top - cr.top, w: ir.width, h: ir.height } : null);
    };

    document.addEventListener("mousemove", onMove, { capture: true });
    document.addEventListener("mouseup", onUp, { capture: true });
  };

  if (!selected) return null;
  const { x, y, w, h } = selected;
  const handles = [
    { id: "nw", style: { top: y - 5, left: x - 5, cursor: "nw-resize" } },
    { id: "ne", style: { top: y - 5, left: x + w - 5, cursor: "ne-resize" } },
    { id: "sw", style: { top: y + h - 5, left: x - 5, cursor: "sw-resize" } },
    { id: "se", style: { top: y + h - 5, left: x + w - 5, cursor: "se-resize" } },
  ];
  return (
    <>
      <div ref={overlayBoxRef} style={{ position: "absolute", top: y, left: x, width: w, height: h, border: "2px solid hsl(221,83%,53%)", borderRadius: 6, pointerEvents: "none", zIndex: 40 }} />
      {handles.map(({ id, style }) => (
        <div key={id} data-resize-handle
          ref={(el) => { handleRefs.current[id] = el; }}
          onMouseDown={(e) => startDrag(e, id)}
          style={{ position: "absolute", width: 10, height: 10, background: "white", border: "2px solid hsl(221,83%,53%)", borderRadius: 2, zIndex: 41, ...style }} />
      ))}
    </>
  );
}

function SideBySideModal({ editor, onClose }) {
  const [slots, setSlots] = useState([null, null]);
  const [previews, setPreviews] = useState([null, null]);
  const [uploading, setUploading] = useState(false);
  const [gap, setGap] = useState("8");

  const pick = (i) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ns = [...slots]; ns[i] = file; setSlots(ns);
    const np = [...previews]; np[i] = URL.createObjectURL(file); setPreviews(np);
  };
  const addSlot = () => { if (slots.length < 4) { setSlots([...slots, null]); setPreviews([...previews, null]); } };
  const removeSlot = (i) => { setSlots(slots.filter((_, j) => j !== i)); setPreviews(previews.filter((_, j) => j !== i)); };
  const insert = async () => {
    const files = slots.filter(Boolean);
    if (files.length < 2) return alert("Izberite vsaj 2 sliki.");
    setUploading(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadToSupabase(f, "inline")));
      editor.chain().focus().insertContent({ type: "imageRow", attrs: { urls, gap: parseInt(gap, 10) } }).run();
      onClose();
    } catch (err) {
      alert(`Nalaganje ni uspelo: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-background rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-border">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-semibold text-base">Slike drug ob drugem</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Izberite 2–4 slike za vrstico</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">✕</button>
        </div>
        <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${slots.length}, 1fr)` }}>
          {slots.map((_, i) => (
            <div key={i} className="relative">
              <label className="flex flex-col items-center justify-center cursor-pointer overflow-hidden rounded-xl"
                style={{ aspectRatio: "4/3", border: previews[i] ? "none" : "2px dashed hsl(var(--border))", background: previews[i] ? "none" : "hsl(var(--muted))" }}>
                {previews[i]
                  ? <img src={previews[i]} className="w-full h-full object-cover" alt="" />
                  : <div className="text-center text-muted-foreground"><ImageIcon size={20} className="mx-auto mb-1" /><span className="text-xs">Slika {i + 1}</span></div>}
                <input type="file" accept="image/*" onChange={pick(i)} className="hidden" />
              </label>
              {slots.length > 2 && (
                <button onClick={() => removeSlot(i)}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 text-white text-xs flex items-center justify-center hover:bg-black/80">✕</button>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mb-5">
          {slots.length < 4 && (
            <button onClick={addSlot} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors">+ Dodaj stolpec</button>
          )}
          <label className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
            Razmik:
            <select value={gap} onChange={(e) => setGap(e.target.value)}
              className="border border-border rounded-md px-2 py-1 text-xs bg-background">
              <option value="4">Tesno</option>
              <option value="8">Normalno</option>
              <option value="16">Široko</option>
              <option value="24">Zelo široko</option>
            </select>
          </label>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Prekliči</Button>
          <Button size="sm" onClick={insert} disabled={uploading || slots.filter(Boolean).length < 2} className="gap-2">
            {uploading && <Loader2 size={13} className="animate-spin" />}
            {uploading ? "Nalagam…" : "Vstavi slike"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function EditPost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isLoadingAuth } = useAuth();
  const editorContainerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [featuredUploading, setFeaturedUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [showSideBySide, setShowSideBySide] = useState(false);
  const [initialContent, setInitialContent] = useState(null);

  const [form, setForm] = useState({
    title: "", summary: "", content: "", featured_image: "", images: [], tags: [], category: "climbs", status: "published", climb_metadata: {},
  });
  const [tagInput, setTagInput] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      FigureNode,
      RawHtmlNode,
      VideoNode,
      ImageRow,
      TextAlign.configure({ types: ["heading", "paragraph", "figure"] }),
      Placeholder.configure({ placeholder: "Write your story…" }),
      Link.configure({ openOnClick: false }),
    ],
    onUpdate: ({ editor }) => {
      setForm((prev) => ({ ...prev, content: editor.getHTML() }));
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none min-h-[320px] px-5 py-4 focus:outline-none font-serif text-base leading-relaxed",
      },
    },
  });

  useEffect(() => {
    if (editor && initialContent !== null) {
      editor.commands.setContent(initialContent);
      setInitialContent(null);
    }
  }, [editor, initialContent]);

  useEffect(() => {
    if (isLoadingAuth) return;
    if (!user) { navigate("/login"); return; }
    loadPost();
  }, [id, user, isLoadingAuth]);

  const loadPost = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("BlogPost").select("*").eq("id", id).single();
    if (error) { console.error(error); navigate("/dashboard"); return; }
    if (data.created_by_id !== user.id && !isAdmin) { alert("Te objave ne morete urejati."); navigate("/dashboard"); return; }
    setForm({
      title: data.title || "",
      summary: data.summary || "",
      content: data.content || "",
      featured_image: data.featured_image || "",
      images: data.images || [],
      tags: data.tags || [],
      category: data.category || "climbs",
      status: data.status || "published",
      climb_metadata: data.climb_metadata || {},
    });
    setInitialContent(data.content || "");
    setLoading(false);
  };

  const handleInlineImage = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    setImageUploading(true);
    try {
      const url = await uploadToSupabase(file, "inline");
      editor.chain().focus().insertContent({ type: "figure", attrs: { src: url, alt: "" } }).run();
    } catch (err) {
      alert(`Nalaganje ni uspelo: ${err.message}`);
    } finally {
      setImageUploading(false);
      e.target.value = "";
    }
  }, [editor]);

  const handleFeaturedUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFeaturedUploading(true);
    try {
      const url = await uploadToSupabase(file, "inline");
      setForm((prev) => ({ ...prev, featured_image: url }));
    } catch (err) {
      alert(`Nalaganje ni uspelo: ${err.message}`);
    } finally {
      setFeaturedUploading(false);
    }
  };

  const updateForm = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) updateForm("tags", [...form.tags, tag]);
    setTagInput("");
  };
  const removeTag = (tag) => updateForm("tags", form.tags.filter((t) => t !== tag));

  const handleSubmit = async (status) => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const climbMeta = form.category === "climbs" && Object.keys(form.climb_metadata || {}).length > 0
        ? form.climb_metadata : null;
      const { error } = await supabase.from("BlogPost")
        .update({ title: form.title, summary: form.summary, content: form.content, featured_image: form.featured_image, images: form.images, tags: form.tags, category: form.category, climb_metadata: climbMeta, status })
        .eq("id", id);
      if (error) throw error;
      navigate(`/post/${id}`);
    } catch (err) {
      console.error(err);
      alert("Shranjevanje objave ni uspelo");
    } finally {
      setSaving(false);
    }
  };

  if (isLoadingAuth || loading) return <div className="fixed inset-0 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen max-w-4xl mx-auto px-6 py-8 lg:py-16 pt-24 lg:pt-24">
      {showVideo && editor && <VideoModal editor={editor} onClose={() => setShowVideo(false)} />}
      {showLink && <LinkModal onInsert={(url) => editor?.chain().focus().setLink({ href: url }).run()} onClose={() => setShowLink(false)} />}
      {showSideBySide && editor && <SideBySideModal editor={editor} onClose={() => setShowSideBySide(false)} />}

      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
        <ArrowLeft className="h-4 w-4" /> Nazaj
      </button>

      <h1 className="font-inter font-extrabold text-3xl tracking-tighter mb-8">Uredi objavo</h1>

      <div className="space-y-8">
        <div>
          <label className="block text-sm font-inter font-medium mb-2">Naslovna slika</label>
          {form.featured_image ? (
            <div className="relative rounded-xl overflow-hidden aspect-[16/9] max-w-2xl">
              <img src={form.featured_image} alt="Naslovna slika" className="w-full h-full object-cover" />
              <button onClick={() => updateForm("featured_image", "")}
                className="absolute top-3 right-3 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center aspect-[16/9] max-w-2xl rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              {featuredUploading ? <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                : <><Upload className="h-8 w-8 text-muted-foreground mb-2" /><span className="text-sm text-muted-foreground">Kliknite za nalaganje naslovne slike</span></>}
              <input type="file" accept="image/*" onChange={handleFeaturedUpload} className="hidden" disabled={featuredUploading} />
            </label>
          )}
        </div>

        <div>
          <label className="block text-sm font-inter font-medium mb-2">Naslov</label>
          <Input value={form.title} onChange={(e) => updateForm("title", e.target.value)}
            placeholder="Naslov vaše objave..." className="text-xl font-inter font-bold h-14 border-border" />
        </div>

        <div>
          <label className="block text-sm font-inter font-medium mb-2">Povzetek</label>
          <Textarea value={form.summary} onChange={(e) => updateForm("summary", e.target.value)}
            placeholder="Kratek opis vaše objave..." className="font-serif resize-none" rows={3} />
        </div>

        <div>
          <label className="block text-sm font-inter font-medium mb-2">Kategorija</label>
          <Select value={form.category} onValueChange={(v) => updateForm("category", v)}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {categories.map((cat) => <SelectItem key={cat} value={cat}>{categoryLabels[cat] || cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-inter font-medium mb-2">Oznake</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-sm font-inter">
                #{tag}
                <button onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              placeholder="Dodaj oznako..." className="max-w-xs" />
            <Button variant="outline" onClick={addTag} size="sm">Dodaj</Button>
          </div>
        </div>

        {/* Climb metadata — only shown for climbs category */}
        {form.category === "climbs" && (
          <ClimbMetaForm
            value={form.climb_metadata}
            onChange={(meta) => updateForm("climb_metadata", meta)}
          />
        )}

        <div>
          <label className="block text-sm font-inter font-medium mb-2">Vsebina</label>
          <div ref={editorContainerRef} className="rounded-xl border border-border bg-background shadow-sm"
            style={{ position: "relative", overflow: "visible" }}>
            <div className="flex flex-wrap items-center gap-0.5 px-3 py-2 border-b border-border bg-muted/30 rounded-t-xl">
              <ToolBtn onClick={() => editor?.chain().focus().undo().run()} disabled={!editor?.can().undo()} title="Razveljavi"><Undo size={15} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().redo().run()} disabled={!editor?.can().redo()} title="Ponovi"><Redo size={15} /></ToolBtn>
              <Sep />
              <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive("heading", { level: 2 })} title="Naslov 2"><Heading2 size={15} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive("heading", { level: 3 })} title="Naslov 3"><Heading3 size={15} /></ToolBtn>
              <Sep />
              <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive("bold")} title="Krepko"><Bold size={15} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive("italic")} title="Ležeče"><Italic size={15} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleUnderline().run()} active={editor?.isActive("underline")} title="Podčrtano"><UnderlineIcon size={15} /></ToolBtn>
              <Sep />
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign("left").run()} active={editor?.isActive({ textAlign: "left" })} title="Poravnaj levo"><AlignLeft size={15} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign("center").run()} active={editor?.isActive({ textAlign: "center" })} title="Poravnaj na sredino"><AlignCenter size={15} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().setTextAlign("right").run()} active={editor?.isActive({ textAlign: "right" })} title="Poravnaj desno"><AlignRight size={15} /></ToolBtn>
              <Sep />
              <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive("bulletList")} title="Seznam s pikami"><List size={15} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive("orderedList")} title="Oštevilčen seznam"><ListOrdered size={15} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive("blockquote")} title="Citat"><Quote size={15} /></ToolBtn>
              <ToolBtn onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Ločilo"><Minus size={15} /></ToolBtn>
              <Sep />
              <ToolBtn onClick={() => setShowLink(true)} active={editor?.isActive("link")} title="Vstavi povezavo"><LinkIcon size={15} /></ToolBtn>
              <Sep />
              <label title="Vstavi sliko"
                className={`p-1.5 rounded-md transition-colors cursor-pointer ${imageUploading ? "opacity-40 pointer-events-none" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                {imageUploading ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                <input type="file" accept="image/*" className="hidden" onChange={handleInlineImage} disabled={imageUploading} />
              </label>
              <ToolBtn onClick={() => setShowSideBySide(true)} title="Slike drug ob drugem"><Columns2 size={15} /></ToolBtn>
              <ToolBtn onClick={() => setShowVideo(true)} title="Vstavi video ali naloži z naprave"><Video size={15} /></ToolBtn>
            </div>
            <ImageResizeOverlay editorContainerRef={editorContainerRef} editor={editor} />
            <EditorContent editor={editor} />
          </div>

          <div className="mt-2.5 rounded-lg bg-muted/40 border border-border px-4 py-2.5 grid grid-cols-2 gap-x-6 gap-y-1">
            <p className="col-span-2 text-xs font-semibold text-foreground/60 mb-0.5">Namigi</p>
            <p className="text-xs text-muted-foreground"><ImageIcon className="inline h-3 w-3 mr-1" />Kliknite sliko in povlecite vogale za spreminjanje velikosti</p>
            <p className="text-xs text-muted-foreground"><Columns2 className="inline h-3 w-3 mr-1" />Ikona stolpcev → 2–4 slike drug ob drugem</p>
            <p className="text-xs text-muted-foreground"><Video className="inline h-3 w-3 mr-1" />Ikona videa → YouTube povezava ali nalaganje z naprave</p>
            <p className="text-xs text-muted-foreground"><ImageIcon className="inline h-3 w-3 mr-1" />Ikona slike → naložite fotografijo na mesto kazalca</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-inter font-medium mb-2">Galerija fotografij</label>
          <ImageUploader images={form.images} onChange={(imgs) => updateForm("images", imgs)} />
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
          <Button onClick={() => handleSubmit("draft")} variant="outline"
            disabled={saving || !form.title.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Shrani osnutek
          </Button>
          <Button onClick={() => handleSubmit("published")}
            disabled={saving || !form.title.trim() || !form.content.trim()} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Objavi
          </Button>
        </div>
      </div>

      <style>{`
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: hsl(var(--muted-foreground));
          pointer-events: none;
          height: 0;
        }
        .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          cursor: pointer;
          display: block;
          margin: 8px 0;
        }
        .tiptap [data-type="image-row"] {
          display: flex !important;
          flex-direction: row !important;
          width: 100% !important;
          margin: 12px 0 !important;
          overflow: hidden;
        }
        .tiptap [data-type="image-row"] > div {
          flex: 1 !important;
          min-width: 0 !important;
          box-sizing: border-box !important;
        }
        .tiptap [data-type="image-row"] img {
          width: 100% !important;
          max-width: 100% !important;
          height: auto !important;
          display: block !important;
          margin: 0 !important;
          border-radius: 6px;
        }
        .tiptap [data-type="video-node"] { border-radius: 10px; overflow: hidden; margin: 12px 0; display: block; }
        .tiptap blockquote { border-left: 3px solid hsl(var(--border)); padding-left: 1rem; color: hsl(var(--muted-foreground)); font-style: italic; margin: 1rem 0; }
        .tiptap hr { border: none; border-top: 1px solid hsl(var(--border)); margin: 1.5rem 0; }
        .tiptap h2 { font-size: 1.5rem; font-weight: 700; margin: 1.5rem 0 0.5rem; letter-spacing: -0.02em; }
        .tiptap h3 { font-size: 1.2rem; font-weight: 600; margin: 1.2rem 0 0.4rem; }
        .tiptap ul { list-style: disc; padding-left: 1.5rem; margin: 0.5rem 0; }
        .tiptap ol { list-style: decimal; padding-left: 1.5rem; margin: 0.5rem 0; }
        .tiptap li { margin: 0.25rem 0; }
        .tiptap a { color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 2px; }
        .tiptap p { margin: 0.5rem 0; }
        .tiptap figcaption {
          display: block; width: 100%; box-sizing: border-box;
          text-align: center; font-style: italic; font-size: 13px;
          color: inherit; opacity: 0.80; outline: none; min-height: 1.4em;
          border-bottom: 1px dashed rgba(120,120,120,0.45);
          padding: 5px 4px; margin-top: 6px;
          transition: opacity 0.15s, border-color 0.15s;
        }
        .tiptap figcaption:focus {
          opacity: 1;
          border-bottom-color: rgba(232,80,26,0.55);
        }
        .tiptap figcaption:empty::before {
          content: attr(data-placeholder);
          opacity: 0.45; pointer-events: none;
        }
      `}</style>
    </div>
  );
}