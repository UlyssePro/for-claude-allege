import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] text-[var(--primary-on)] shadow-[0_10px_25px_-3px_rgba(0,114,206,0.25)] hover:brightness-110 hover:shadow-[var(--shadow-glow)]",
        destructive:
          "bg-[var(--destructive)] text-white hover:bg-[var(--destructive-hover)]",
        outline:
          "border border-[var(--border-light)] bg-transparent hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]",
        secondary:
          "bg-[var(--surface-alt)] text-[var(--foreground-muted)] hover:bg-[var(--border-light)]",
        ghost:
          "hover:bg-[var(--surface-alt)] hover:text-[var(--foreground)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[var(--radius-sm)] px-3 text-xs",
        lg: "h-10 rounded-[var(--radius-sm)] px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
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
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
