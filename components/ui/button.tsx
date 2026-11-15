"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Drafting-sheet buttons: square 3px corners, a 2px ink border, and ink
// that wipes up from the bottom edge on hover (`btn-wipe` in globals.css).
// Primary is machine-paint yellow; secondary is the outlined "line" button.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border-2 font-bold leading-none type-title focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blueprint focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "btn-wipe border-ink bg-paint text-ink hover:text-paint",
        secondary:
          "btn-wipe border-ink bg-transparent text-ink hover:text-sheet",
        ghost:
          "border-transparent text-gray-700 transition-colors hover:bg-ink/10 hover:text-ink",
        accent: "btn-wipe border-ink bg-paint text-ink hover:text-paint",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-[50px] px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
