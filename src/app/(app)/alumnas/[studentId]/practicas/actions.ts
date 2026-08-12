"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";
import type { InternshipStatus } from "@/generated/prisma/enums";

const VALID_STATUSES: InternshipStatus[] = ["PENDIENTE", "EN_CURSO", "COMPLETA", "APROBADA", "NO_APROBADA"];

function optionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

function optionalDate(formData: FormData, key: string): Date | null {
  const value = optionalString(formData, key);
  return value ? new Date(`${value}T00:00:00`) : null;
}

/** Registra una nueva práctica profesional supervisada (sección 40). */
export async function addInternshipAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "internship:write");

  const studentId = String(formData.get("studentId") ?? "");
  const place = String(formData.get("place") ?? "").trim();
  const tutor = String(formData.get("tutor") ?? "").trim();
  const requiredHoursRaw = String(formData.get("requiredHours") ?? "").trim();
  if (!place || !tutor || !requiredHoursRaw) {
    throw new Error("Lugar, tutor y horas requeridas son obligatorios.");
  }
  const requiredHours = Number(requiredHoursRaw);
  if (!Number.isFinite(requiredHours) || requiredHours <= 0) {
    throw new Error("Las horas requeridas deben ser un número mayor a 0.");
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });

  const internship = await prisma.internship.create({
    data: {
      studentId,
      place,
      tutor,
      requiredHours,
      startDate: optionalDate(formData, "startDate"),
      status: "PENDIENTE",
    },
  });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: "CREATE",
      entity: "Internship",
      entityId: internship.id,
      after: { place, tutor, requiredHours },
    },
  });

  revalidatePath(`/alumnas/${studentId}/practicas`);
  revalidatePath(`/alumnas/${studentId}`);
}

/** Actualiza el avance/estado de una práctica ya registrada. */
export async function updateInternshipAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "internship:write");

  const studentId = String(formData.get("studentId") ?? "");
  const internshipId = String(formData.get("internshipId") ?? "");
  const status = String(formData.get("status") ?? "");
  const completedHoursRaw = String(formData.get("completedHours") ?? "0").trim();

  if (!VALID_STATUSES.includes(status as InternshipStatus)) {
    throw new Error("Estado de práctica inválido.");
  }
  const completedHours = Number(completedHoursRaw);
  if (!Number.isFinite(completedHours) || completedHours < 0) {
    throw new Error("Las horas cumplidas deben ser un número mayor o igual a 0.");
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });
  const internship = await prisma.internship.findUniqueOrThrow({ where: { id: internshipId } });
  if (internship.studentId !== studentId) {
    throw new Error("La práctica no pertenece a esta alumna.");
  }

  await prisma.internship.update({
    where: { id: internshipId },
    data: {
      status: status as InternshipStatus,
      completedHours,
      endDate: optionalDate(formData, "endDate"),
      evaluation: optionalString(formData, "evaluation"),
    },
  });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Internship",
      entityId: internshipId,
      before: { status: internship.status, completedHours: internship.completedHours },
      after: { status, completedHours },
    },
  });

  revalidatePath(`/alumnas/${studentId}/practicas`);
  revalidatePath(`/alumnas/${studentId}`);
}
