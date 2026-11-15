import { cn } from "@/lib/utils";

/**
 * The typeset Nexcierge wordmark: Archivo at expanded width, extra bold.
 * Used wherever the logo would sit (no logo file exists yet). Size comes
 * from the caller's text-* class.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "type-display font-extrabold tracking-[-0.01em] text-ink",
        className,
      )}
    >
      Nexcierge
    </span>
  );
}
