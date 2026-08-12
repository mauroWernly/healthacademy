"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";
import type { AssignmentStatus } from "@/generated/prisma/enums";

const VALID_STATUSES: AssignmentStatus[] = ["PENDIENTE", "ENTREGADO", "APROBADO", "DESAPROBADO"];

/** Asigna a la alumna un trabajo práctico posible de una materia que está cursando. */
export async function addAssignmentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "assignment:write");

  const studentId = String(formData.get("studentId") ?? "");
  const templateId = String(formData.get("templateId") ?? "");

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });

  const existing = await prisma.assignment.findUnique({
    where: { studentId_templateId: { studentId, templateId } },
  });
  if (existing) {
    throw new Error("La alumna ya tiene este trabajo práctico asignado.");
  }

  const assignment = await prisma.assignment.create({
    data: { studentId, templateId, status: "PENDIENTE" },
  });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: "CREATE",
      entity: "Assignment",
      entityId: assignment.id,
      after: { templateId, status: "PENDIENTE" },
    },
  });

  revalidatePath(`/alumnas/${studentId}/trabajos-practicos`);
  revalidatePath(`/alumnas/${studentId}`);
}

/** Carga/corrige la entrega y el estado de un trabajo práctico ya asignado. */
export async function updateAssignmentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "assignment:write");

  const studentId = String(formData.get("studentId") ?? "");
  const assignmentId = String(formData.get("assignmentId") ?? "");
  const status = String(formData.get("status") ?? "");
  const submittedAtRaw = String(formData.get("submittedAt") ?? "").trim();

  if (!VALID_STATUSES.includes(status as AssignmentStatus)) {
    throw new Error("Estado de trabajo práctico inválido.");
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });
  const assignment = await prisma.assignment.findUniqueOrThrow({ where: { id: assignmentId } });
  if (assignment.studentId !== studentId) {
    throw new Error("El trabajo práctico no pertenece a esta alumna.");
  }

  const submittedAt = submittedAtRaw ? new Date(`${submittedAtRaw}T00:00:00`) : status !== "PENDIENTE" ? (assignment.submittedAt ?? new Date()) : null;

  await prisma.assignment.update({
    where: { id: assignmentId },
    data: { status: status as AssignmentStatus, submittedAt },
  });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Assignment",
      entityId: assignmentId,
      before: { status: assignment.status, submittedAt: assignment.submittedAt },
      after: { status, submittedAt },
    },
  });

  revalidatePath(`/alumnas/${studentId}/trabajos-practicos`);
  revalidatePath(`/alumnas/${studentId}`);
}
