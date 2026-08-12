"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";
import { calculateTuitionStatus } from "@/server/domain/tuition";
import { getInstitutionConfig } from "@/server/services/config.service";

/**
 * Registrar un pago (sección 35). El importe NUNCA es editable por el
 * usuario: siempre es exactamente cuota + recargo calculado server-side,
 * lo que hace estructuralmente imposible un pago parcial o "de más".
 */
export async function registerPaymentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "payment:write");

  const tuitionId = String(formData.get("tuitionId") ?? "");
  const methodId = String(formData.get("methodId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");

  const tuition = await prisma.tuition.findUniqueOrThrow({
    where: { id: tuitionId },
    include: { payment: true, student: true },
  });

  if (tuition.studentId !== studentId) {
    throw new Error("La cuota no pertenece a esta alumna.");
  }
  if (tuition.payment && tuition.payment.status === "CONFIRMADO") {
    throw new Error("Esta cuota ya fue pagada.");
  }

  const config = await getInstitutionConfig(tuition.student.institutionId);
  const today = new Date();
  const computed = calculateTuitionStatus(
    { amount: tuition.amount.toNumber(), dueDate: tuition.dueDate, paidAt: null },
    today,
    config
  );

  await prisma.payment.create({
    data: {
      tuitionId: tuition.id,
      methodId,
      amountPaid: computed.total,
      surchargeApplied: computed.surcharge,
      paidAt: today,
      recordedById: session.user.id,
    },
  });
  await prisma.tuition.update({ where: { id: tuition.id }, data: { status: "PAGADA" } });

  await prisma.auditLog.create({
    data: {
      institutionId: tuition.student.institutionId,
      userId: session.user.id,
      action: "CREATE",
      entity: "Payment",
      entityId: tuition.id,
      after: { amountPaid: computed.total, surcharge: computed.surcharge, methodId },
    },
  });

  revalidatePath(`/alumnas/${studentId}/pagos`);
  revalidatePath(`/alumnas/${studentId}`);
  revalidatePath("/dashboard");
  revalidatePath("/alumnas");
}
