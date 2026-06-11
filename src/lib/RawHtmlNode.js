import { Node } from "@tiptap/core";

/**
 * Passthrough block for imported-WordPress markup the editor schema doesn't
 * model: classic [gallery] grids (dl/dt/dd) and raw <iframe> embeds. Without
 * this, opening an imported post in the editor shreds galleries into loose
 * figures and silently drops iframes — and saving persists the damage.
 *
 * The block is an atom: shown verbatim (site CSS styles it via the editor's
 * `prose` class), not editable inside, but selectable/draggable/deletable as
 * a unit, and serialized back out byte-identical.
 */
export const RawHtmlNode = Node.create({
  name: "rawHtml",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return { html: { default: "" } };
  },

  parseHTML() {
    const capture = (dom) => ({ html: dom.outerHTML });
    return [
      { tag: "div.gallery", getAttrs: capture, priority: 100 },
      { tag: "div.wp-block-gallery", getAttrs: capture, priority: 100 },
      // Bare iframe (old embeds). Editor video nodes keep their own iframe —
      // their div[data-type="video-node"] wrapper matches first.
      { tag: "iframe", getAttrs: capture, priority: 100 },
    ];
  },

  renderHTML({ node }) {
    // Returning a real DOM node lets getHTML() serialize the markup unchanged.
    const tpl = document.createElement("template");
    tpl.innerHTML = node.attrs.html;
    return tpl.content.firstElementChild || document.createElement("div");
  },

  addNodeView() {
    return ({ node }) => {
      const tpl = document.createElement("template");
      tpl.innerHTML = node.attrs.html;
      const dom = tpl.content.firstElementChild || document.createElement("div");
      dom.contentEditable = "false";
      return { dom, ignoreMutation: () => true };
    };
  },
});
