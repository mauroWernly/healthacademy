import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { saveThesisAction } from "./actions";

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "gray",
  EN_PREPARACION: "blue",
  PRESENTADA: "blue",
  APROBADA: "green",
  DESAPROBADA: "red",
};
const STATUS_OPTIONS = ["PENDIENTE", "EN_PREPARACION", "PRESENTADA", "APROBADA", "DESAPROBADA"] as const;

const inputClass = "w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm";

export default async function TesinaPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();
  const canWrite = can(session!.user.permissions, "thesis:write");
  const thesis = await prisma.thesis.findUnique({ where: { studentId } });

  return (
    <div className="space-y-4">
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

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>{thesis ? "Editar tesina" : "Iniciar tesina"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveThesisAction} className="space-y-4">
              <input type="hidden" name="studentId" value={studentId} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Título</label>
                  <input type="text" name="title" defaultValue={thesis?.title ?? ""} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Tutor</label>
                  <input type="text" name="tutor" defaultValue={thesis?.tutor ?? ""} className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Fecha</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={thesis?.date ? new Date(thesis.date).toISOString().slice(0, 10) : ""}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Estado</label>
                  <select name="status" defaultValue={thesis?.status ?? "PENDIENTE"} className={inputClass}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-wide text-slate-400">Nota</label>
                  <input type="number" name="grade" min={0} max={10} step="0.01" defaultValue={thesis?.grade?.toString() ?? ""} className={inputClass} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-wide text-slate-400">Observaciones</label>
                <textarea name="observations" rows={3} defaultValue={thesis?.observations ?? ""} className={inputClass} />
              </div>
              <div className="flex justify-end border-t border-slate-100 pt-4">
                <Button type="submit">Guardar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
