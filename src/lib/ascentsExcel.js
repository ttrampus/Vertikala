import ExcelJS from "exceljs";
import { toDate } from "./dates.js";

// Spustni seznami klubskega obrazca — enake vrednosti kot v Excel predlogi in
// v omejitvah stolpcev (supabase/ascents_form_fields.sql). `v` se shrani in
// izvozi, `l` je napis v obrazcu na strani.
export const ASCENT_TYPES = ["Prosto", "Tehnični vzpon", "Turni smuk", "Pristop"].map((v) => ({ v, l: v }));
export const ROUTE_TYPES = ["Skala", "Sneg", "Led", "Kombinirano"].map((v) => ({ v, l: v }));
export const CONDITIONS = [
  { v: "K", l: "Kopni (K)" },
  { v: "Z", l: "Zimski (Z)" },
  { v: "ZR", l: "Zimske razmere (ZR)" },
];
export const ROPE_POSITIONS = [
  { v: "I", l: "Izmenično (I)" },
  { v: "1", l: "Prvi v navezi (1)" },
  { v: "2", l: "Drugi (2)" },
  { v: "N", l: "Nenavezan (N)" },
];

// Obrazec "Pregled alpinističnih vzponov", kakršnega člani oddajajo klubu za
// vsako leto: stolpci in vrstni red so iz predloge, širine skoraj tudi — ozki
// so malo širši, ker je v glavi zdaj še gumb filtra. `only` stolpec omeji na
// osebni izvoz (en plezalec) ali na klubskega (več plezalcev, zato mora biti
// ime v vsaki vrstici, skupno število pa ne pomeni ničesar).
const COLUMNS = [
  { key: "no", header: "ZAP.ŠT.", width: 8 },
  { key: "date", header: "DATUM VZPONA", width: 11 },
  { key: "climber_name", header: "PLEZALEC", width: 20, only: "club" },
  { key: "region", header: "ŠIRŠA LOKACIJA", width: 26 },
  { key: "location", header: "OŽJA LOKACIJA (GORA, STENA, VRH)", width: 22.5 },
  { key: "route_name", header: "IME SMERI", width: 28 },
  { key: "difficulty", header: "OCENA", width: 14 },
  { key: "altitude", header: "VIŠINA SMERI", width: 10 },
  { key: "ascent_type", header: "VRSTA VZPONA", width: 15.5, list: ASCENT_TYPES },
  { key: "route_type", header: "VRSTA SMERI", width: 11.5, list: ROUTE_TYPES },
  { key: "conditions", header: "TIP VZPONA", width: 10, list: CONDITIONS },
  { key: "rope_position", header: "MESTO V NAVEZI", width: 10, list: ROPE_POSITIONS },
  { key: "co_climber", header: "SOPLEZALEC", width: 28 },
  { key: "duration", header: "ČAS VZPONA", width: 11.5 },
  { key: "notes", header: "KOMENTAR", width: 45 },
  { key: "total", header: "Skupno št. vzponov", width: 13, only: "personal" },
];

// Spodnji rob predloge, dobesedno.
const DEFINITIONS = [
  "Alpinistična smer: plezalna smer v snežnih, lednih ali kopnih razmerah, višja od 100 m, pri čemer je mora biti vsaj 60% najmanj I. težavnostne stopnje po lestvici UIAA.",
  "(Alpinistični) vzpon: preplezana alpinistična smer, lahko tudi v sestopu, če ni uporabljeno spuščanje po vrvi.",
  "Kopni – letni vzpon: vzpon, ki ni ne zimski in ne v zimskih razmerah.",
  "Zimski vzpon: v času od 21. 12. do 20. 03. v stenah, ki niso obrnjene proti JV, J in JZ  in je izstop višji kot 1500 m.",
  "Vzpon v zimskih razmerah: v času od 21. 12. do 20. 03 v stenah, ki so obrnjene proti JV, J ali JZ, v času od 01.012. do 20.12. in od 21. 03. do 30. 04. v stenah, ki so obrnjene proti Z, SZ, S, SV in V",
  "Ledni vzpon: Vzpon po vodnem ali ledeniškem ledu, višine nad 100m",
  "Pristop: se šteje od 01. 12. do 30. 04. na vrhove višje od 2000 in celo leto na vrhove, višje od 3.500 m",
  "Turni smuk:  spust s smučmi na nogah z vrha ali grebena, ki je razvodnica in je višji od 2000 m",
  "Varianta smeri – kadar je manj kot 40% višine originalne smeri",
  "Alpinistična tura: skupno ime za vzpon, pristop, turni smuk",
  "Kot turni smuk se šteje tudi alpinistično smučanje. - Turni smuki in ledni slapovi se štejejo vse leto. Vse velja za naše podnebne razmere",
];

const FONT = { name: "Arial", size: 9 };
const THIN = { style: "thin" };
const MEDIUM = { style: "medium" };

// Real .xlsx (not CSV) so diacritics (č/š/ž) round-trip cleanly through any
// viewer, dates keep their own type instead of Excel guessing at parsed
// text, and the form's borders, dropdowns and print setup carry over.
// One sheet (tab) per year, newest first, rows oldest first — like the
// members' own logbooks. When every row is one climber's (e.g. after
// searching for a name) the file is named like theirs and counts their
// running total; the personal details on top stay blank for them to fill in.
export async function exportAscentsToExcel(rows) {
  const { workbook, person } = buildAscentsWorkbook(rows);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = person
    ? `Alpinisticni_vzponi_${person.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, "_")}.xlsx`
    : `vzponi-${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildAscentsWorkbook(rows) {
  const names = new Set(rows.map((a) => (a.climber_name || "").trim().toLowerCase()));
  const person = names.size === 1 ? rows[0].climber_name.trim() : null;
  const columns = COLUMNS.filter((c) => !c.only || c.only === (person ? "personal" : "club"));

  const yearOf = (a) => toDate(a.date).getFullYear();
  const years = [...new Set(rows.map(yearOf))].sort((a, b) => b - a);
  const chronological = (a, b) =>
    a.date !== b.date ? (a.date < b.date ? -1 : 1) : String(a.created_date).localeCompare(String(b.created_date));

  const workbook = new ExcelJS.Workbook();
  // Skupno število je veriga formul, zato naj jo Excel ob odprtju preračuna.
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheets = years.map((year) => ({ year, sheet: workbook.addWorksheet(String(year)) }));

  // Listi so od najnovejšega, skupno število pa teče od najstarejšega naprej.
  let prev = null;
  [...sheets].reverse().forEach(({ year, sheet }) => {
    prev = fillYearSheet(sheet, year, rows.filter((a) => yearOf(a) === year).sort(chronological), columns, prev);
  });
  return { workbook, person };
}

function fillYearSheet(sheet, year, rows, columns, prev) {
  const colOf = (key) => columns.findIndex((c) => c.key === key) + 1;
  const put = (r, c, value, { font, alignment } = {}) => {
    const cell = sheet.getCell(r, c);
    cell.value = value ?? null;
    cell.font = { ...FONT, ...font };
    if (alignment) cell.alignment = alignment;
    return cell;
  };
  columns.forEach((c, i) => { sheet.getColumn(i + 1).width = c.width; });

  put(1, colOf("altitude"), "AK VERTIKALA", { font: { bold: true }, alignment: { horizontal: "center" } })
    .border = { top: THIN, bottom: THIN };
  put(3, 1, `PREGLED ALPINISTIČNIH VZPONOV V LETU ${year}`, { font: { bold: true } });

  // Osebni podatki ostanejo prazni, tudi ime: obrazec je za oddajo, izpolni
  // ga član sam (EMŠO, naslova in datuma rojstva stran niti ne hrani).
  ["Ime in priimek:", "Naslov:", null, null, "Datum rojstva:", "EMŠO:"].forEach((label, i) => {
    if (label) put(6 + i, 1, label, { font: { bold: true } });
  });
  const headerRow = 13;

  const lastCol = columns.length;
  const lastRow = headerRow + rows.length;
  const edge = (r, i) => ({
    top: r === headerRow ? MEDIUM : THIN,
    bottom: r === lastRow ? MEDIUM : THIN,
    left: i === 0 ? MEDIUM : THIN,
    right: i === lastCol - 1 ? MEDIUM : THIN,
  });

  // Besedilo glave je zgoraj, da spodaj ostane prostor za gumb filtra.
  sheet.getRow(headerRow).height = 50;
  columns.forEach((c, i) => {
    put(headerRow, i + 1, c.header, { font: { bold: true }, alignment: { horizontal: "center", vertical: "top", wrapText: true } })
      .border = edge(headerRow, i);
  });

  const totalLetter = colOf("total") ? sheet.getColumn(colOf("total")).letter : null;
  let total = prev?.total ?? 0;
  rows.forEach((a, n) => {
    const r = headerRow + 1 + n;
    total += 1;
    // Polnoč UTC: ExcelJS datum pretvori po UTC, lokalni datum bi v celici
    // pustil še uro (11:00), ki jo le oblika skrije.
    const [y, m, d] = a.date.split("-").map(Number);
    const values = {
      ...a,
      no: n + 1,
      date: new Date(Date.UTC(y, m - 1, d)),
      // "1"/"2" kot število, sicer Excel ob celici pokaže opozorilo "število kot besedilo".
      rope_position: /^\d$/.test(a.rope_position || "") ? Number(a.rope_position) : a.rope_position,
      total: n > 0 ? { formula: `${totalLetter}${r - 1}+1`, result: total }
        : prev ? { formula: `'${prev.name}'!${totalLetter}${prev.row}+1`, result: total }
        : 1,
    };
    columns.forEach((c, i) => {
      const cell = put(r, i + 1, values[c.key], { alignment: { horizontal: "center", vertical: "middle", wrapText: true } });
      cell.border = edge(r, i);
      if (c.key === "date") cell.numFmt = "dd.mm.yyyy"; // "." — Excel swaps "/" for the system separator
      if (c.key === "altitude") cell.numFmt = '0"m"';
    });
    if (totalLetter && n === 0 && !prev) {
      sheet.getCell(r, colOf("total")).note =
        "Prvi vzpon v izvozu šteje 1. Če imaš še vzpone, ki niso vpisani na spletni strani, "
        + "tu vpiši svoje pravo skupno število — vse ostale številke se popravijo same.";
    }
  });

  // Spustni seznami kot en obseg na stolpec. Po celicah jih ExcelJS pri
  // shranjevanju zlaga sam, a naslove ureja kot besedilo ("I10" pred "I6")
  // in od 10. vrstice naprej zapiše prekrivajoča se obsega, ki ju Excel
  // zavrne kot poškodovano datoteko.
  columns.forEach((c, i) => {
    if (!c.list) return;
    const letter = sheet.getColumn(i + 1).letter;
    sheet.dataValidations.add(`${letter}${headerRow + 1}:${letter}${lastRow}`, {
      type: "list", allowBlank: true, formulae: [`"-,${c.list.map((o) => o.v).join(",")}"`],
    });
  });

  // Filter vklopljen že ob odprtju, brez Podatki → Filter.
  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastRow, column: lastCol } };

  // Spodnji rob kot v predlogi (tam so kratice v vrsticah 48–55 pod tabelo, ki
  // se konča v 44.): vsaka kratica pod svojim stolpcem, stopničasto, ker se
  // besedilo v ozkih stolpcih TIP VZPONA in MESTO V NAVEZI razlije v
  // sosednjega, ki mora biti v tisti vrstici prazen.
  const k = lastRow + 4;
  const centered = { alignment: { horizontal: "center" } };
  put(k, 1, "Kratice", { font: { bold: true }, ...centered });
  ["KSA Kamniško Savinjske alpe", "JUL Julijske Alpe", "KAR Karavanke"].forEach((t, i) => put(k + i, colOf("region"), t, centered));
  ["K kopni", "Z Zimski", "ZR zim.razmere"].forEach((t, i) => put(k + 1 + i, colOf("conditions"), t, centered));
  ["I Izmenično", "1 Prvi v nav.", "2 Drugi", "N nenavezan"].forEach((t, i) => put(k + 4 + i, colOf("rope_position"), t, { alignment: { horizontal: "left" } }));
  put(k + 7, 1, "definicije KA:", { font: { bold: true } });
  DEFINITIONS.forEach((t, i) => put(k + 8 + i, 1, t, { font: { italic: i === DEFINITIONS.length - 1 } }));

  Object.assign(sheet.pageSetup, {
    paperSize: 9, orientation: "landscape",
    fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    printTitlesRow: `${headerRow}:${headerRow}`,
  });

  return { name: sheet.name, row: lastRow, total };
}
