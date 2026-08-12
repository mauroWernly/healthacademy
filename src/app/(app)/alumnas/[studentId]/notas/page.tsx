import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { getCachedStudentSummary } from "../data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { saveGradeAction } from "./actions";

export default async function NotasPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();
  const summary = await getCachedStudentSummary(studentId);
  const canWrite = can(session!.user.permissions, "grade:write");

  const grades = await prisma.grade.findMany({
    where: { studentId, deletedAt: null },
    include: { evaluation: { include: { template: true, subjectOffering: { include: { subject: true } } } } },
    orderBy: [{ evaluation: { subjectOffering: { subject: { name: "asc" } } } }, { evaluation: { template: { order: "asc" } } }],
  });
  const gradeByTemplate = new Map(grades.map((g) => [`${g.evaluation.subjectOfferingId}:${g.evaluation.templateId}`, g]));

  const currentEnrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId, status: "CURSANDO" },
    include: {
      subjectOffering: {
        include: {
          subject: { include: { evaluationTemplates: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });

  return (
    <div className="space-y-4">
      {summary.currentSubjectRows.length === 0 && (
        <p className="text-sm text-stone-500">Esta alumna no tiene materias en curso actualmente.</p>
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
                  <span className={check.passed ? "text-stone-700" : "text-red-700"}>{check.detail}</span>
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
            <p className="text-stone-500">Promedio informativo: {row.average ?? "—"}</p>
          </CardContent>
        </Card>
      ))}

      {currentEnrollments.map((enrollment) => {
        const offering = enrollment.subjectOffering;
        return (
          <Card key={offering.id}>
            <CardHeader>
              <CardTitle>Cargar notas — {offering.subject.name}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <tr>
                    <th className="py-3 pr-6">Evaluación</th>
                    <th className="py-3 pr-6">Nota actual</th>
                    {canWrite && <th className="py-3 pr-6">Cargar / corregir</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/70">
                  {offering.subject.evaluationTemplates.map((template) => {
                    const grade = gradeByTemplate.get(`${offering.id}:${template.id}`);
                    return (
                      <tr key={template.id}>
                        <td className="py-3 pr-6 text-stone-900">
                          {template.name}
                          {template.retakeOfId && <span className="ml-1 text-xs text-stone-400">(recuperatorio)</span>}
                        </td>
                        <td className="py-3 pr-6 font-medium">{grade?.score?.toString() ?? "—"}</td>
                        {canWrite && (
                          <td className="py-3 pr-6">
                            <form action={saveGradeAction} className="flex flex-wrap items-center gap-2">
                              <input type="hidden" name="studentId" value={studentId} />
                              <input type="hidden" name="subjectOfferingId" value={offering.id} />
                              <input type="hidden" name="templateId" value={template.id} />
                              <input
                                type="number"
                                name="score"
                                min={0}
                                max={10}
                                step="0.01"
                                defaultValue={grade?.score?.toString() ?? ""}
                                placeholder="0-10"
                                className="w-20 rounded-md border border-stone-300 px-2 py-1 text-xs"
                              />
                              <input
                                type="text"
                                name="observations"
                                defaultValue={grade?.observations ?? ""}
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
                  {offering.subject.evaluationTemplates.length === 0 && (
                    <tr>
                      <td colSpan={canWrite ? 3 : 2} className="py-4 text-center text-stone-500">
                        Esta materia no tiene evaluaciones definidas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        );
      })}

      <Card>
        <CardHeader>
          <CardTitle>Detalle de notas</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="py-3 pr-6">Materia</th>
                <th className="py-3 pr-6">Evaluación</th>
                <th className="py-3 pr-6">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {grades.map((g) => (
                <tr key={g.id}>
                  <td className="py-3 pr-6 text-stone-900">{g.evaluation.subjectOffering.subject.name}</td>
                  <td className="py-3 pr-6 text-stone-600">
                    {g.evaluation.template.name}
                    {g.evaluation.template.retakeOfId && <span className="ml-1 text-xs text-stone-400">(recuperatorio)</span>}
                  </td>
                  <td className="py-3 pr-6 font-medium">{g.score?.toString() ?? "—"}</td>
                </tr>
              ))}
              {grades.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-6 text-center text-stone-500">
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
