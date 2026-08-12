import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "gray",
  ENTREGADO: "blue",
  APROBADO: "green",
  DESAPROBADO: "red",
};

export default async function TrabajosPracticosPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const assignments = await prisma.assignment.findMany({
    where: { studentId },
    include: { template: { include: { subjectOffering: { include: { subject: true } } } } },
    orderBy: { template: { subjectOffering: { subject: { name: "asc" } } } },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trabajos prácticos</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">Esta alumna no tiene trabajos prácticos registrados.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Materia</th>
                <th className="py-2 pr-4">Trabajo</th>
                <th className="py-2 pr-4">Fecha límite</th>
                <th className="py-2 pr-4">Entrega</th>
                <th className="py-2 pr-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td className="py-2 pr-4 text-slate-900">{a.template.subjectOffering.subject.name}</td>
                  <td className="py-2 pr-4 text-slate-600">{a.template.name}</td>
                  <td className="py-2 pr-4 text-slate-600">{a.template.dueDate ? formatDate(a.template.dueDate) : "—"}</td>
                  <td className="py-2 pr-4 text-slate-600">{a.submittedAt ? formatDate(a.submittedAt) : "—"}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
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
