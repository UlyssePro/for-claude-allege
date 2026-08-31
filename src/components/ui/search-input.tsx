import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

function SearchInput({
  className,
  value,
  onValueChange,
  onClear,
  ...props
}: React.ComponentProps<"input"> & {
  value: string;
  onValueChange: (v: string) => void;
  onClear?: () => void;
}) {
  return (
    <div className="relative w-[20rem]">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#94a3b8]" />
      <input
        type="text"
        data-slot="search-input"
        placeholder="Rechercher..."
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          "peer flex h-9 w-full min-w-0 rounded-[var(--radius-sm)] border border-[#1e293b] bg-[rgba(15,23,42,0.9)] pl-9 pr-9 text-sm text-[var(--foreground)] shadow-[var(--shadow)] transition-all duration-200 outline-none placeholder:text-[#64748b] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-[#0072CE] focus-visible:shadow-[var(--shadow-hover)]",
          className,
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            onValueChange("");
            onClear?.();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 opacity-60 hover:opacity-100 hover:bg-[#1e293b]"
        >
          <X className="size-3.5 text-[#94a3b8] cursor-pointer" />
        </button>
      )}
    </div>
  );
}

export { SearchInput };
