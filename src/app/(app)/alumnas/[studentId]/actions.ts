"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";
import type { AcademicStatus } from "@/generated/prisma/enums";

const VALID_ACADEMIC_STATUSES: AcademicStatus[] = [
  "PREINSCRIPTA",
  "INSCRIPTA",
  "ACTIVA",
  "REGULAR",
  "CONDICIONAL",
  "EGRESADA",
  "SUSPENDIDA",
  "BAJA",
  "INACTIVA",
];

/** Marca manualmente el estado académico de la alumna (sección 4). */
export async function updateAcademicStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "student:write");

  const studentId = String(formData.get("studentId") ?? "");
  const academicStatus = String(formData.get("academicStatus") ?? "");

  if (!VALID_ACADEMIC_STATUSES.includes(academicStatus as AcademicStatus)) {
    throw new Error("Estado académico inválido.");
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });

  await prisma.student.update({ where: { id: studentId }, data: { academicStatus: academicStatus as AcademicStatus } });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Student",
      entityId: studentId,
      before: { academicStatus: student.academicStatus },
      after: { academicStatus },
    },
  });

  revalidatePath(`/alumnas/${studentId}`);
  revalidatePath("/alumnas");
}

/**
 * El estado financiero SIEMPRE se deriva de las cuotas (nunca es un campo editable,
 * ver src/server/domain/financialStatus.ts). El único dato "manual" que lo afecta
 * es la suspensión activa — por eso "marcar el estado financiero" se resuelve acá.
 */
export async function createSuspensionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "suspension:write");

  const studentId = String(formData.get("studentId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("El motivo de la suspensión es obligatorio.");

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });

  const existingActive = await prisma.suspension.findFirst({ where: { studentId, liftedAt: null } });
  if (existingActive) {
    throw new Error("La alumna ya tiene una suspensión activa.");
  }

  const suspension = await prisma.suspension.create({
    data: { studentId, reason, createdById: session.user.id },
  });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: "CREATE",
      entity: "Suspension",
      entityId: suspension.id,
      after: { reason },
    },
  });

  revalidatePath(`/alumnas/${studentId}`);
  revalidatePath("/alumnas");
}

export async function liftSuspensionAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "suspension:write");

  const studentId = String(formData.get("studentId") ?? "");
  const suspensionId = String(formData.get("suspensionId") ?? "");

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
  const suspension = await prisma.suspension.findUniqueOrThrow({ where: { id: suspensionId } });
  if (suspension.studentId !== studentId) {
    throw new Error("La suspensión no pertenece a esta alumna.");
  }

  await prisma.suspension.update({
    where: { id: suspensionId },
    data: { liftedAt: new Date(), liftedById: session.user.id },
  });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Suspension",
      entityId: suspensionId,
      before: { liftedAt: null },
      after: { liftedAt: new Date().toISOString() },
    },
  });

  revalidatePath(`/alumnas/${studentId}`);
  revalidatePath("/alumnas");
}
