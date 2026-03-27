import { prisma } from "@/lib/prisma";

export async function acquireIntegrationLock(key: string) {
  await prisma.integrationLock.upsert({
    where: { key },
    update: {},
    create: { key, isRunning: false },
  });

  const result = await prisma.integrationLock.updateMany({
    where: {
      key,
      isRunning: false,
    },
    data: {
      isRunning: true,
      startedAt: new Date(),
      lastError: null,
    },
  });

  return result.count === 1;
}

export async function releaseIntegrationLock(
  key: string,
  opts?: { success?: boolean; error?: string | null }
) {
  await prisma.integrationLock.update({
    where: { key },
    data: {
      isRunning: false,
      finishedAt: new Date(),
      lastSuccessAt: opts?.success ? new Date() : undefined,
      lastError: opts?.error ?? null,
    },
  });
}