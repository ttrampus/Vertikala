import { Node } from "@tiptap/core";

// A floated figure has to be narrower than the column, or there is nothing
// left for the text to flow into. Images wider than this get capped — the
// resize overlay imports the fraction so its handles stop at the same place.
export const WRAP_MAX_FRACTION = 0.5;
const WRAP_MAX_WIDTH = `${WRAP_MAX_FRACTION * 100}%`;

// Outer <figure>: a plain block, unless it floats for text to wrap around.
function figureStyle(wrap) {
  if (wrap === "left")  return `float:left;max-width:${WRAP_MAX_WIDTH};margin:6px 24px 12px 0;`;
  if (wrap === "right") return `float:right;max-width:${WRAP_MAX_WIDTH};margin:6px 0 12px 24px;`;
  return "margin:20px 0;";
}

// Inner wrapper: display:table shrinks to the image width; its margins drive
// alignment. A floated figure is already sized to the image, so it sits flush.
function innerStyle(align, wrap) {
  const margin =
    wrap               ? "margin:0;" :
    align === "right"  ? "margin:0 0 0 auto;" :
    align === "left"   ? "margin:0 auto 0 0;" :
                         "margin:0 auto;";
  return `display:table;max-width:100%;${margin}`;
}

/**
 * TipTap v3 block node: <figure><div (table)><img/><figcaption/></div></figure>
 *
 * The inner "table" div shrinks to the image's natural/set width, so the
 * figcaption is always as wide as the image — it never floats off to the side.
 * Caption text is the node's content (contentDOM), so TipTap manages editing
 * natively — no custom input elements, no updateAttributes on keystrokes.
 *
 * The figure is a block of its own, unless `wrap` floats it so the following
 * paragraphs flow around it.
 */
export const FigureNode = Node.create({
  name: "figure",
  group: "block",
  content: "text*",
  draggable: true,
  isolating: true,

  addAttributes() {
    return {
      src:       { default: null },
      alt:       { default: "" },
      width:     { default: null },
      textAlign: { default: "center" },
      // null = own block, text above and below. "left"/"right" float the
      // figure so the following paragraphs wrap around it, like in Word.
      wrap:      { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: "figure",
        contentElement: "figcaption",
        getAttrs(dom) {
          const img = dom.querySelector("img");
          if (!img) return false;
          const style = dom.getAttribute("style") || "";
          const taMatch = style.match(/text-align\s*:\s*(left|center|right)/);
          // data-wrap is what this node writes; the float in the inline style
          // is the fallback for figures that came from elsewhere (WP imports).
          const wrapAttr = dom.getAttribute("data-wrap");
          const floatMatch = style.match(/float\s*:\s*(left|right)/);
          return {
            src:       img.getAttribute("src") || "",
            alt:       img.getAttribute("alt") || "",
            width:     img.style.width || img.getAttribute("width") || null,
            textAlign: taMatch ? taMatch[1] : "center",
            wrap:      wrapAttr === "left" || wrapAttr === "right" ? wrapAttr
                       : floatMatch ? floatMatch[1] : null,
          };
        },
      },
      // Bare <img> — backward compat for old posts without <figure>
      {
        tag: "img[src]",
        getAttrs(dom) {
          if (dom.closest("figure") || dom.closest('[data-type="image-row"]')) return false;
          return {
            src:       dom.getAttribute("src") || "",
            alt:       dom.getAttribute("alt") || "",
            width:     dom.style.width || dom.getAttribute("width") || null,
            textAlign: "center",
          };
        },
      },
    ];
  },

  renderHTML({ node }) {
    const { src, alt, width, textAlign, wrap } = node.attrs;
    const align = textAlign || "center";
    const imgStyle = `max-width:100%;border-radius:8px;display:block;${width ? `width:${width};` : ""}`;
    return [
      "figure",
      {
        "data-type": "figure",
        ...(wrap ? { "data-wrap": wrap } : {}),
        style: figureStyle(wrap),
      },
      ["div", { style: innerStyle(align, wrap) },
        ["img", { src, alt: alt || "", style: imgStyle }],
        ["figcaption", {}, 0],
      ],
    ];
  },

  addKeyboardShortcuts() {
    return {
      // Prevent Enter from creating a new paragraph inside the caption
      Enter: () => {
        const { $from } = this.editor.state.selection;
        if ($from.parent.type === this.type) return true;
        return false;
      },
    };
  },

  addNodeView() {
    return ({ node }) => {
      const applyLayout = (align, wrap) => {
        wrapper.style.cssText = `display:block;${figureStyle(wrap)}`;
        if (wrap) wrapper.setAttribute("data-wrap", wrap);
        else wrapper.removeAttribute("data-wrap");
        inner.style.cssText = innerStyle(align || "center", wrap);
      };

      // Outer figure — a block container, or a float when text wraps around it
      const wrapper = document.createElement("figure");
      wrapper.setAttribute("data-type", "figure");

      // Inner wrapper shrinks to the image's width (display:table behaviour)
      const inner = document.createElement("div");

      const img = document.createElement("img");
      img.src = node.attrs.src || "";
      img.alt = node.attrs.alt || "";
      img.style.cssText =
        "max-width:100%;border-radius:8px;display:block;" +
        (node.attrs.width ? `width:${node.attrs.width};` : "");

      // contentDOM — TipTap owns all editing inside here
      const figcaption = document.createElement("figcaption");
      figcaption.setAttribute("data-placeholder", "Dodaj opis slike… (neobvezno)");

      applyLayout(node.attrs.textAlign, node.attrs.wrap);

      inner.appendChild(img);
      inner.appendChild(figcaption);
      wrapper.appendChild(inner);

      return {
        dom: wrapper,
        contentDOM: figcaption,
        // Without this, ProseMirror's DOMObserver sees our own style/attribute
        // writes on <img> (live resize drag) as foreign mutations, marks the
        // view dirty and RECREATES the whole NodeView on the next transaction —
        // detaching the img mid-drag. Ignore everything outside the caption.
        ignoreMutation(mutation) {
          if (mutation.type === "selection") return false;
          return !figcaption.contains(mutation.target);
        },
        update(updatedNode) {
          if (updatedNode.type.name !== "figure") return false;
          const newSrc = updatedNode.attrs.src || "";
          if (img.getAttribute("src") !== newSrc) img.src = newSrc;
          img.alt = updatedNode.attrs.alt || "";
          // Skip width update while a resize drag is in progress — the drag
          // sets img.style.width directly and ProseMirror transactions triggered
          // by selection changes must not override it mid-drag.
          if (!img.dataset.resizing) {
            const newW = updatedNode.attrs.width || "";
            if (img.style.width !== newW) img.style.width = newW;
          }
          applyLayout(updatedNode.attrs.textAlign, updatedNode.attrs.wrap);
          return true;
        },
      };
    };
  },
});
