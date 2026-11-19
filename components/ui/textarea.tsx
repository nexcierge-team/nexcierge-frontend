import * as React from "react";
import { cn } from "@/lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "flex min-h-[80px] w-full rounded-sm border-[1.5px] border-ink bg-white px-4 py-3 text-base text-ink sm:text-[15px] placeholder:text-gray-400 transition-colors focus:border-ink focus:outline-none focus:ring-2 focus:ring-blueprint/30 disabled:cursor-not-allowed disabled:opacity-50 resize-none",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
