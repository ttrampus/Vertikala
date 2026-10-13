// Širina in višina slike iz prvih bajtov datoteke (JPEG ali PNG), da ji
// lahko e-pošta da pravo velikost. Pokončna naslovna slika bi sicer v
// e-pošti zasedla ves zaslon — obrezovanja s CSS (object-fit) odjemalci,
// kot je Outlook, ne poznajo, velikost v atributih pa upoštevajo vsi.
// Nalagalnik na strani slike shrani na novo, brez podatka EXIF o zasuku,
// zato je zapisana velikost tudi prikazana.
export function imageSize(b: Uint8Array): { width: number; height: number } | null {
  const u16 = (i: number) => (b[i] << 8) | b[i + 1];
  const u32 = (i: number) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];

  // PNG: podpis, nato IHDR s širino in višino.
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: u32(16), height: u32(20) };
  }
  // JPEG: poišči okvir SOF, v njem sta višina in širina.
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length && b[i] === 0xff) {
      const marker = b[i + 1];
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { width: u16(i + 7), height: u16(i + 5) };
      i += 2 + u16(i + 2);
    }
  }
  return null;
}
