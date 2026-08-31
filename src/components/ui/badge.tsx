import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap transition-all duration-200",
  {
    variants: {
      variant: {
        default:
          "bg-[rgba(0,114,206,0.1)] text-[#00A3E0] border-[rgba(0,163,224,0.2)]",
        secondary:
          "bg-[var(--surface-alt)] text-[var(--foreground-muted)] border-[var(--border)]",
        destructive:
          "bg-[rgba(239,68,68,0.1)] text-[#ef4444] border-[rgba(239,68,68,0.2)]",
        outline:
          "border-[var(--border)] text-[var(--foreground-muted)]",
        warning:
          "bg-[rgba(245,158,11,0.1)] text-[#f59e0b] border-[rgba(245,158,11,0.2)]",
        success:
          "bg-[rgba(34,197,94,0.1)] text-[#22c55e] border-[rgba(34,197,94,0.2)]",
        onpeace:
          "bg-[rgba(168,85,247,0.1)] text-[#a855f7] border-[rgba(168,85,247,0.2)]",
      },
    },
    defaultVariants: {
      variant: "outline",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
