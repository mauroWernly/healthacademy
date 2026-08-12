import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";

const STATUS_TONE: Record<string, BadgeTone> = {
  CURSANDO: "blue",
  APROBADA: "green",
  PROMOCIONADA: "green",
  DESAPROBADA: "red",
  LIBRE: "yellow",
};

export default async function MateriasPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId },
    include: { subjectOffering: { include: { subject: { include: { academicYear: true } }, commission: true } } },
    orderBy: [{ subjectOffering: { subject: { academicYear: { order: "asc" } } } }, { subjectOffering: { subject: { name: "asc" } } }],
  });

  return (
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
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
