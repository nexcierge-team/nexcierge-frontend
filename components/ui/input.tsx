import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-sm border-[1.5px] border-ink bg-white px-4 py-2 text-base text-ink sm:text-[15px] placeholder:text-gray-400 transition-colors focus:border-ink focus:outline-none focus:ring-2 focus:ring-blueprint/30 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
