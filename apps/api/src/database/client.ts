import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __renderPrismaClient: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

export function getPrismaClient(): PrismaClient {
  if (!globalThis.__renderPrismaClient) {
    globalThis.__renderPrismaClient = createPrismaClient();
  }

  return globalThis.__renderPrismaClient;
}

export const prisma = getPrismaClient();

export async function disconnectPrisma(): Promise<void> {
  await globalThis.__renderPrismaClient?.$disconnect();
  globalThis.__renderPrismaClient = undefined;
}
