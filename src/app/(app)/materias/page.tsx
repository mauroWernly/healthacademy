import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { Card, CardContent } from "@/components/ui/card";

export default async function MateriasPage() {
  const session = await auth();
  const subjects = await prisma.subject.findMany({
    where: { academicYear: { studyPlan: { career: { institutionId: session!.user.institutionId } } } },
    include: { academicYear: true, semester: true, offerings: { include: { commission: true } } },
    orderBy: [{ academicYear: { order: "asc" } }, { name: "asc" }],
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Materias</h1>
        <p className="text-sm text-slate-500">Plan de estudios — Tecnicatura Superior en Cosmetología Facial y Corporal</p>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Materia</th>
                <th className="px-4 py-2.5">Año</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Comisiones dictando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{s.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.academicYear.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.type}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.offerings.map((o) => o.commission.name).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardContent className="py-4 text-sm text-slate-500">
          La gestión de evaluaciones, régimen de promoción y edición del plan de estudios se completa en una fase
          posterior (Fase 4/6 del plan de implementación — ver ARCHITECTURE.md).
        </CardContent>
      </Card>
    </div>
  );
}
