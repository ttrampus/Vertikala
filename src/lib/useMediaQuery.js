import { useEffect, useState } from "react";

// Nekaj odločitev ni mogoče prepustiti CSS-u — koliko kartic naložiti, ali
// tabelo prikazati kot vrstice ali kot kartice — zato jih poveže ta kavelj.
// Meje se ujemajo z --page-x in --col-* v index.css; če jih spremenite tam,
// popravite tudi tukaj, sicer se postavitev in vsebina razideta.
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mq.matches); // zajemi spremembo med prvim izrisom in učinkom
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export const PHONE = "(max-width: 680px)";
export const TABLET_DOWN = "(max-width: 1024px)";

export const useIsPhone = () => useMediaQuery(PHONE);
export const useIsTabletDown = () => useMediaQuery(TABLET_DOWN);
