"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";

/**
 * Carga o corrige la nota de una evaluación (parcial, recuperatorio, TP integrador, etc.).
 * Crea la `Evaluation` concreta si todavía no existe para ese dictado + plantilla
 * (sección 21: original y recuperatorio siempre quedan como notas separadas).
 */
export async function saveGradeAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "grade:write");

  const studentId = String(formData.get("studentId") ?? "");
  const subjectOfferingId = String(formData.get("subjectOfferingId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");
  const scoreRaw = String(formData.get("score") ?? "").trim();
  const observations = String(formData.get("observations") ?? "").trim();

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });

  let score: number | null = null;
  if (scoreRaw !== "") {
    score = Number(scoreRaw);
    if (Number.isNaN(score) || score < 0 || score > 10) {
      throw new Error("La nota debe ser un número entre 0 y 10.");
    }
  }

  const evaluation =
    (await prisma.evaluation.findFirst({ where: { subjectOfferingId, templateId } })) ??
    (await prisma.evaluation.create({ data: { subjectOfferingId, templateId } }));

  const existing = await prisma.grade.findUnique({
    where: { studentId_evaluationId: { studentId, evaluationId: evaluation.id } },
  });

  const grade = await prisma.grade.upsert({
    where: { studentId_evaluationId: { studentId, evaluationId: evaluation.id } },
    create: {
      studentId,
      evaluationId: evaluation.id,
      score,
      gradedAt: score !== null ? new Date() : null,
      observations: observations || null,
      recordedById: session.user.id,
    },
    update: {
      score,
      gradedAt: score !== null ? new Date() : null,
      observations: observations || null,
      recordedById: session.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: existing ? "UPDATE" : "CREATE",
      entity: "Grade",
      entityId: grade.id,
      before: existing ? { score: existing.score?.toString() ?? null } : undefined,
      after: { score, observations: observations || null },
    },
  });

  revalidatePath(`/alumnas/${studentId}/notas`);
  revalidatePath(`/alumnas/${studentId}`);
  revalidatePath("/alumnas");
}
