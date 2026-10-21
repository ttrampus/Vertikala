import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DRAG_THRESHOLD = 5;  // px a mouse moves before a press becomes a drag
const LONG_PRESS_MS = 300; // how long a finger holds before the photo lifts
const TOUCH_SLOP = 8;      // px a finger may wander while holding
const EDGE = 80;           // px from the window edge where dragging scrolls

// Move the item at `from` to `to`, shifting the ones in between.
export const moveItem = (list, from, to) => {
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
};

// Index of the slot whose centre is nearest the point (page coordinates).
const nearestSlot = (slots, x, y) => {
  let best = 0;
  slots.forEach((s, i) => {
    if (Math.hypot(x - s.x, y - s.y) < Math.hypot(x - slots[best].x, y - slots[best].y)) best = i;
  });
  return best;
};

/**
 * Drag-and-drop reordering for a grid of photos. The whole tile is what you
 * drag: with a mouse, press and move; on a touch screen, hold for a moment
 * first, so a quick swipe across the photos still scrolls the page. A press
 * that never turns into a drag stays a normal click. Arrow keys move a
 * focused tile one place.
 *
 * Tiles must be the direct children of `gridRef`, each spread with
 * `tileProps(i)`. While dragging they stay put in the DOM and CSS `order`
 * shows the would-be order — re-inserting the node that holds the pointer
 * capture would end the drag. Render `floating` anywhere: it is the photo
 * that follows the pointer, portalled to <body>.
 */
export function useSortableGrid(items, onReorder, previewSrc) {
  const [drag, setDrag] = useState(null); // copy of dragRef once the tile has lifted
  const dragRef = useRef(null);
  const gridRef = useRef(null);
  const focusIndex = useRef(null);
  const suppressClick = useRef(false);
  const dragging = drag !== null;

  const stop = () => {
    const d = dragRef.current;
    if (d) { clearTimeout(d.timer); d.cleanup?.(); }
    dragRef.current = null;
    setDrag(null);
  };

  const onPointerDown = (e, i) => {
    suppressClick.current = false;
    if (e.button !== 0 || e.target.closest("button") || dragRef.current) return;
    const touch = e.pointerType === "touch";
    // Mouse: no text selection or native image drag. Touch must keep its
    // default, or the page could never scroll from a photo.
    if (!touch) e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    // All tiles are the same size and the count can't change mid-drag, so the
    // slots never move. Page coordinates keep them valid while auto-scrolling.
    const slots = [...gridRef.current.children].map((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.left + b.width / 2 + window.scrollX, y: b.top + b.height / 2 + window.scrollY };
    });
    const d = {
      from: i, over: i, slots, active: false, touch,
      x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY,
      dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height,
    };
    if (touch) {
      d.timer = setTimeout(() => { d.active = true; setDrag({ ...d }); }, LONG_PRESS_MS);
      // Once lifted, a moving finger drags the photo instead of scrolling.
      // React's touch listeners are passive, so this one is added by hand.
      const block = (ev) => { if (d.active) ev.preventDefault(); };
      window.addEventListener("touchmove", block, { passive: false });
      d.cleanup = () => window.removeEventListener("touchmove", block);
    } else {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    dragRef.current = d;
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    d.x = e.clientX;
    d.y = e.clientY;
    if (!d.active) {
      const moved = Math.hypot(d.x - d.x0, d.y - d.y0);
      if (d.touch) { if (moved > TOUCH_SLOP) stop(); return; } // a swipe: let the page scroll
      if (moved < DRAG_THRESHOLD) return;
      d.active = true;
    }
    d.over = nearestSlot(d.slots, d.x + window.scrollX, d.y + window.scrollY);
    setDrag({ ...d });
  };

  const onPointerUp = (e) => {
    const d = dragRef.current;
    stop();
    if (!d?.active) return;
    // The click that ends a drag must not open the photo (or a file picker).
    suppressClick.current = true;
    // Drop where the pointer lifted; a phone doesn't always send a last move.
    const over = nearestSlot(d.slots, e.clientX + window.scrollX, e.clientY + window.scrollY);
    if (over !== d.from) onReorder(moveItem(items, d.from, over));
  };

  const onClickCapture = (e) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    e.preventDefault();
    e.stopPropagation();
  };

  const onKeyDown = (e, i) => {
    const to = { ArrowLeft: i - 1, ArrowRight: i + 1 }[e.key];
    if (to === undefined || to < 0 || to >= items.length) return;
    e.preventDefault();
    focusIndex.current = to;
    onReorder(moveItem(items, i, to));
  };

  // React may re-insert the moved tile's node, which drops focus; put it back.
  useEffect(() => {
    if (focusIndex.current === null) return;
    gridRef.current?.children[focusIndex.current]?.focus();
    focusIndex.current = null;
  }, [items]);

  // While dragging: scroll when the pointer nears the top or bottom of the
  // window, and Escape puts everything back.
  useEffect(() => {
    if (!dragging) return;
    let raf;
    const tick = () => {
      const d = dragRef.current;
      const v = !d ? 0 : d.y < EDGE ? d.y - EDGE : d.y > window.innerHeight - EDGE ? d.y - (window.innerHeight - EDGE) : 0;
      if (v) {
        window.scrollBy(0, v / 5);
        const over = nearestSlot(d.slots, d.x + window.scrollX, d.y + window.scrollY);
        if (over !== d.over) { d.over = over; setDrag({ ...d }); }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const onKey = (e) => { if (e.key === "Escape") stop(); };
    window.addEventListener("keydown", onKey);
    document.body.style.cursor = "grabbing";
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      document.body.style.cursor = "";
    };
  }, [dragging]);

  // Mid-drag, the place each tile would take if dropped now.
  const preview = drag ? moveItem(items.map((_, i) => i), drag.from, drag.over) : null;
  const placeOf = (i) => (preview ? preview.indexOf(i) : i);

  const tileProps = (i) => ({
    tabIndex: 0,
    onPointerDown: (e) => onPointerDown(e, i),
    onPointerMove,
    onPointerUp,
    onPointerCancel: stop,
    onClickCapture,
    // A long press would otherwise open the phone's "save image" menu.
    onContextMenu: (e) => { if (dragRef.current?.touch) e.preventDefault(); },
    onKeyDown: (e) => onKeyDown(e, i),
  });

  const tileStyle = (i) => ({
    order: placeOf(i),
    cursor: dragging ? "grabbing" : "grab",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
  });

  const src = drag ? previewSrc(drag.from) : null;
  const floating = drag && createPortal(
    <div
      className="fixed z-[200] pointer-events-none rounded-xl overflow-hidden shadow-2xl bg-muted"
      style={{ left: drag.x - drag.dx, top: drag.y - drag.dy, width: drag.w, height: drag.h, transform: "scale(1.04)" }}
    >
      {src && <img src={src} alt="" className="w-full h-full object-cover" />}
    </div>,
    document.body,
  );

  return { gridRef, tileProps, tileStyle, placeOf, dragIndex: drag?.from ?? null, floating };
}
