"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      closeButton
      richColors
      toastOptions={{
        classNames: {
          toast: "border-[rgb(55_60_78)] bg-[rgb(24_31_49)] text-[rgb(243_244_246)] shadow-[var(--shadow-lg)] rounded-[var(--radius-sm)]",
          success:
            "border-[rgb(102_235_102)] bg-[rgb(102_235_102)/10] text-[rgb(102_235_102)]",
          error:
            "border-[rgb(255_77_77)] bg-[rgb(255_77_77)/10] text-[rgb(255_77_77)]",
          warning:
            "border-[rgb(255_191_0)] bg-[rgb(255_191_0)/10] text-[rgb(255_191_0)]",
          info: "border-[rgb(108_230_241)] bg-[rgb(108_230_241)/10] text-[rgb(108_230_241)]",
          actionButton:
            "bg-[rgb(108_230_241)] text-[rgb(17_24_40)] font-medium hover:bg-[rgb(94_217_229)] rounded-[var(--radius-sm)]",
          cancelButton:
            "bg-[rgb(27_34_52/0.8)] text-[rgb(203_210_224)] hover:bg-[rgb(31_42_66)] rounded-[var(--radius-sm)]",
          closeButton:
            "text-[rgb(156_163_175)] hover:text-[rgb(243_244_246)]",
        },
      }}
    />
  );
}
