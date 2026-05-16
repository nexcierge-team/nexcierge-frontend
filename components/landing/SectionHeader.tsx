import { Reveal } from "./Reveal";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
}: SectionHeaderProps) {
  return (
    <Reveal>
      <div
        className={
          align === "center"
            ? "mx-auto max-w-2xl text-center"
            : "max-w-2xl"
        }
      >
        {eyebrow && (
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-[#0066cc]">
            {eyebrow}
          </div>
        )}
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.015em] text-zinc-900 sm:text-4xl">
          {title}
        </h2>
        {description && (
          <p className="mt-4 text-base leading-relaxed text-zinc-600 sm:text-lg">
            {description}
          </p>
        )}
      </div>
    </Reveal>
  );
}
