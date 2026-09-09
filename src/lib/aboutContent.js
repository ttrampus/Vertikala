// Default content for the "O nas" page — the same text the page used to
// hard-code. The page renders from these until an admin saves an edit, and
// falls back to them if the fetch fails, so it can never come up blank.
// Saved content is one JSONB row in site_content ('about').

export const DEFAULT_ABOUT = {
  hero: {
    eyebrow: "O klubu",
    title: "O nas",
    subtitle: "Zgodba za vrhovi, ki jih lovimo",
    image: "https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1600&q=80",
  },
  history: {
    title: "Zgodovina kluba",
    paragraphs: [
      { text: "Klub z imenom „AK Vertikala“ je nastal v začetku 90. prejšnjega stoletja na temeljih alpinističnega odseka Planinskega društva Šmarna gora." },
      { text: "Prvotnih članov, ustanoviteljev, je bilo ob ustanovitvi deset. Klub je nastal v času, ki je odseval „revolucionarni duh“ okolja in sprememb, ki so sledile osamosvojitvi Slovenije. Osnovno gibalo ustanoviteljev Kluba je bilo gojenje vrhunskega alpinizma. S primerno organizirano in vodeno alpinistično šolo ter ustreznimi viri financiranja, je članstvo Kluba naglo raslo." },
      { text: "V začetku leta 1993 sta Klub in Osnovna šola Pirniče sklenila pogodbo o skupnem vlaganju za izgradnjo umetne plezalne stene." },
      { text: "Plezalna stena je našim članom omogočila celoletno in kakovostno plezalno vadbo. Dejavnost kluba pa ni zgolj in samo alpinistična, saj sta se ustanovila tudi odsek športnega plezanja in otroško plezalno šolo. V sredini 90. let smo organizirali tudi nekaj posamičnih tekem v športnem plezanju v okviru državnega prvenstva." },
      { text: "V Klubu je prišlo do cikličnega razvoja, priča smo bili vzponom in padcem. Posebej boleči sta bili dve usodni nesreči in izguba naših članov, prijateljev in vrhunskih alpinistov." },
      { text: "Ob koncu 90. let je zaradi različnih razlogov prišlo do osipa članstva in zamenjave generacij. Nekateri alpinisti so se zaradi družine, kariere ipd. razlogov prenehali ukvarjati z alpinizmom, novih mlajših članov pa takrat na žalost ni bilo. Vzgoji novih rodov alpinistov smo zato posvetili veliko truda, energije in strokovnosti. S primernim vodenjem Kluba, pridobivanjem novih članov in odlično alpinistično šolo, smo članstvo v Klubu nato zelo povečali." },
      { text: "Leta 2006 je bilo tako v Klubu že preko 60 članov, kar predstavlja dobro osnovo za nadaljen uspešen razvoj." },
      { text: "Zavedamo se, da se ukvarjamo s športom, ki nima ustrezne finančne podpore v našem okolju. Zato tej problematiki namenjamo posebno pozornost. Osnovni viri financiranja so urejeni, tako da z optimizmom zremo v prihodnost. Družijo nas enaki oz. podobni interesi: veselje do plezanja, druženja in prijateljstva." }
    ],
  },
  stats: [
    { val: "1992", label: "Ustanovljen" },
    { val: "40+", label: "Aktivnih \u010dlanov" },
    { val: "100+", label: "Vzponov" },
    { val: "PZS", label: "Akreditacija" },
  ],
  activities: {
    eyebrow: "Kaj po\u010dnemo",
    title: "Aktivnosti kluba",
    items: [
      { title: "Plezanje", desc: "Skalno in ledeno plezanje za vse ravni \u2014 od za\u010detnikov do ekspertov." },
      { title: "Alpinizem", desc: "Organizirani vzponi v Alpah, Karakorumu in drugod po svetu." },
      { title: "\u0160ola", desc: "Strukturiran program alpinisti\u010dne \u0161ole z izku\u0161enimi mentorji." },
      { title: "Skupnost", desc: "Redna sre\u010danja, predavanja in socialni dogodki za \u010dlane kluba." },
    ],
  },
  team: {
    eyebrow: "Na\u0161a ekipa",
    title: "Vodstvo kluba",
    items: [
      { name: "Gregor T.", role: "Predsednik", desc: "Izku\u0161en alpinist z 20+ leti izku\u0161enj v visokogorju." },
      { name: "Ana K.", role: "Vodja \u0161ole", desc: "Certificirana gorska vodnica in in\u0161truktorica plezanja." },
      { name: "Marko P.", role: "Vodja odhodov", desc: "Specialist za skalno in ledeno plezanje." },
      { name: "Tina V.", role: "Urednica bloga", desc: "Gorska pisateljica in fotografinja." },
    ],
  },
};
