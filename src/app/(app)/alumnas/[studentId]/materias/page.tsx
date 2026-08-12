import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { enrollSubjectAction, unenrollSubjectAction, updateSubjectEnrollmentStatusAction } from "./actions";

const STATUS_TONE: Record<string, BadgeTone> = {
  CURSANDO: "blue",
  APROBADA: "green",
  PROMOCIONADA: "green",
  DESAPROBADA: "red",
  LIBRE: "yellow",
};
const STATUS_OPTIONS = ["CURSANDO", "APROBADA", "PROMOCIONADA", "DESAPROBADA", "LIBRE"] as const;

export default async function MateriasPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();
  const canWrite = can(session!.user.permissions, "subject:write");

  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true, commissionId: true } });

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId },
    include: { subjectOffering: { include: { subject: { include: { academicYear: true } }, commission: true } } },
    orderBy: [{ subjectOffering: { subject: { academicYear: { order: "asc" } } } }, { subjectOffering: { subject: { name: "asc" } } }],
  });

  const enrolledOfferingIds = new Set(enrollments.map((e) => e.subjectOfferingId));

  const availableOfferings = canWrite
    ? await prisma.subjectOffering.findMany({
        where: {
          id: { notIn: Array.from(enrolledOfferingIds) },
          subject: { academicYear: { studyPlan: { career: { institutionId: student.institutionId } } } },
        },
        include: { subject: { include: { academicYear: true } }, commission: true },
        orderBy: [{ subject: { academicYear: { order: "asc" } } }, { subject: { name: "asc" } }],
      })
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Materias</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {enrollments.length === 0 ? (
            <p className="text-sm text-slate-500">Esta alumna todavía no tiene materias asignadas.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Materia</th>
                  <th className="py-2 pr-4">Año</th>
                  <th className="py-2 pr-4">Comisión</th>
                  <th className="py-2 pr-4">Docente</th>
                  <th className="py-2 pr-4">Estado</th>
                  {canWrite && <th className="py-2 pr-4">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {enrollments.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2 pr-4 font-medium text-slate-900">{e.subjectOffering.subject.name}</td>
                    <td className="py-2 pr-4 text-slate-600">{e.subjectOffering.subject.academicYear.name}</td>
                    <td className="py-2 pr-4 text-slate-600">{e.subjectOffering.commission.name}</td>
                    <td className="py-2 pr-4 text-slate-600">{e.subjectOffering.teacherName}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={STATUS_TONE[e.status] ?? "gray"}>{e.status}</Badge>
                    </td>
                    {canWrite && (
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <form action={updateSubjectEnrollmentStatusAction} className="flex items-center gap-1">
                            <input type="hidden" name="studentId" value={studentId} />
                            <input type="hidden" name="enrollmentId" value={e.id} />
                            <select name="status" defaultValue={e.status} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                              {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <Button type="submit" size="sm" variant="outline">
                              Guardar
                            </Button>
                          </form>
                          <form action={unenrollSubjectAction}>
                            <input type="hidden" name="studentId" value={studentId} />
                            <input type="hidden" name="enrollmentId" value={e.id} />
                            <Button type="submit" size="sm" variant="destructive">
                              Dar de baja
                            </Button>
                          </form>
                        </div>
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
            <CardTitle>Agregar materia</CardTitle>
          </CardHeader>
          <CardContent>
            {availableOfferings.length === 0 ? (
              <p className="text-sm text-slate-500">No hay materias dictadas disponibles para agregar.</p>
            ) : (
              <form action={enrollSubjectAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="studentId" value={studentId} />
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-slate-500">Materia</label>
                  <select name="subjectOfferingId" required className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                    {availableOfferings.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.subject.academicYear.name} — {o.subject.name} ({o.commission.name}, {o.calendarYear})
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" size="sm">
                  Agregar materia
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
