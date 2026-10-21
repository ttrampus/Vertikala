import { Node } from "@tiptap/core";

const IMG_STYLE = "width:100%;height:auto;display:block;border-radius:6px;";

/**
 * 2–4 photos side by side in a post. Saved as plain markup, one cell per
 * photo, so the post page shows it without the editor:
 *
 *   <div data-type="image-row" data-gap="8"><div><img src></div>…</div>
 *
 * The photos are read back from those <img> tags in order, which is also how
 * the editor's "Uredi slike" dialog reorders them.
 */
export const ImageRow = Node.create({
  name: "imageRow",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      urls: {
        default: [],
        parseHTML: (el) => [...el.querySelectorAll("img")].map((img) => img.getAttribute("src")).filter(Boolean),
        renderHTML: () => ({}),
      },
      gap: {
        default: 8,
        parseHTML: (el) => parseInt(el.getAttribute("data-gap"), 10) || 8,
        renderHTML: (attrs) => ({ "data-gap": attrs.gap }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="image-row"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const { urls, gap } = node.attrs;
    const gapPx = parseInt(gap, 10);
    const pct = Math.floor(100 / Math.max(urls.length, 1));
    return ["div", {
      ...HTMLAttributes,
      "data-type": "image-row",
      style: "display:flex;flex-direction:row;width:100%;margin:12px 0;",
    }, ...urls.map((url) => ["div",
      { style: `width:${pct}%;padding:0 ${gapPx / 2}px;box-sizing:border-box;` },
      ["img", { src: url, alt: "", style: IMG_STYLE }],
    ])];
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
        img.style.cssText = IMG_STYLE;
        cell.appendChild(img);
        wrapper.appendChild(cell);
      });
      return { dom: wrapper };
    };
  },
});
