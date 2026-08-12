import { prisma } from "@/server/db";
import { getCachedStudentSummary } from "../data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function NotasPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const summary = await getCachedStudentSummary(studentId);

  const grades = await prisma.grade.findMany({
    where: { studentId, deletedAt: null },
    include: { evaluation: { include: { template: true, subjectOffering: { include: { subject: true } } } } },
    orderBy: [{ evaluation: { subjectOffering: { subject: { name: "asc" } } } }, { evaluation: { template: { order: "asc" } } }],
  });

  return (
    <div className="space-y-4">
      {summary.currentSubjectRows.length === 0 && (
        <p className="text-sm text-slate-500">Esta alumna no tiene materias en curso actualmente.</p>
      )}

      {summary.currentSubjectRows.map((row) => (
        <Card key={row.subjectOfferingId}>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>{row.subjectName}</CardTitle>
            <Badge tone={row.promotes ? "green" : "yellow"}>{row.promotes ? "PROMOCIÓN DIRECTA" : "NO PROMOCIONA"}</Badge>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-1">
              {row.checks.map((check, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span>{check.passed ? "✓" : "✗"}</span>
                  <span className={check.passed ? "text-slate-700" : "text-red-700"}>{check.detail}</span>
                </li>
              ))}
            </ul>
            {!row.promotes && row.reasons.length > 0 && (
              <div className="rounded-md bg-amber-50 px-3 py-2 text-amber-800 ring-1 ring-inset ring-amber-600/20">
                <p className="font-medium">Motivo:</p>
                <ul className="list-inside list-disc">
                  {row.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-slate-500">Promedio informativo: {row.average ?? "—"}</p>
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Detalle de notas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Materia</th>
                <th className="py-2 pr-4">Evaluación</th>
                <th className="py-2 pr-4">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {grades.map((g) => (
                <tr key={g.id}>
                  <td className="py-2 pr-4 text-slate-900">{g.evaluation.subjectOffering.subject.name}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {g.evaluation.template.name}
                    {g.evaluation.template.retakeOfId && <span className="ml-1 text-xs text-slate-400">(recuperatorio)</span>}
                  </td>
                  <td className="py-2 pr-4 font-medium">{g.score?.toString() ?? "—"}</td>
                </tr>
              ))}
              {grades.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-slate-500">
                    Esta alumna todavía no tiene evaluaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
