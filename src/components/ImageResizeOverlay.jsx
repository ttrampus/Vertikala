import { useState, useEffect, useRef } from "react";
import { NodeSelection } from "@tiptap/pm/state";

// Block nodes that carry images in the post editor. Clicking an <img> inside
// one of these selects the whole node — that's what Delete removes and what
// a drag moves.
const IMAGE_NODES = new Set(["figure", "imageRow", "videoNode"]);
const DRAG_THRESHOLD = 5; // px of movement before a click becomes a move

// Document position of the image block that renders `img`, or null.
function findImageNodePos(view, img) {
  let found = null;
  view.state.doc.descendants((node, pos) => {
    if (found !== null) return false;
    if (!IMAGE_NODES.has(node.type.name)) return;
    const dom = view.nodeDOM(pos);
    if (dom && dom.contains(img)) { found = pos; return false; }
  });
  return found;
}

// Where a dragged block would land for a pointer at (x, y): the boundary
// before or after the top-level block under the pointer, whichever half of
// that block the pointer is in. Returns { pos, lineY } in viewport coords.
function dropTarget(view, x, y) {
  const { doc } = view.state;
  const editorRect = view.dom.getBoundingClientRect();
  const hit = view.posAtCoords({
    left: Math.min(Math.max(x, editorRect.left + 1), editorRect.right - 1),
    top: Math.min(Math.max(y, editorRect.top + 1), editorRect.bottom - 1),
  });
  if (!hit || doc.childCount === 0) return null;

  const $pos = doc.resolve(hit.pos);
  let index = $pos.depth === 0 ? Math.min($pos.index(0), doc.childCount - 1) : $pos.index(0);
  let start = 0;
  for (let i = 0; i < index; i++) start += doc.child(i).nodeSize;

  const dom = view.nodeDOM(start);
  if (!(dom instanceof Element)) return { pos: start, lineY: editorRect.top };
  const r = dom.getBoundingClientRect();
  return y < r.top + r.height / 2
    ? { pos: start, lineY: r.top }
    : { pos: start + doc.child(index).nodeSize, lineY: r.bottom };
}

// ── Image selection overlay: resize handles, Delete, drag-to-move ─────────────
export default function ImageResizeOverlay({ editorContainerRef, editor }) {
  const [selected, setSelected] = useState(null);
  const [dropLine, setDropLine] = useState(null); // { x, y, w } while moving
  const dragRef = useRef(null);
  const overlayBoxRef = useRef(null);
  const handleRefs = useRef({});
  const isDraggingRef = useRef(false);

  const rectFor = (img) => {
    const cr = editorContainerRef.current.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    return { el: img, x: ir.left - cr.left, y: ir.top - cr.top, w: ir.width, h: ir.height };
  };

  // After a transaction replaces the node, its NodeView (and <img>) is new.
  const reselectAt = (pos) => {
    const dom = editor.view.nodeDOM(pos);
    const img = dom instanceof Element ? dom.querySelector("img") : null;
    setSelected(img ? rectFor(img) : null);
  };

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container || !editor) return;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      if (e.target.tagName === "IMG" && container.contains(e.target)) {
        // preventDefault keeps the browser's native image drag out of the way;
        // selection and focus are then set explicitly so the editor knows the
        // image is selected (otherwise Delete had nothing to act on).
        // Capture phase + stopPropagation: ProseMirror's own mousedown handler
        // would otherwise run after this and put the cursor in the caption.
        e.preventDefault();
        e.stopPropagation();
        const img = e.target;
        const { view } = editor;
        const pos = findImageNodePos(view, img);
        if (pos !== null) {
          view.focus();
          view.dispatch(view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos)));
        }
        setSelected(rectFor(img));
        if (pos !== null) startMove(e, img, pos);
      } else if (!e.target.closest("[data-resize-handle]")) {
        setSelected(null);
      }
    };
    const onClickOutside = (e) => {
      if (!e.target.closest("[data-resize-handle]") && e.target.tagName !== "IMG") setSelected(null);
    };
    container.addEventListener("mousedown", onMouseDown, { capture: true });
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      container.removeEventListener("mousedown", onMouseDown, { capture: true });
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [editorContainerRef, editor]);

  // Delete / Backspace removes the selected image; Escape deselects.
  useEffect(() => {
    if (!selected || !editor) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") { setSelected(null); return; }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (e.target.closest?.("input, textarea, figcaption")) return;
      const { view } = editor;
      const pos = findImageNodePos(view, selected.el);
      if (pos === null) return;
      e.preventDefault();
      e.stopPropagation();
      const node = view.state.doc.nodeAt(pos);
      view.dispatch(view.state.tr.delete(pos, pos + node.nodeSize).scrollIntoView());
      view.focus();
      setSelected(null);
    };
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [selected, editor]);

  useEffect(() => {
    if (!selected) return;
    const sync = () => {
      if (isDraggingRef.current) return;
      const container = editorContainerRef.current;
      if (!container || !selected.el) return;
      if (!selected.el.isConnected) { setSelected(null); return; }
      const cr = container.getBoundingClientRect();
      const ir = selected.el.getBoundingClientRect();
      setSelected((s) => s ? { ...s, x: ir.left - cr.left, y: ir.top - cr.top, w: ir.width, h: ir.height } : null);
    };
    const id = setInterval(sync, 50);
    return () => clearInterval(id);
  }, [selected, editorContainerRef]);

  // Press on an image and drag: a drop line shows where it will land, like
  // moving a picture in Word. A press without movement stays a plain click.
  const startMove = (downEvent, img, fromPos) => {
    const container = editorContainerRef.current;
    const startX = downEvent.clientX;
    const startY = downEvent.clientY;
    let moving = false;
    let target = null;

    const onMove = (ev) => {
      if (!moving) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
        moving = true;
        isDraggingRef.current = true;
        document.body.style.cursor = "grabbing";
        img.style.opacity = "0.4";
      }
      ev.preventDefault();
      target = dropTarget(editor.view, ev.clientX, ev.clientY);
      if (!target) { setDropLine(null); return; }
      const cr = container.getBoundingClientRect();
      const er = editor.view.dom.getBoundingClientRect();
      setDropLine({ x: er.left - cr.left + 12, y: target.lineY - cr.top, w: er.width - 24 });

      // Keep the pointer in view near the window edges
      if (ev.clientY < 60) window.scrollBy(0, -12);
      else if (ev.clientY > window.innerHeight - 60) window.scrollBy(0, 12);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove, { capture: true });
      document.removeEventListener("mouseup", onUp, { capture: true });
      if (!moving) return;
      document.body.style.cursor = "";
      img.style.opacity = "";
      isDraggingRef.current = false;
      setDropLine(null);

      const { view } = editor;
      const node = view.state.doc.nodeAt(fromPos);
      if (!target || !node) { reselectAt(fromPos); return; }
      // Dropping right before or after itself changes nothing
      if (target.pos === fromPos || target.pos === fromPos + node.nodeSize) { reselectAt(fromPos); return; }

      const tr = view.state.tr.delete(fromPos, fromPos + node.nodeSize);
      const insertAt = tr.mapping.map(target.pos);
      tr.insert(insertAt, node);
      tr.setSelection(NodeSelection.create(tr.doc, insertAt));
      view.dispatch(tr.scrollIntoView());
      view.focus();
      requestAnimationFrame(() => reselectAt(insertAt));
    };

    document.addEventListener("mousemove", onMove, { capture: true });
    document.addEventListener("mouseup", onUp, { capture: true });
  };

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
        const { view } = editor;
        const pos = findImageNodePos(view, img);
        const node = pos !== null ? view.state.doc.nodeAt(pos) : null;
        if (node?.type.name === "figure") {
          view.dispatch(view.state.tr.setNodeMarkup(pos, null, { ...node.attrs, width: img.style.width }));
        }
      }

      // Sync React state once with the final dimensions
      const cr = container.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      setSelected((s) => s ? { ...s, x: ir.left - cr.left, y: ir.top - cr.top, w: ir.width, h: ir.height } : null);
    };

    document.addEventListener("mousemove", onMove, { capture: true });
    document.addEventListener("mouseup", onUp, { capture: true });
  };

  const line = dropLine && (
    <div style={{ position: "absolute", left: dropLine.x, top: dropLine.y - 1.5, width: dropLine.w, height: 3, background: "hsl(221,83%,53%)", borderRadius: 2, pointerEvents: "none", zIndex: 42 }} />
  );

  if (!selected) return line;
  const { x, y, w, h } = selected;
  // Resize only applies to single figures; side-by-side rows and videos keep their layout.
  const resizable = !!selected.el.closest('figure[data-type="figure"]');
  const handles = [
    { id: "nw", style: { top: y - 5, left: x - 5, cursor: "nw-resize" } },
    { id: "ne", style: { top: y - 5, left: x + w - 5, cursor: "ne-resize" } },
    { id: "sw", style: { top: y + h - 5, left: x - 5, cursor: "sw-resize" } },
    { id: "se", style: { top: y + h - 5, left: x + w - 5, cursor: "se-resize" } },
  ];

  return (
    <>
      {line}
      <div ref={overlayBoxRef} style={{ position: "absolute", top: y, left: x, width: w, height: h, border: "2px solid hsl(221,83%,53%)", borderRadius: 6, pointerEvents: "none", zIndex: 40 }} />
      {resizable && !dropLine && handles.map(({ id, style }) => (
        <div key={id} data-resize-handle
          ref={(el) => { handleRefs.current[id] = el; }}
          onMouseDown={(e) => startDrag(e, id)}
          style={{ position: "absolute", width: 10, height: 10, background: "white", border: "2px solid hsl(221,83%,53%)", borderRadius: 2, zIndex: 41, ...style }} />
      ))}
    </>
  );
}
