"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getClasseColor } from "@/lib/badge-colors";
import { toast } from "sonner";

interface ClasseItem {
  id: string;
  label: string;
  elevesCount: number;
}

interface CardElevesProps {
  classes: ClasseItem[];
  totalEleves: number;
}

export function CardEleves({ classes, totalEleves }: CardElevesProps) {
  return (
    <div className="w-full max-w-[540px] bg-[#111827] rounded-2xl overflow-hidden shadow-lg">
      <div className="relative bg-[#1e3a8a] px-6 pt-6 pb-16"></div>

      <div className="flex justify-center -mt-16 relative z-10">
        <div className="w-32 h-32 rounded-full border-4 border-white bg-white overflow-hidden flex items-center justify-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="w-16 h-16 text-[#1e3a8a]"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 3L1 9l11 6 9-4.91V19a2 2 0 01-2 2H6a2 2 0 01-2-2v-2.27L12 3z" />
            <path d="M12 12l8.5-4.5M12 12v9M12 12L3.5 7.5" />
          </svg>
        </div>
      </div>

      <div className="px-6 pt-4 pb-6 text-center">
        <h2 className="text-white text-xl font-bold uppercase tracking-wide">
          ÉLÈVES
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Total: {totalEleves}
        </p>
      </div>

      <div className="px-6 pb-6 flex flex-wrap gap-2">
        {classes.map((classe) => (
          <Badge
            key={classe.id}
            className={`${getClasseColor(classe.label)} px-2 py-1 rounded text-xs font-medium`}
          >
            {classe.label} ({classe.elevesCount})
          </Badge>
        ))}
        {classes.length === 0 && (
          <span className="text-gray-400 text-sm text-center w-full">
            Aucune classe
          </span>
        )}
      </div>
    </div>
  );
}
