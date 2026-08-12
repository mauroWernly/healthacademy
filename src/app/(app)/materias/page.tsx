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
        <h1 className="font-serif text-2xl font-medium tracking-tight text-stone-900">Materias</h1>
        <p className="text-sm text-stone-500">Plan de estudios — Tecnicatura Superior en Cosmetología Facial y Corporal</p>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-stone-50/70 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3.5">Materia</th>
                <th className="px-4 py-3.5">Año</th>
                <th className="px-4 py-3.5">Tipo</th>
                <th className="px-4 py-3.5">Comisiones dictando</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {subjects.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3.5 font-medium text-stone-900">{s.name}</td>
                  <td className="px-4 py-3.5 text-stone-600">{s.academicYear.name}</td>
                  <td className="px-4 py-3.5 text-stone-600">{s.type}</td>
                  <td className="px-4 py-3.5 text-stone-600">{s.offerings.map((o) => o.commission.name).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardContent className="py-4 text-sm text-stone-500">
          La gestión de evaluaciones, régimen de promoción y edición del plan de estudios se completa en una fase
          posterior (Fase 4/6 del plan de implementación — ver ARCHITECTURE.md).
        </CardContent>
      </Card>
    </div>
  );
}
