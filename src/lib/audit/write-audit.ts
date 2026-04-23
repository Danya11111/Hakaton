import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AuditInput = {
  actorUsername: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorUsername: input.actorUsername,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        metadataJson: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch {
    // never block admin flow on audit failure
  }
}
