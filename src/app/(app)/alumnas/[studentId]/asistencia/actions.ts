"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";
import type { AttendanceStatus } from "@/generated/prisma/enums";

const VALID_STATUSES: AttendanceStatus[] = ["PRESENTE", "AUSENTE", "AUSENTE_JUSTIFICADA"];

/** Acredita (o corrige) la asistencia de una alumna a una clase puntual (sección 20). */
export async function recordAttendanceAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "attendance:write");

  const studentId = String(formData.get("studentId") ?? "");
  const subjectOfferingId = String(formData.get("subjectOfferingId") ?? "");
  const classSessionId = String(formData.get("classSessionId") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const status = String(formData.get("status") ?? "");
  const observations = String(formData.get("observations") ?? "").trim();

  if (!VALID_STATUSES.includes(status as AttendanceStatus)) {
    throw new Error("Estado de asistencia inválido.");
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });

  let sessionId = classSessionId;
  if (!sessionId) {
    if (!dateRaw) throw new Error("La fecha es obligatoria para registrar una nueva clase.");
    const date = new Date(`${dateRaw}T00:00:00`);
    const classSession = await prisma.classSession.upsert({
      where: { subjectOfferingId_date: { subjectOfferingId, date } },
      create: { subjectOfferingId, date },
      update: {},
    });
    sessionId = classSession.id;
  }

  const existing = await prisma.attendance.findUnique({
    where: { studentId_classSessionId: { studentId, classSessionId: sessionId } },
  });

  const attendance = await prisma.attendance.upsert({
    where: { studentId_classSessionId: { studentId, classSessionId: sessionId } },
    create: {
      studentId,
      classSessionId: sessionId,
      status: status as AttendanceStatus,
      observations: observations || null,
      recordedById: session.user.id,
    },
    update: {
      status: status as AttendanceStatus,
      observations: observations || null,
      recordedById: session.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: existing ? "UPDATE" : "CREATE",
      entity: "Attendance",
      entityId: attendance.id,
      before: existing ? { status: existing.status, observations: existing.observations } : undefined,
      after: { status, observations: observations || null },
    },
  });

  revalidatePath(`/alumnas/${studentId}/asistencia`);
  revalidatePath(`/alumnas/${studentId}`);
  revalidatePath("/alumnas");
}
