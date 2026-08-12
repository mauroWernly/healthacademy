import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { calculateAttendance } from "@/server/domain/attendance";
import { getInstitutionConfig } from "@/server/services/config.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AttendanceBadge, Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { recordAttendanceAction } from "./actions";

const STATUS_OPTIONS = ["PRESENTE", "AUSENTE", "AUSENTE_JUSTIFICADA"] as const;
const STATUS_TONE = { PRESENTE: "green", AUSENTE: "red", AUSENTE_JUSTIFICADA: "yellow" } as const;

export default async function AsistenciaPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();
  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });
  const config = await getInstitutionConfig(student.institutionId);
  const canWrite = can(session!.user.permissions, "attendance:write");

  const attendanceRows = await prisma.attendance.findMany({
    where: { studentId, deletedAt: null },
    include: { classSession: { include: { subjectOffering: { include: { subject: true } } } } },
    orderBy: { classSession: { date: "asc" } },
  });

  const bySubject = new Map<string, { subjectName: string; records: Array<{ status: "PRESENTE" | "AUSENTE" | "AUSENTE_JUSTIFICADA" }> }>();
  for (const a of attendanceRows) {
    const key = a.classSession.subjectOfferingId;
    const entry = bySubject.get(key) ?? { subjectName: a.classSession.subjectOffering.subject.name, records: [] };
    entry.records.push({ status: a.status });
    bySubject.set(key, entry);
  }

  const summaryRows = Array.from(bySubject.entries()).map(([id, { subjectName, records }]) => ({
    id,
    subjectName,
    summary: calculateAttendance(records, config.minAttendancePercent),
  }));

  const currentEnrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId, status: "CURSANDO" },
    include: {
      subjectOffering: {
        include: {
          subject: true,
          classSessions: { orderBy: { date: "asc" } },
        },
      },
    },
  });

  const attendanceByClassSession = new Map(attendanceRows.map((a) => [a.classSessionId, a]));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Asistencia por materia</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {summaryRows.length === 0 ? (
            <p className="text-sm text-stone-500">No existen clases registradas para esta alumna todavía.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-3 pr-6">Materia</th>
                  <th className="py-3 pr-6">Clases registradas</th>
                  <th className="py-3 pr-6">Presentes</th>
                  <th className="py-3 pr-6">Ausentes</th>
                  <th className="py-3 pr-6">Justificadas</th>
                  <th className="py-3 pr-6">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {summaryRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-6 font-medium text-stone-900">{row.subjectName}</td>
                    <td className="py-3 pr-6 text-stone-600">{row.summary.totalClasses}</td>
                    <td className="py-3 pr-6 text-stone-600">{row.summary.present}</td>
                    <td className="py-3 pr-6 text-stone-600">{row.summary.absent}</td>
                    <td className="py-3 pr-6 text-stone-600">{row.summary.justified}</td>
                    <td className="py-3 pr-6">
                      <AttendanceBadge percentage={row.summary.percentage} minimum={config.minAttendancePercent} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {currentEnrollments.length === 0 ? (
        <p className="text-sm text-stone-500">Esta alumna no tiene materias en curso actualmente.</p>
      ) : (
        currentEnrollments.map((enrollment) => {
          const offering = enrollment.subjectOffering;
          return (
            <Card key={offering.id}>
              <CardHeader>
                <CardTitle>{offering.subject.name}</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    <tr>
                      <th className="py-3 pr-6">Clase</th>
                      <th className="py-3 pr-6">Estado</th>
                      <th className="py-3 pr-6">Observaciones</th>
                      {canWrite && <th className="py-3 pr-6">Acreditar / corregir</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {offering.classSessions.map((cs) => {
                      const record = attendanceByClassSession.get(cs.id);
                      return (
                        <tr key={cs.id}>
                          <td className="py-3 pr-6 text-stone-900">{formatDate(cs.date)}</td>
                          <td className="py-3 pr-6">
                            {record ? <Badge tone={STATUS_TONE[record.status]}>{record.status}</Badge> : <Badge tone="gray">SIN REGISTRO</Badge>}
                          </td>
                          <td className="py-3 pr-6 text-stone-600">{record?.observations ?? "—"}</td>
                          {canWrite && (
                            <td className="py-3 pr-6">
                              <form action={recordAttendanceAction} className="flex flex-wrap items-center gap-2">
                                <input type="hidden" name="studentId" value={studentId} />
                                <input type="hidden" name="subjectOfferingId" value={offering.id} />
                                <input type="hidden" name="classSessionId" value={cs.id} />
                                <select
                                  name="status"
                                  defaultValue={record?.status ?? "PRESENTE"}
                                  required
                                  className="rounded-md border border-stone-300 px-2 py-1 text-xs"
                                >
                                  {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s}>
                                      {s}
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  name="observations"
                                  defaultValue={record?.observations ?? ""}
                                  placeholder="Observaciones"
                                  className="w-36 rounded-md border border-stone-300 px-2 py-1 text-xs"
                                />
                                <Button type="submit" size="sm" variant="outline">
                                  Guardar
                                </Button>
                              </form>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {offering.classSessions.length === 0 && (
                      <tr>
                        <td colSpan={canWrite ? 4 : 3} className="py-4 text-center text-stone-500">
                          Todavía no hay clases registradas para esta materia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {canWrite && (
                  <form action={recordAttendanceAction} className="mt-4 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-4">
                    <input type="hidden" name="studentId" value={studentId} />
                    <input type="hidden" name="subjectOfferingId" value={offering.id} />
                    <div className="flex flex-col gap-1">
                      <label className="text-xs uppercase tracking-wide text-stone-500">Nueva clase — fecha</label>
                      <input
                        type="date"
                        name="date"
                        required
                        className="rounded-md border border-stone-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs uppercase tracking-wide text-stone-500">Estado</label>
                      <select name="status" required className="rounded-md border border-stone-300 px-2 py-1 text-xs">
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs uppercase tracking-wide text-stone-500">Observaciones</label>
                      <input
                        type="text"
                        name="observations"
                        placeholder="Observaciones"
                        className="w-36 rounded-md border border-stone-300 px-2 py-1 text-xs"
                      />
                    </div>
                    <Button type="submit" size="sm">
                      Acreditar asistencia
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
