import { ArrowRight, ArrowLeft } from "lucide-react";

// Puščica ob besedilu gumba ali povezave. Pisave strani znaka → nimajo, zato
// bi ga vsaka naprava narisala s svojo nadomestno pisavo; narisana ikona je
// povsod enaka ter sledi velikosti in barvi besedila.
export default function Arrow({ left = false }) {
  const Icon = left ? ArrowLeft : ArrowRight;
  return (
    <Icon
      aria-hidden="true"
      size="1.15em"
      strokeWidth={2.25}
      style={{ display: "inline-block", verticalAlign: "-0.19em", flexShrink: 0 }}
    />
  );
}

// Besedilo iz urejevalnika ima lahko puščico zapisano kot znak ("Prijavi se →").
export function withArrow(text) {
  const m = /^(.*?)\s*→\s*$/.exec(text || "");
  return m ? <>{m[1]} <Arrow /></> : text;
}
