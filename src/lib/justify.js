// Justified photo rows: every row fills the full width, every photo keeps its
// own shape (nothing is cropped) and the photos in a row share one height.
// Masonry columns did the first two but ended at different heights, leaving a
// hole under the shortest column.

// Row height to aim for: about three photos across on a wide page, two on a phone.
export function galleryRowHeight(width) {
  return Math.max(130, Math.min(260, width / 3));
}

// Splits photos (given as width / height ratios) into rows of `width`. The rows
// are chosen together, not greedily, so each one — the last included — lands
// as near `targetHeight` as the photos allow. A row that would still come out
// taller than `maxHeight` (a lone portrait) is held there instead, narrower
// than `width`, for the caller to centre. A row that would squeeze a tall,
// narrow photo below `minTileWidth` (and its caption into a column of single
// words) costs extra, so such a photo moves to a row with more height.
export function justifyRows(ratios, width, { targetHeight, gap = 8, maxHeight = targetHeight * 2, minTileWidth = targetHeight * 0.6 }) {
  const n = ratios.length;
  const cost = new Array(n + 1).fill(Infinity);
  const start = new Array(n + 1).fill(0);
  cost[0] = 0;
  for (let end = 1; end <= n; end++) {
    let sum = 0;
    let narrowest = Infinity;
    for (let s = end - 1; s >= 0; s--) {
      sum += ratios[s];
      narrowest = Math.min(narrowest, ratios[s]);
      const h = (width - gap * (end - s - 1)) / sum;
      if (h <= 0) break;
      const tile = narrowest * Math.min(h, maxHeight);
      const squeeze = tile < minTileWidth ? 10 * Math.log(minTileWidth / tile) ** 2 : 0;
      const c = cost[s] + Math.log(h / targetHeight) ** 2 + squeeze;
      if (c < cost[end]) { cost[end] = c; start[end] = s; }
      if (h < targetHeight / 2) break; // more photos only make the row flatter
    }
  }
  const rows = [];
  for (let end = n; end > 0; end = start[end]) {
    const items = [];
    let sum = 0;
    for (let i = start[end]; i < end; i++) { items.push(i); sum += ratios[i]; }
    const h = (width - gap * (items.length - 1)) / sum;
    rows.unshift({ items, height: Math.min(h, maxHeight) });
  }
  return rows;
}

// Lays out the old WordPress [gallery] blocks inside `root` (post HTML, so plain
// DOM rather than React). Their <img> width/height attributes are WP's 150×150
// thumbnail size, not the photo's shape, so a photo counts as 4:3 until it has
// loaded — call this again on each load.
export function justifyGalleries(root, gap = 8) {
  for (const gallery of root.querySelectorAll(".gallery")) {
    const items = [...gallery.children].filter((el) => el.querySelector("img"));
    const width = gallery.clientWidth - 1; // 1px slack so rounding never wraps a row early
    if (!items.length || width <= 0) continue;
    const ratios = items.map((el) => {
      const img = el.querySelector("img");
      return img.naturalWidth ? img.naturalWidth / img.naturalHeight : 4 / 3;
    });
    for (const row of justifyRows(ratios, width, { targetHeight: galleryRowHeight(width), gap })) {
      let used = gap * (row.items.length - 1);
      for (const i of row.items) {
        const w = ratios[i] * row.height;
        items[i].style.setProperty("width", `${w}px`, "important");
        items[i].style.removeProperty("margin-left");
        items[i].style.removeProperty("margin-right");
        used += w;
      }
      // A row held below full width is centred, and its margins fill the line
      // so the next row's first photo can't creep up beside it.
      const slack = (width - used) / 2;
      if (slack > 0.5) {
        items[row.items[0]].style.setProperty("margin-left", `${slack}px`, "important");
        items[row.items.at(-1)].style.setProperty("margin-right", `${slack}px`, "important");
      }
    }
  }
}
