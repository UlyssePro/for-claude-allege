import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const dir = path.join(process.cwd(), "public", "uploads", "images-lecon");
    const files = fs.readdirSync(dir);
    const images = files
      .filter((f) => /\.(jpg|jpeg|png|gif|webp)$/i.test(f))
      .sort((a, b) => a.localeCompare(b))
      .map((f) => ({
        name: f,
        url: `/uploads/images-lecon/${encodeURIComponent(f)}`,
      }));

    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}
