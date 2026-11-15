import { Archivo } from "next/font/google";

// One variable family, three widths: expanded for headlines, normal for
// reading, condensed for spec data (see the type-* utilities in
// globals.css). The width axis needs the variable font, so no `weight`.
//
// Shared module so the root layout and global-error.tsx (which replaces
// the root layout and renders its own <html>) get the same font variable.
export const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
  display: "swap",
});
