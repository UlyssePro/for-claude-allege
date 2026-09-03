import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type UserWithRole = Prisma.UserGetPayload<{
  include: { role: true };
}>;

type CreateUserInput = Omit<Prisma.UserCreateInput, "createdAt" | "updatedAt">;
type UpdateUserInput = Omit<Prisma.UserUpdateInput, "createdAt" | "updatedAt">;

export async function getUsers(): Promise<UserWithRole[]> {
  return await prisma.user.findMany({
    include: { role: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(id: string): Promise<UserWithRole | null> {
  return await prisma.user.findUnique({
    where: { id },
    include: { role: true },
  });
}

export async function getUserByEmail(email: string): Promise<UserWithRole | null> {
  return await prisma.user.findFirst({
    where: { email },
    include: { role: true },
  });
}

export async function createUser(data: CreateUserInput): Promise<UserWithRole> {
  return await prisma.user.create({
    data,
    include: { role: true },
  });
}

export async function updateUser(
  id: string,
  data: UpdateUserInput,
): Promise<UserWithRole> {
  return await prisma.user.update({
    where: { id },
    data,
    include: { role: true },
  });
}

export async function deleteUser(id: string): Promise<UserWithRole> {
  return await prisma.user.delete({
    where: { id },
    include: { role: true },
  });
}
