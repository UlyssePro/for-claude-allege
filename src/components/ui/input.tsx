import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-9 w-full min-w-0 rounded-[var(--radius-sm)] border border-[#1e293b] bg-[rgba(15,23,42,0.9)] px-3 py-1 text-sm text-[var(--foreground)] shadow-[var(--shadow)] transition-all duration-200 outline-none placeholder:text-[#64748b] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-[#0072CE] focus-visible:shadow-[var(--shadow-hover)]",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
