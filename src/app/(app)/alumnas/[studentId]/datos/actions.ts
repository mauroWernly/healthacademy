"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";

function optionalString(formData: FormData, key: string): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value || null;
}

/** Modifica los datos personales de una alumna existente (sección 3). */
export async function updateStudentDataAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "student:write");

  const studentId = String(formData.get("studentId") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").trim();
  if (!firstName || !lastName || !dni) {
    throw new Error("Nombre, apellido y DNI son obligatorios.");
  }

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });

  const dniOwner = await prisma.student.findUnique({ where: { dni } });
  if (dniOwner && dniOwner.id !== studentId) {
    throw new Error("Ya existe otra alumna registrada con ese DNI.");
  }

  const birthDateRaw = optionalString(formData, "birthDate");

  const data = {
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
  };

  await prisma.student.update({ where: { id: studentId }, data });

  await prisma.auditLog.create({
    data: {
      institutionId: student.institutionId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Student",
      entityId: studentId,
      before: {
        firstName: student.firstName,
        lastName: student.lastName,
        dni: student.dni,
      },
      after: { firstName, lastName, dni },
    },
  });

  revalidatePath(`/alumnas/${studentId}/datos`);
  revalidatePath(`/alumnas/${studentId}`);
  revalidatePath("/alumnas");
  redirect(`/alumnas/${studentId}/datos`);
}
