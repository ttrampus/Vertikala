// The router reports the very first render after a full page load (fresh visit
// OR reload) as a "POP" navigation, which must not be mistaken for the user
// pressing Back. This flag is false only during that initial render — the
// ScrollManager in App.jsx flips it right after — so any POP seen while it's
// true is a genuine back/forward navigation.
//
// Don't test performance.getEntriesByType("navigation") for this: that entry
// describes the page load itself and never changes, so after a reload it would
// misclassify every later back-navigation as a fresh visit.
export const navReady = { done: false };
