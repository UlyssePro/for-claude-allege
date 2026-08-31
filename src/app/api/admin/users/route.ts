import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, normalizeRole } from "@/lib/auth.actions";
import bcrypt from "bcryptjs";

export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const current = await getCurrentUser(sessionToken);
    if (!current || normalizeRole(current.user.role?.label) !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const search = request.nextUrl.searchParams.get("search");
    const roleId = request.nextUrl.searchParams.get("roleId");
    const adminSessionId = request.cookies.get("admin_session_id")?.value;

    const andConditions: any[] = [];

    if (adminSessionId) {
      andConditions.push({
        OR: [
          { roleId: current.user.roleId },
          { sessionId: adminSessionId },
        ],
      });
    }

    if (search) {
      andConditions.push({
        OR: [
          { username: { contains: search } },
          { email: { contains: search } },
        ],
      });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};
    if (roleId) {
      where.roleId = roleId;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        image: true,
        logged: true,
        roleId: true,
        role: { select: { id: true, label: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const current = await getCurrentUser(sessionToken);
    if (!current || normalizeRole(current.user.role?.label) !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { enseignantId, email, password, image } = body;

    if (!enseignantId || !email || !password) {
      return NextResponse.json(
        { error: "Enseignant, email et password requis" },
        { status: 400 },
      );
    }

    const targetSessionId = request.cookies.get("admin_session_id")?.value || current.user.sessionId;
    if (!targetSessionId) {
      return NextResponse.json({ error: "Session requise" }, { status: 400 });
    }

    const enseignant = await prisma.enseignant.findUnique({
      where: { id: enseignantId },
      select: { prenom: true, nom: true },
    });

    if (!enseignant) {
      return NextResponse.json(
        { error: "Enseignant introuvable" },
        { status: 404 },
      );
    }

    const username = `${enseignant.prenom} ${enseignant.nom}`.trim();

    const profRole = await prisma.role.findFirst({
      where: { label: "Enseignant" },
    });

    if (!profRole) {
      return NextResponse.json(
        { error: "Rôle Enseignant introuvable" },
        { status: 500 },
      );
    }

    const hashedPassword = bcrypt.hashSync(password, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        roleId: profRole.id,
        image: image || null,
        sessionId: targetSessionId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        image: true,
        roleId: true,
        role: { select: { id: true, label: true } },
        createdAt: true,
      },
    });

    await prisma.enseignant.update({
      where: { id: enseignantId },
      data: { handledById: user.id },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création", details: String(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const current = await getCurrentUser(sessionToken);
    if (!current || normalizeRole(current.user.role?.label) !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    const body = await request.json();
    const { email, password, image } = body;

    const data: any = {};
    if (email) data.email = email;
    if (image !== undefined) data.image = image;
    if (password) data.password = bcrypt.hashSync(password, 10);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        image: true,
        roleId: true,
        role: { select: { id: true, label: true } },
        updatedAt: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("PATCH /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification", details: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("auth_session")?.value;
    if (!sessionToken) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const current = await getCurrentUser(sessionToken);
    if (!current || normalizeRole(current.user.role?.label) !== "admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requis" }, { status: 400 });
    }

    if (id === current.user.id) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { image: true },
    });

    await prisma.user.delete({
      where: { id },
    });

    if (user?.image) {
      const fs = await import("fs");
      const path = await import("path");
      const filePath = path.join(process.cwd(), "public", "uploads", "users", user.image);
      try {
        fs.unlinkSync(filePath);
      } catch {
        // ignore missing file
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/admin/users error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression", details: String(error) },
      { status: 500 },
    );
  }
}
