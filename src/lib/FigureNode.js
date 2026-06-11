import { Node } from "@tiptap/core";

/**
 * TipTap v3 block node: <figure><div (table)><img/><figcaption/></div></figure>
 *
 * The inner "table" div shrinks to the image's natural/set width, so the
 * figcaption is always as wide as the image — it never floats off to the side.
 * Caption text is the node's content (contentDOM), so TipTap manages editing
 * natively — no custom input elements, no updateAttributes on keystrokes.
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
          return {
            src:       img.getAttribute("src") || "",
            alt:       img.getAttribute("alt") || "",
            width:     img.style.width || img.getAttribute("width") || null,
            textAlign: taMatch ? taMatch[1] : "center",
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
    const { src, alt, width, textAlign } = node.attrs;
    const align = textAlign || "center";
    // Inner wrapper: display:table shrinks to image width; margin drives alignment
    const innerMargin =
      align === "right"  ? "margin:0 0 0 auto;" :
      align === "left"   ? "margin:0 auto 0 0;" :
                           "margin:0 auto;";
    const innerStyle = `display:table;max-width:100%;${innerMargin}`;
    const imgStyle   = `max-width:100%;border-radius:8px;display:block;${width ? `width:${width};` : ""}`;
    return [
      "figure",
      { "data-type": "figure", style: "margin:20px 0;" },
      ["div", { style: innerStyle },
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
      const applyAlign = (align) => {
        const a = align || "center";
        if (a === "right") {
          inner.style.marginLeft  = "auto";
          inner.style.marginRight = "0";
        } else if (a === "left") {
          inner.style.marginLeft  = "0";
          inner.style.marginRight = "auto";
        } else {
          inner.style.marginLeft  = "auto";
          inner.style.marginRight = "auto";
        }
      };

      // Outer figure — just a block container, alignment via inner margin
      const wrapper = document.createElement("figure");
      wrapper.setAttribute("data-type", "figure");
      wrapper.style.cssText = "margin:20px 0;display:block;";

      // Inner wrapper shrinks to the image's width (display:table behaviour)
      const inner = document.createElement("div");
      inner.style.cssText = "display:table;max-width:100%;";

      const img = document.createElement("img");
      img.src = node.attrs.src || "";
      img.alt = node.attrs.alt || "";
      img.style.cssText =
        "max-width:100%;border-radius:8px;display:block;" +
        (node.attrs.width ? `width:${node.attrs.width};` : "");

      // contentDOM — TipTap owns all editing inside here
      const figcaption = document.createElement("figcaption");
      figcaption.setAttribute("data-placeholder", "Dodaj opis slike… (neobvezno)");

      applyAlign(node.attrs.textAlign);

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
          applyAlign(updatedNode.attrs.textAlign);
          return true;
        },
      };
    };
  },
});
