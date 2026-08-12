import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { addAssignmentAction, updateAssignmentAction } from "./actions";

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "gray",
  ENTREGADO: "blue",
  APROBADO: "green",
  DESAPROBADO: "red",
};
const STATUS_OPTIONS = ["PENDIENTE", "ENTREGADO", "APROBADO", "DESAPROBADO"] as const;

export default async function TrabajosPracticosPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();
  const canWrite = can(session!.user.permissions, "assignment:write");

  const assignments = await prisma.assignment.findMany({
    where: { studentId },
    include: { template: { include: { subjectOffering: { include: { subject: true } } } } },
    orderBy: { template: { subjectOffering: { subject: { name: "asc" } } } },
  });

  const assignedTemplateIds = new Set(assignments.map((a) => a.templateId));

  const currentEnrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId, status: "CURSANDO" },
    include: {
      subjectOffering: {
        include: { subject: true, assignmentTemplates: true },
      },
    },
  });

  const availableTemplates = currentEnrollments.flatMap((e) =>
    e.subjectOffering.assignmentTemplates
      .filter((t) => !assignedTemplateIds.has(t.id))
      .map((t) => ({ id: t.id, name: t.name, dueDate: t.dueDate, subjectName: e.subjectOffering.subject.name }))
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Trabajos prácticos</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {assignments.length === 0 ? (
            <p className="text-sm text-stone-500">Esta alumna no tiene trabajos prácticos registrados.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="py-2 pr-4">Materia</th>
                  <th className="py-2 pr-4">Trabajo</th>
                  <th className="py-2 pr-4">Fecha límite</th>
                  <th className="py-2 pr-4">Entrega</th>
                  <th className="py-2 pr-4">Estado</th>
                  {canWrite && <th className="py-2 pr-4">Actualizar</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="py-2 pr-4 text-stone-900">{a.template.subjectOffering.subject.name}</td>
                    <td className="py-2 pr-4 text-stone-600">{a.template.name}</td>
                    <td className="py-2 pr-4 text-stone-600">{a.template.dueDate ? formatDate(a.template.dueDate) : "—"}</td>
                    <td className="py-2 pr-4 text-stone-600">{a.submittedAt ? formatDate(a.submittedAt) : "—"}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                    </td>
                    {canWrite && (
                      <td className="py-2 pr-4">
                        <form action={updateAssignmentAction} className="flex flex-wrap items-center gap-2">
                          <input type="hidden" name="studentId" value={studentId} />
                          <input type="hidden" name="assignmentId" value={a.id} />
                          <select name="status" defaultValue={a.status} className="rounded-md border border-stone-300 px-2 py-1 text-xs">
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                          <input
                            type="date"
                            name="submittedAt"
                            defaultValue={a.submittedAt ? new Date(a.submittedAt).toISOString().slice(0, 10) : ""}
                            className="rounded-md border border-stone-300 px-2 py-1 text-xs"
                          />
                          <Button type="submit" size="sm" variant="outline">
                            Guardar
                          </Button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Agregar trabajo práctico</CardTitle>
          </CardHeader>
          <CardContent>
            {availableTemplates.length === 0 ? (
              <p className="text-sm text-stone-500">
                No hay trabajos prácticos disponibles para agregar (todas las materias en curso ya tienen sus trabajos asignados, o
                no definen trabajos prácticos).
              </p>
            ) : (
              <form action={addAssignmentAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="studentId" value={studentId} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-stone-500">Trabajo práctico</label>
                  <select name="templateId" required className="rounded-md border border-stone-300 px-2 py-1.5 text-sm">
                    {availableTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.subjectName} — {t.name}
                        {t.dueDate ? ` (vence ${formatDate(t.dueDate)})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" size="sm">
                  Agregar trabajo práctico
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
