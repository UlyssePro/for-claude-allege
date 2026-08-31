import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[80px] w-full rounded-[var(--radius-sm)] border border-[#1e293b] bg-[var(--surface-alt)] px-3 py-2 text-sm text-[var(--foreground)] shadow-[var(--shadow)] transition-all duration-200 outline-none placeholder:text-[var(--foreground-muted)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-[#0072CE] focus-visible:shadow-[var(--shadow-hover)]",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
