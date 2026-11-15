import type { StepIcon as StepIconName } from "@/lib/landingContent";

// Line icons for the six process steps, drawn at a 52px grid with one
// paint-filled detail each. Decorative: the step title carries the meaning.
export function StepIcon({ name }: { name: StepIconName }) {
  return (
    <svg
      viewBox="0 0 52 52"
      aria-hidden="true"
      className="h-[52px] w-[52px] fill-none stroke-current text-ink [stroke-linecap:round] [stroke-linejoin:round] [stroke-width:1.5] [&_.p]:fill-paint [&_text]:fill-current [&_text]:stroke-none [&_text]:text-[13px] [&_text]:font-bold"
    >
      {name === "brief" && (
        <>
          <rect x="5" y="8" width="30" height="20" rx="3" />
          <polyline points="12,28 12,35 20,28" />
          <rect className="p" x="22" y="24" width="25" height="16" rx="3" />
          <polyline points="40,40 40,46 33,40" />
          <line x1="11" y1="15" x2="29" y2="15" />
          <line x1="11" y1="20" x2="23" y2="20" />
        </>
      )}
      {name === "translate" && (
        <>
          <rect x="6" y="6" width="17" height="22" />
          <text x="10" y="22">A</text>
          <rect className="p" x="29" y="24" width="17" height="22" />
          <text x="31.5" y="40">文</text>
          <polyline points="27,12 37,12 37,20" />
          <polyline points="34,17 37,20 40,17" />
          <polyline points="25,40 15,40 15,32" />
          <polyline points="12,35 15,32 18,35" />
        </>
      )}
      {name === "person" && (
        <>
          <circle cx="20" cy="16" r="8" />
          <path d="M5 45 C5 33 13 28 20 28 C27 28 35 33 35 45" />
          <circle className="p" cx="40" cy="14" r="6" />
          <polyline points="37,14 39.5,16.5 43.5,11.5" />
        </>
      )}
      {name === "audit" && (
        <>
          <polyline points="5,44 5,24 16,30 16,24 27,30 27,16 34,16 34,44 5,44" />
          <line x1="10" y1="37" x2="14" y2="37" />
          <line x1="19" y1="37" x2="23" y2="37" />
          <circle className="p" cx="38" cy="30" r="8" />
          <line x1="44" y1="36" x2="49" y2="42" />
        </>
      )}
      {name === "contract" && (
        <>
          <polyline points="10,6 34,6 42,14 42,46 10,46 10,6" />
          <polyline points="34,6 34,14 42,14" />
          <line x1="16" y1="20" x2="36" y2="20" />
          <line x1="16" y1="26" x2="30" y2="26" />
          <circle className="p" cx="32" cy="36" r="6" />
          <polyline points="29,36 31.5,38.5 35.5,33.5" />
        </>
      )}
      {name === "ship" && (
        <>
          <polyline points="4,32 48,32 42,42 10,42 4,32" />
          <rect className="p" x="12" y="20" width="12" height="12" />
          <rect x="24" y="20" width="12" height="12" />
          <rect x="18" y="8" width="12" height="12" />
          <path d="M4 48 q5 -4 10 0 t10 0 t10 0 t10 0" />
        </>
      )}
    </svg>
  );
}
