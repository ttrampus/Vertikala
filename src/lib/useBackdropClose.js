import { useRef } from "react";

// Klik na temno ozadje pop-upa ga zapre — a samo, če se je klik tudi ZAČEL
// na ozadju. Brskalnik "click" javi na skupnem predniku mesta, kjer je bil
// gumb miške pritisnjen, in mesta, kjer je bil spuščen. Kdor je v polju
// označeval besedilo in miško spustil zunaj okna, je tako "kliknil" na
// ozadje: okno se je zaprlo in vpisano je bilo izgubljeno. Samo preverjanje
// e.target === e.currentTarget tega ne ujame, ker je tarča prav ozadje.
//
// Uporaba: <div {...useBackdropClose(onClose)} style={…ozadje…}>…</div>
export function useBackdropClose(onClose) {
  const pressedOnBackdrop = useRef(false);
  return {
    onMouseDown: (e) => { pressedOnBackdrop.current = e.target === e.currentTarget; },
    onClick: (e) => {
      if (pressedOnBackdrop.current && e.target === e.currentTarget) onClose();
      pressedOnBackdrop.current = false;
    },
  };
}
