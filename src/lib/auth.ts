import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getOrCreateUserStatePage } from "@/lib/user-state-page.actions";

export async function signIn(email: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { email },
    include: { role: true },
  });

  if (!user) {
    throw new Error("Utilisateur non trouvé");
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Mot de passe incorrect");
  }

  await getOrCreateUserStatePage(user.id, "dashboard");

  return {
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role?.label || null,
    },
  };
}
