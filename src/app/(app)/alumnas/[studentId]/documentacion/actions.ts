"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { requirePermission } from "@/server/auth/permissions";
import type { DocumentStatus } from "@/generated/prisma/enums";

const VALID_STATUSES: DocumentStatus[] = ["PENDIENTE", "PRESENTADO", "VALIDADO", "RECHAZADO"];

/** Actualiza el estado de un documento del legajo (cargar/validar/rechazar, sección 12). */
export async function updateDocumentStatusAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autenticado.");
  requirePermission(session.user.permissions, "document:write");

  const documentId = String(formData.get("documentId") ?? "");
  const studentId = String(formData.get("studentId") ?? "");
  const status = String(formData.get("status") ?? "");
  const observations = String(formData.get("observations") ?? "").trim();

  if (!VALID_STATUSES.includes(status as DocumentStatus)) {
    throw new Error("Estado de documento inválido.");
  }

  const document = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  if (document.studentId !== studentId) {
    throw new Error("El documento no pertenece a esta alumna.");
  }

  const now = new Date();
  const data: {
    status: DocumentStatus;
    observations: string | null;
    uploadedAt?: Date;
    validatedAt?: Date | null;
    validatedById?: string | null;
  } = {
    status: status as DocumentStatus,
    observations: observations || null,
  };

  if (status === "PRESENTADO" && !document.uploadedAt) {
    data.uploadedAt = now;
  }
  if (status === "VALIDADO") {
    data.uploadedAt = document.uploadedAt ?? now;
    data.validatedAt = now;
    data.validatedById = session.user.id;
  }
  if (status === "RECHAZADO") {
    data.validatedAt = now;
    data.validatedById = session.user.id;
  }
  if (status === "PENDIENTE") {
    data.validatedAt = null;
    data.validatedById = null;
  }

  await prisma.document.update({ where: { id: documentId }, data });

  await prisma.auditLog.create({
    data: {
      institutionId: session.user.institutionId,
      userId: session.user.id,
      action: "UPDATE",
      entity: "Document",
      entityId: documentId,
      before: { status: document.status, observations: document.observations },
      after: { status, observations: observations || null },
    },
  });

  revalidatePath(`/alumnas/${studentId}/documentacion`);
  revalidatePath(`/alumnas/${studentId}`);
  revalidatePath("/alumnas");
}
