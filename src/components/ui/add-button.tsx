import { Button } from "./button";
import { Plus } from "lucide-react";

interface AddButtonProps {
  onClick: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function AddButton({
  onClick,
  children = "Ajouter",
  className = "",
}: AddButtonProps) {
  return (
    <Button
      onClick={onClick}
      className={`gap-2 justify-start w-[9rem] bg-gradient-to-r from-[#0072CE] to-[#00A3E0] hover:from-[#00A3E0] hover:to-[#0072CE] text-white shadow-[0_10px_25px_-3px_rgba(0,114,206,0.25)] hover:shadow-[0_0_50px_-10px_rgba(0,114,206,0.4)] ${className}`}
    >
      <Plus className="h-4 w-4 text-white" />
      {children}
    </Button>
  );
}
