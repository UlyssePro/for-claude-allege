import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: "Non supporté" }, { status: 501 });
}
