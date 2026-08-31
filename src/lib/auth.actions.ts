import { prisma } from "@/lib/prisma";
import { UserWithRole } from "@/lib/user.actions";
import crypto from "crypto";

const SESSION_TOKEN_LENGTH = 32;
const SESSION_COOKIE_NAME = "auth_session";
const SESSION_EXPIRY_DAYS = 7;

function generateSessionToken(): string {
  return crypto.randomBytes(SESSION_TOKEN_LENGTH).toString("hex");
}

function getExpiryDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + SESSION_EXPIRY_DAYS);
  return date;
}

export async function createSession(userId: string): Promise<string> {
  const token = generateSessionToken();
  const expires = getExpiryDate();

  await prisma.authSession.create({
    data: {
      userId,
      token,
      expires,
    },
  });

  return token;
}

export async function signOut(sessionToken: string): Promise<void> {
  await prisma.authSession.deleteMany({
    where: { token: sessionToken },
  });
}

export async function getCurrentUser(
  sessionToken?: string,
): Promise<{ user: any; session: { token: string } } | null> {
  if (!sessionToken) return null;

  const session = await prisma.authSession.findUnique({
    where: { token: sessionToken },
    include: {
      user: {
        include: {
          role: true,
        },
      },
    },
  });

  if (!session) return null;

  if (session.expires < new Date()) {
    await prisma.authSession.delete({
      where: { token: sessionToken },
    });
    return null;
  }

  return {
    user: session.user,
    session: { token: session.token },
  };
}

export function normalizeRole(label: string | null): "admin" | "prof" | "eleve" {
  if (!label) return "eleve";
  const l = label.toLowerCase();
  if (l.includes("enseignant") || l.includes("prof")) return "prof";
  if (l.includes("superadmin") || l.includes("admin")) return "admin";
  return "eleve";
}

export function getUserRole(user: any): "admin" | "prof" | "eleve" {
  if (user.role?.label) {
    return normalizeRole(user.role.label);
  }
  if (user.username === "admin") {
    return "admin";
  }
  return "eleve";
}
