import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, normalizeRole } from "@/lib/auth.actions";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;
  const currentUser = sessionToken ? await getCurrentUser(sessionToken) : null;

  const search = request.nextUrl.searchParams.get("search");
  const classeId = request.nextUrl.searchParams.get("classeId");
  const genreId = request.nextUrl.searchParams.get("genreId");
  const sortBy = request.nextUrl.searchParams.get("sortBy");
  const sortDir = request.nextUrl.searchParams.get("sortDir") || "asc";
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  const orderBy: any[] = [];
  if (sortBy === "firstname") orderBy.push({ firstname: sortDir });
  else if (sortBy === "lastname") orderBy.push({ lastname: sortDir });
  else orderBy.push({ lastname: sortDir }, { firstname: sortDir });

  const where: any = {};
  const adminSessionId = request.cookies.get("admin_session_id")?.value;
  const effectiveSessionId = sessionId || adminSessionId;
  if (effectiveSessionId) {
    where.sessionId = effectiveSessionId;
  }
  if (classeId) where.classeId = classeId;
  if (genreId) where.genreId = genreId;
  if (search) {
    where.OR = [
      { firstname: { contains: search } },
      { lastname: { contains: search } },
    ];
  }

  const eleves = await prisma.eleve.findMany({
    where,
    select: {
      id: true,
      firstname: true,
      lastname: true,
      numero: true,
      contact: true,
      dob: true,
      photo: true,
      sob: true,
      domic: true,
      obs: true,
      classe: { select: { id: true, label: true } },
      genre: { select: { id: true, label: true, gen: true } },
    },
    orderBy,
  });

  return NextResponse.json(eleves);
}

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get("auth_session")?.value;
  const currentUser = sessionToken ? await getCurrentUser(sessionToken) : null;

  if (!currentUser) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const role = normalizeRole(currentUser.user.role?.label);
  const isAdmin = role === "admin";
  const isProf = role === "prof";

  if (!isAdmin && !isProf) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await request.json();
  let sessionId = body.sessionId || request.cookies.get("admin_session_id")?.value;

  if (!sessionId && isProf) {
    let enseignant = await prisma.enseignant.findFirst({
      where: { handledById: currentUser.user.id },
      select: { sessionId: true },
    });

    if (!enseignant && currentUser.user.username) {
      const fullName = currentUser.user.username.trim();
      const parts = fullName.split(" ");
      const prenom = parts[0] || "";
      const nom = parts[1] || "";

      enseignant = await prisma.enseignant.findFirst({
        where: {
          OR: [
            { prenom, nom },
            { prenom: { contains: fullName } },
            { nom: { contains: fullName } },
          ],
        },
        select: { sessionId: true },
      });
    }

    sessionId = enseignant?.sessionId || null;
  }

  if (!sessionId) {
    return NextResponse.json({ error: "Session requise" }, { status: 400 });
  }

  const eleve = await prisma.eleve.create({
    data: {
      firstname: body.firstname,
      lastname: body.lastname,
      dob: body.dob || undefined,
      contact: body.contact || undefined,
      numero: body.numero || undefined,
      sob: body.sob || undefined,
      domic: body.domic || undefined,
      obs: body.obs || undefined,
      classeId: body.classeId || null,
      genreId: body.genreId || null,
      sessionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(eleve, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Identifiant requis" }, { status: 400 });
  }

  const eleve = await prisma.eleve.findUnique({
    where: { id },
    select: { photo: true },
  });

  await prisma.note.deleteMany({ where: { eleveId: id } });
  await prisma.emploiDuTempsEleve.deleteMany({ where: { eleveId: id } });
  await prisma.suivi.deleteMany({ where: { eleveId: id } });
  await prisma.quizAttempt.deleteMany({ where: { eleveId: id } });
  await prisma.noteExercice.deleteMany({ where: { eleveId: id } });
  await prisma.suiviRepartition.deleteMany({ where: { eleveId: id } });

  await prisma.eleve.delete({
    where: { id },
  });

  if (eleve?.photo) {
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "public", "uploads", "eleves", eleve.photo);
    try {
      fs.unlinkSync(filePath);
    } catch {
      // ignore missing file
    }
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID requis" }, { status: 400 });

  const body = await request.json();

  const eleve = await prisma.eleve.update({
    where: { id },
    data: {
      firstname: body.firstname,
      lastname: body.lastname,
      dob: body.dob || undefined,
      contact: body.contact || undefined,
      numero: body.numero || undefined,
      sob: body.sob || undefined,
      domic: body.domic || undefined,
      obs: body.obs || undefined,
      classeId: body.classeId || null,
      genreId: body.genreId || null,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json(eleve);
}
