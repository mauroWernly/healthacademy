"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";

export async function updateInstitutionConfigAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "config:write");

  const before = await prisma.institutionConfig.findUniqueOrThrow({ where: { institutionId: session.user.institutionId } });

  const data = {
    minAttendancePercent: Number(formData.get("minAttendancePercent")),
    minPartialGradeForPromotion: Number(formData.get("minPartialGradeForPromotion")),
    tuitionAmount: Number(formData.get("tuitionAmount")),
    tuitionDueDay: Number(formData.get("tuitionDueDay")),
    surchargeAmount: Number(formData.get("surchargeAmount")),
    criticalDay: Number(formData.get("criticalDay")),
    autoSuspendOnCriticalDay: formData.get("autoSuspendOnCriticalDay") === "on",
  };

  const updated = await prisma.institutionConfig.update({
    where: { institutionId: session.user.institutionId },
    data,
  });

  await prisma.auditLog.create({
    data: {
      institutionId: session.user.institutionId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "InstitutionConfig",
      entityId: before.id,
      before: JSON.parse(JSON.stringify(before)),
      after: JSON.parse(JSON.stringify(updated)),
    },
  });

  revalidatePath("/configuracion");
}
