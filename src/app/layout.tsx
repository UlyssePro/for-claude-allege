import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "HMS-GS — Gestion Scolaire",
  description:
    "Gestion scolaire : élèves, enseignants, classes, notes, emploi du temps.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[rgb(17_24_40)] text-[rgb(243_244_246)] antialiased">
        <div className="relative min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[rgb(27_34_52)] via-[rgb(17_24_40)] to-[rgb(17_24_40)]">
          {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
