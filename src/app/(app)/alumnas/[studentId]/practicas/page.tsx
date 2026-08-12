import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "gray",
  EN_CURSO: "blue",
  COMPLETA: "blue",
  APROBADA: "green",
  NO_APROBADA: "red",
};

export default async function PracticasPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const internships = await prisma.internship.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prácticas profesionales supervisadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {internships.length === 0 ? (
          <p className="text-sm text-slate-500">Esta alumna todavía no tiene prácticas registradas.</p>
        ) : (
          internships.map((i) => (
            <div key={i.id} className="rounded-md border border-slate-200 p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-900">{i.place}</p>
                <Badge tone={STATUS_TONE[i.status]}>{i.status}</Badge>
              </div>
              <p className="mt-1 text-slate-600">Tutor: {i.tutor}</p>
              <p className="text-slate-600">
                {i.startDate ? formatDate(i.startDate) : "—"} → {i.endDate ? formatDate(i.endDate) : "en curso"}
              </p>
              <p className="text-slate-600">
                Horas: {i.completedHours} / {i.requiredHours} requeridas
              </p>
              {i.evaluation && <p className="mt-2 text-slate-700">{i.evaluation}</p>}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
