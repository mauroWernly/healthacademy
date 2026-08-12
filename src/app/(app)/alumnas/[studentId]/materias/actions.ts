"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";

/** Alta de una alumna en una materia dictada (comisión + año calendario). */
export async function enrollSubjectAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "subject:write");

  const studentId = String(formData.get("studentId") ?? "");
  const subjectOfferingId = String(formData.get("subjectOfferingId") ?? "");

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });

  const existing = await prisma.subjectEnrollment.findUnique({
    where: { studentId_subjectOfferingId: { studentId, subjectOfferingId } },
  });
  if (existing) {
    throw new Error("La alumna ya está inscripta en esta materia.");
  }

  const enrollment = await prisma.subjectEnrollment.create({
    data: { studentId, subjectOfferingId, status: "CURSANDO" },
  });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: "CREATE",
      entity: "SubjectEnrollment",
      entityId: enrollment.id,
      after: { subjectOfferingId, status: "CURSANDO" },
    },
  });

  revalidatePath(`/alumnas/${studentId}/materias`);
  revalidatePath(`/alumnas/${studentId}/notas`);
  revalidatePath(`/alumnas/${studentId}/asistencia`);
  revalidatePath(`/alumnas/${studentId}`);
}

/** Baja de una alumna de una materia dictada (corrección de inscripción). */
export async function unenrollSubjectAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "subject:write");

  const studentId = String(formData.get("studentId") ?? "");
  const enrollmentId = String(formData.get("enrollmentId") ?? "");

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });
  const enrollment = await prisma.subjectEnrollment.findUniqueOrThrow({ where: { id: enrollmentId } });
  if (enrollment.studentId !== studentId) {
    throw new Error("La materia no pertenece a esta alumna.");
  }

  await prisma.subjectEnrollment.delete({ where: { id: enrollmentId } });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: "DELETE",
      entity: "SubjectEnrollment",
      entityId: enrollmentId,
      before: { subjectOfferingId: enrollment.subjectOfferingId, status: enrollment.status },
    },
  });

  revalidatePath(`/alumnas/${studentId}/materias`);
  revalidatePath(`/alumnas/${studentId}/notas`);
  revalidatePath(`/alumnas/${studentId}/asistencia`);
  revalidatePath(`/alumnas/${studentId}`);
}

/** Cambia el estado de cursada de una materia (ej. marcar APROBADA / LIBRE / DESAPROBADA manualmente). */
export async function updateSubjectEnrollmentStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "subject:write");

  const studentId = String(formData.get("studentId") ?? "");
  const enrollmentId = String(formData.get("enrollmentId") ?? "");
  const status = String(formData.get("status") ?? "");

  const validStatuses = ["CURSANDO", "APROBADA", "PROMOCIONADA", "DESAPROBADA", "LIBRE"];
  if (!validStatuses.includes(status)) {
    throw new Error("Estado de materia inválido.");
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });
  const enrollment = await prisma.subjectEnrollment.findUniqueOrThrow({ where: { id: enrollmentId } });
  if (enrollment.studentId !== studentId) {
    throw new Error("La materia no pertenece a esta alumna.");
  }

  await prisma.subjectEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: status as never,
      closedAt: status === "CURSANDO" ? null : new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "SubjectEnrollment",
      entityId: enrollmentId,
      before: { status: enrollment.status },
      after: { status },
    },
  });

  revalidatePath(`/alumnas/${studentId}/materias`);
  revalidatePath(`/alumnas/${studentId}`);
}
