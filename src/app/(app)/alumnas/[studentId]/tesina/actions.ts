"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";
import type { ThesisStatus } from "@/generated/prisma/enums";

const VALID_STATUSES: ThesisStatus[] = ["PENDIENTE", "EN_PREPARACION", "PRESENTADA", "APROBADA", "DESAPROBADA"];

function optionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

/** Crea o actualiza la tesina final de la alumna (sección 41) — 1 a 1 con la alumna. */
export async function saveThesisAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "thesis:write");

  const studentId = String(formData.get("studentId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!VALID_STATUSES.includes(status as ThesisStatus)) {
    throw new Error("Estado de tesina inválido.");
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });

  const dateRaw = optionalString(formData, "date");
  const gradeRaw = optionalString(formData, "grade");
  let grade: number | null = null;
  if (gradeRaw !== null) {
    grade = Number(gradeRaw);
    if (Number.isNaN(grade) || grade < 0 || grade > 10) {
      throw new Error("La nota debe ser un número entre 0 y 10.");
    }
  }

  const data = {
    title: optionalString(formData, "title"),
    tutor: optionalString(formData, "tutor"),
    date: dateRaw ? new Date(`${dateRaw}T00:00:00`) : null,
    status: status as ThesisStatus,
    grade,
    observations: optionalString(formData, "observations"),
  };

  const existing = await prisma.thesis.findUnique({ where: { studentId } });

  const thesis = await prisma.thesis.upsert({
    where: { studentId },
    create: { studentId, ...data },
    update: data,
  });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: existing ? "UPDATE" : "CREATE",
      entity: "Thesis",
      entityId: thesis.id,
      before: existing ? { status: existing.status, grade: existing.grade?.toString() ?? null } : undefined,
      after: { status: data.status, grade },
    },
  });

  revalidatePath(`/alumnas/${studentId}/tesina`);
  revalidatePath(`/alumnas/${studentId}`);
}
