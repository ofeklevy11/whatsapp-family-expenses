import { AlertSeverity, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export interface CreateAlertInput {
  familyId: string;
  type: string;
  message: string;
  severity?: AlertSeverity;
  metadata?: Prisma.InputJsonValue;
}

export async function createAlert(input: CreateAlertInput) {
  return prisma.alert.create({
    data: {
      familyId: input.familyId,
      type: input.type,
      message: input.message,
      severity: input.severity ?? AlertSeverity.INFO,
      metadata: input.metadata,
    },
  });
}

export async function listRecentAlerts(familyId: string, take = 20) {
  return prisma.alert.findMany({
    where: { familyId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/**
 * Has an alert of this `type` for this month (and optional category) already
 * been recorded? Used to avoid sending the same budget warning repeatedly.
 */
export async function alertAlreadySent(
  familyId: string,
  type: string,
  monthKey: string,
  categoryId?: string | null,
): Promise<boolean> {
  const alerts = await prisma.alert.findMany({ where: { familyId, type } });
  return alerts.some((a) => {
    const meta = (a.metadata ?? {}) as { monthKey?: string; categoryId?: string };
    if (meta.monthKey !== monthKey) return false;
    if (categoryId) return meta.categoryId === categoryId;
    return true;
  });
}
