import { prisma } from "@/server/db";
import { calculateAttendance } from "@/server/domain/attendance";
import { getInstitutionConfig } from "@/server/services/config.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceBadge } from "@/components/ui/badge";

export default async function AsistenciaPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });
  const config = await getInstitutionConfig(student.institutionId);

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

  const rows = Array.from(bySubject.entries()).map(([id, { subjectName, records }]) => ({
    id,
    subjectName,
    summary: calculateAttendance(records, config.minAttendancePercent),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asistencia por materia</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500">No existen clases registradas para esta alumna todavía.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Materia</th>
                <th className="py-2 pr-4">Clases registradas</th>
                <th className="py-2 pr-4">Presentes</th>
                <th className="py-2 pr-4">Ausentes</th>
                <th className="py-2 pr-4">Justificadas</th>
                <th className="py-2 pr-4">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="py-2 pr-4 font-medium text-slate-900">{row.subjectName}</td>
                  <td className="py-2 pr-4 text-slate-600">{row.summary.totalClasses}</td>
                  <td className="py-2 pr-4 text-slate-600">{row.summary.present}</td>
                  <td className="py-2 pr-4 text-slate-600">{row.summary.absent}</td>
                  <td className="py-2 pr-4 text-slate-600">{row.summary.justified}</td>
                  <td className="py-2 pr-4">
                    <AttendanceBadge percentage={row.summary.percentage} minimum={config.minAttendancePercent} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
