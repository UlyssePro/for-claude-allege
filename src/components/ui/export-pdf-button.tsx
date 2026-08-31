import { FileText } from "lucide-react";
import { Button, buttonVariants } from "./button";
import type { VariantProps } from "class-variance-authority";

interface ExportPdfButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
}

export function ExportPdfButton({
  onClick,
  disabled = false,
  className = "",
  children = `${<FileText className="h-4 w-4 text-white" />} PDF`,
  variant = "secondary",
  size = "default",
  ...props
}: ExportPdfButtonProps) {
  return (
    <Button
      onClick={onClick}
      variant={variant}
      size={size}
      className={`gap-2 justify-start w-[9rem] bg-zinc-800 hover:bg-zinc-700 ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
}
