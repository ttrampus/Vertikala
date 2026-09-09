import { useEffect, useLayoutEffect, useRef } from "react";

// A textarea that grows to fit its content, so a long paragraph is fully
// visible instead of hidden behind a scrollbar in a fixed-height box.
// Height is recomputed from scrollHeight whenever the value changes — the
// "auto" reset first is required, otherwise scrollHeight can only ever grow.
export default function AutoTextarea({ value, minRows = 2, style, onChange, ...rest }) {
  const ref = useRef(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Layout effect so the first paint is already the right height (no flicker
  // when the form opens with existing content).
  useLayoutEffect(resize, []);
  useEffect(resize, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => { onChange?.(e); resize(); }}
      rows={minRows}
      style={{
        ...style,
        lineHeight: 1.6,
        // The element sizes itself, so no inner scrollbar and no manual grip.
        overflowY: "hidden",
        resize: "none",
        minHeight: `${minRows * 1.6}em`,
      }}
      {...rest}
    />
  );
}
