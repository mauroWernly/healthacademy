"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";

function nextFileNumber(lastFileNumber: string | undefined): string {
  const lastNumber = lastFileNumber ? Number(lastFileNumber) : 0;
  return String(lastNumber + 1).padStart(6, "0");
}

function optionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

/** Alta de una nueva alumna en el legajo (sección 3/12). */
export async function createStudentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "student:write");

  const institutionId = session.user.institutionId;

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").trim();
  if (!firstName || !lastName || !dni) {
    throw new Error("Nombre, apellido y DNI son obligatorios.");
  }

  const existingDni = await prisma.student.findUnique({ where: { dni } });
  if (existingDni) {
    throw new Error("Ya existe una alumna registrada con ese DNI.");
  }

  const careerId = optionalString(formData, "careerId");
  const cohortId = optionalString(formData, "cohortId");
  const commissionId = optionalString(formData, "commissionId");
  const birthDateRaw = optionalString(formData, "birthDate");

  const lastStudent = await prisma.student.findFirst({
    where: { institutionId },
    orderBy: { fileNumber: "desc" },
    select: { fileNumber: true },
  });
  const fileNumber = nextFileNumber(lastStudent?.fileNumber);

  const student = await prisma.student.create({
    data: {
      institutionId,
      fileNumber,
      firstName,
      lastName,
      dni,
      birthDate: birthDateRaw ? new Date(`${birthDateRaw}T00:00:00`) : null,
      birthPlace: optionalString(formData, "birthPlace"),
      nationality: optionalString(formData, "nationality"),
      address: optionalString(formData, "address"),
      city: optionalString(formData, "city"),
      province: optionalString(formData, "province"),
      phone: optionalString(formData, "phone"),
      email: optionalString(formData, "email"),
      emergencyContactName: optionalString(formData, "emergencyContactName"),
      emergencyContactPhone: optionalString(formData, "emergencyContactPhone"),
      notes: optionalString(formData, "notes"),
      careerId,
      cohortId,
      commissionId,
    },
  });

  const documentTypes = await prisma.documentType.findMany({ where: { institutionId, active: true } });
  if (documentTypes.length > 0) {
    await prisma.document.createMany({
      data: documentTypes.map((dt) => ({ studentId: student.id, documentTypeId: dt.id, status: "PENDIENTE" as const })),
    });
  }

  await prisma.auditLog.create({
    data: {
      institutionId,
      userId: session.user.id,
      action: "CREATE",
      entity: "Student",
      entityId: student.id,
      after: { fileNumber, firstName, lastName, dni },
    },
  });

  redirect(`/alumnas/${student.id}`);
}
