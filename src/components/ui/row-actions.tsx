"use client";

import * as React from "react";
import { MoreVertical, Pencil, Trash2, ClipboardList } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { cn } from "@/lib/utils";

type RowAction = {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
};

type RowActionsProps = {
  actions: RowAction[];
  className?: string;
};

export function RowActions({ actions, className }: RowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md text-[#94a3b8] transition-colors hover:bg-[#1e293b] hover:text-[#f9f6f9] ml-auto cursor-pointer",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Actions</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[160px]"
        onClick={(e) => e.stopPropagation()}
      >
        {actions.map((action, idx) => (
          <DropdownMenuItem
            key={idx}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`cursor-pointer ${
              action.label === "Modifier"
                ? "text-[#24aff0]"
                : action.label === "Supprimer"
                  ? "text-[#fa3737]"
                  : action.label === "Suivis"
                    ? "text-[#3de67d]"
                    : ""
            }`}
          >
            <span className="mr-1">
              {action.icon ? (
                action.icon
              ) : action.label === "Modifier" ? (
                <Pencil className="w-4 h-4" />
              ) : action.label === "Supprimer" ? (
                <Trash2 className="w-4 h-4" />
              ) : action.label === "Suivis" ? (
                <ClipboardList className="w-4 h-4" />
              ) : (
                ""
              )}
            </span>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
