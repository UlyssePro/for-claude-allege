import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, getUserRole, normalizeRole } from "@/lib/auth.actions";

// bcrypt.hashSync('a', 10)

export async function POST(request: NextRequest) {
  try {
    const { role, nom, password, eleveId, sessionId } = await request.json();
    console.log("LOGIN ATTEMPT:", { role, nom, hasPassword: !!password, sessionId });

    if (role !== "admin" && !sessionId) {
      return NextResponse.json(
        { error: "Veuillez sélectionner une session." },
        { status: 400 },
      );
    }

    const session = role !== "admin" ? await prisma.session.findUnique({
      where: { id: sessionId },
    }) : null;

    if (role !== "admin" && !session) {
      return NextResponse.json(
        { error: "Session invalide." },
        { status: 400 },
      );
    }

    if (role === "eleve") {
      if (!eleveId) {
        return NextResponse.json(
          { error: "Veuillez sélectionner votre nom." },
          { status: 400 },
        );
      }

      const eleve = await prisma.eleve.findUnique({
        where: { id: eleveId },
        include: { classe: true, genre: true },
      });

      if (!eleve) {
        return NextResponse.json(
          { error: "Élève non trouvé." },
          { status: 404 },
        );
      }

      let eleveRole = await prisma.role.findFirst({
        where: { label: "eleve" },
      });
      if (!eleveRole) {
        eleveRole = await prisma.role.create({
          data: { label: "eleve" },
        });
      }

      const username = `${eleve.firstname} ${eleve.lastname}`.trim();
      const email = `eleve.${eleve.id}@eleve.local`;
      const hashedPassword = bcrypt.hashSync("eleve123", 10);

      let user = await prisma.user.findFirst({
        where: { username, roleId: eleveRole.id },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            username,
            email,
            password: hashedPassword,
            roleId: eleveRole.id,
            ...(sessionId ? { sessionId: session!.id } : {}),
          },
        });
      }

      await prisma.eleve.update({
        where: { id: eleve.id },
        data: {
          handledById: user.id,
        },
      });

      const sessionToken = await createSession(user.id);

      await prisma.user.update({
        where: { id: user.id },
        data: { logged: true },
      });

      const cookieStore = await cookies();
      cookieStore.set("auth_session", sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });

      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: "eleve",
        },
      });
    }

    if (!nom || !password) {
      return NextResponse.json(
        { error: "Veuillez remplir tous les champs." },
        { status: 400 },
      );
    }

    const userWhere: any = { username: nom };
    if (role !== "admin" && sessionId) {
      userWhere.sessionId = sessionId;
    }

    const user = await prisma.user.findFirst({
      where: userWhere,
      orderBy: { id: "asc" },
      include: { role: true, enseignantsGeres: true, elevesHandled: true },
    });
    console.log("USER FOUND:", !!user, user?.username);

    if (!user) {
      return NextResponse.json(
        { error: "Nom ou mot de passe incorrect." },
        { status: 401 },
      );
    }

    const isValid = await bcrypt.compare(password, user.password);
    console.log("PASSWORD VALID:", isValid);
    if (!isValid) {
      return NextResponse.json(
        { error: "Nom ou mot de passe incorrect." },
        { status: 401 },
      );
    }

    const sessionToken = await createSession(user.id);

    await prisma.user.update({
      where: { id: user.id },
      data: { logged: true },
    });

    const cookieStore = await cookies();
    cookieStore.set("auth_session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: getUserRole(user),
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue." },
      { status: 500 },
    );
  }
}
