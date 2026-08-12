import { getCachedStudentSummary } from "./data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { updateAcademicStatusAction, createSuspensionAction, liftSuspensionAction } from "./actions";

const ACADEMIC_STATUS_OPTIONS = [
  "PREINSCRIPTA",
  "INSCRIPTA",
  "ACTIVA",
  "REGULAR",
  "CONDICIONAL",
  "EGRESADA",
  "SUSPENDIDA",
  "BAJA",
  "INACTIVA",
] as const;

export default async function StudentSummaryPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();
  const summary = await getCachedStudentSummary(studentId);
  const { student } = summary;
  const canWriteStudent = can(session!.user.permissions, "student:write");
  const canWriteSuspension = can(session!.user.permissions, "suspension:write");

  const nextTuition = summary.tuitions.find((t) => !t.payment || t.payment.status !== "CONFIRMADO");
  const lastPaidTuition = [...summary.tuitions].reverse().find((t) => t.payment?.status === "CONFIRMADO");

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Resumen académico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <p>
            Materias aprobadas: <span className="font-medium">{summary.approvedCount}</span>
          </p>
          <p>
            Materias en curso: <span className="font-medium">{summary.inProgressCount}</span>
          </p>
          <p>
            Materias pendientes: <span className="font-medium">{summary.pendingCount}</span>
          </p>
          <p>
            Asistencia general: <span className="font-medium">{summary.overallAttendance.percentage.toFixed(0)}%</span>{" "}
            ({summary.overallAttendance.present}/{summary.overallAttendance.totalClasses} clases)
          </p>
          {canWriteStudent && (
            <form action={updateAcademicStatusAction} className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
              <input type="hidden" name="studentId" value={studentId} />
              <label className="text-xs uppercase tracking-wide text-slate-500">Estado académico</label>
              <select name="academicStatus" defaultValue={student.academicStatus} className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                {ACADEMIC_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">
                Guardar
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen financiero</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <p>
            Última cuota abonada:{" "}
            <span className="font-medium">{lastPaidTuition ? lastPaidTuition.period : "—"}</span>
          </p>
          <p>
            Próximo vencimiento:{" "}
            <span className="font-medium">{nextTuition ? `${nextTuition.period} (${formatDate(nextTuition.dueDate)})` : "—"}</span>
          </p>
          <p>
            Deuda: <span className="font-medium">{formatCurrency(summary.financial.totalDebt)}</span>
          </p>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Documentación</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.documentationComplete ? (
            <Badge tone="green">Documentación completa</Badge>
          ) : (
            <Badge tone="yellow">Documentación incompleta — faltan {summary.missingDocuments.length} documento(s)</Badge>
          )}
        </CardContent>
      </Card>

      {summary.activeSuspension && (
        <Card className="lg:col-span-2 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Alerta: alumna suspendida</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-700">
            <p>{summary.activeSuspension.reason}</p>
            <p className="mt-1 text-slate-500">Desde {formatDate(summary.activeSuspension.startDate)}</p>
            {canWriteSuspension && (
              <form action={liftSuspensionAction} className="mt-3">
                <input type="hidden" name="studentId" value={studentId} />
                <input type="hidden" name="suspensionId" value={summary.activeSuspension.id} />
                <Button type="submit" size="sm" variant="outline">
                  Levantar suspensión
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {!summary.activeSuspension && canWriteSuspension && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Suspender alumna</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSuspensionAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="studentId" value={studentId} />
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-wide text-slate-500">Motivo</label>
                <input
                  type="text"
                  name="reason"
                  required
                  placeholder="Motivo de la suspensión"
                  className="w-64 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
              <Button type="submit" size="sm" variant="destructive">
                Suspender
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Situación académica por materia (cursada actual)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {summary.currentSubjectRows.length === 0 ? (
            <p className="text-sm text-slate-500">Esta alumna no tiene materias en curso actualmente.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Materia</th>
                  <th className="py-2 pr-4">Promedio</th>
                  <th className="py-2 pr-4">Asistencia</th>
                  <th className="py-2 pr-4">TP</th>
                  <th className="py-2 pr-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.currentSubjectRows.map((row) => (
                  <tr key={row.subjectOfferingId}>
                    <td className="py-2 pr-4 font-medium text-slate-900">{row.subjectName}</td>
                    <td className="py-2 pr-4">{row.average ?? "—"}</td>
                    <td className="py-2 pr-4">{row.attendancePercentage.toFixed(0)}%</td>
                    <td className="py-2 pr-4">{row.assignmentsOk ? "✓" : "✗"}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={row.promotes ? "green" : "yellow"}>{row.promotes ? "Promociona" : "Regular"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
