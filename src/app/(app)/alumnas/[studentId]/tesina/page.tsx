import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "gray",
  EN_PREPARACION: "blue",
  PRESENTADA: "blue",
  APROBADA: "green",
  DESAPROBADA: "red",
};

export default async function TesinaPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const thesis = await prisma.thesis.findUnique({ where: { studentId } });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tesina final</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!thesis ? (
          <p className="text-slate-500">Esta alumna todavía no inició la etapa de tesina.</p>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="font-medium text-slate-900">{thesis.title ?? "Título a definir"}</p>
              <Badge tone={STATUS_TONE[thesis.status]}>{thesis.status}</Badge>
            </div>
            <p className="text-slate-600">Tutor: {thesis.tutor ?? "—"}</p>
            <p className="text-slate-600">Fecha: {thesis.date ? formatDate(thesis.date) : "—"}</p>
            <p className="text-slate-600">Nota: {thesis.grade?.toString() ?? "—"}</p>
            {thesis.observations && <p className="text-slate-700">{thesis.observations}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
