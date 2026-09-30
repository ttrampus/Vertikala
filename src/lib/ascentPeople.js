// Imena plezalcev se vpisujejo ročno, zato jih primerjamo brez velikih črk,
// šumnikov in odvečnih presledkov: "TADEJ MAROLT" = "Tadej Marolt",
// "Anze" = "Anže". Drugačnega zapisa (samo ime, tipkarska napaka) ne ujamemo.
export const normName = (s) =>
  (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Za smeri in lokacije še brez ločil: "Virens-Šmid" = "Virens Šmid".
export const normKey = (s) => normName(s).replace(/[^a-z0-9]/g, "");

// Soplezalci so v enem polju: "Luka Denac, Andraž Poljanec", "Ana in Žak" …
export const coClimbersOf = (a) =>
  (a.co_climber || "").split(/\s*(?:[,;/&+]|\bin\b)\s*/).map((s) => s.trim()).filter(Boolean);

// Vsi, ki so plezali: vpisovalec in soplezalci, normalizirano.
export const peopleOf = (a) => [a.climber_name, ...coClimbersOf(a)].map(normName).filter(Boolean);

export const involves = (a, name) => peopleOf(a).includes(normName(name));
