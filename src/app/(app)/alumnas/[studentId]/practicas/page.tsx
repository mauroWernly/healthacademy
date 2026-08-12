import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { addInternshipAction, updateInternshipAction } from "./actions";

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "gray",
  EN_CURSO: "blue",
  COMPLETA: "blue",
  APROBADA: "green",
  NO_APROBADA: "red",
};
const STATUS_OPTIONS = ["PENDIENTE", "EN_CURSO", "COMPLETA", "APROBADA", "NO_APROBADA"] as const;

const inputClass = "rounded-md border border-stone-300 px-2 py-1 text-xs";

export default async function PracticasPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();
  const canWrite = can(session!.user.permissions, "internship:write");
  const internships = await prisma.internship.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Prácticas profesionales supervisadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {internships.length === 0 ? (
            <p className="text-sm text-stone-500">Esta alumna todavía no tiene prácticas registradas.</p>
          ) : (
            internships.map((i) => (
              <div key={i.id} className="rounded-md border border-stone-200 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-stone-900">{i.place}</p>
                  <Badge tone={STATUS_TONE[i.status]}>{i.status}</Badge>
                </div>
                <p className="mt-1 text-stone-600">Tutor: {i.tutor}</p>
                <p className="text-stone-600">
                  {i.startDate ? formatDate(i.startDate) : "—"} → {i.endDate ? formatDate(i.endDate) : "en curso"}
                </p>
                <p className="text-stone-600">
                  Horas: {i.completedHours} / {i.requiredHours} requeridas
                </p>
                {i.evaluation && <p className="mt-2 text-stone-700">{i.evaluation}</p>}

                {canWrite && (
                  <form action={updateInternshipAction} className="mt-3 flex flex-wrap items-end gap-2 border-t border-stone-100 pt-3">
                    <input type="hidden" name="studentId" value={studentId} />
                    <input type="hidden" name="internshipId" value={i.id} />
                    <div className="flex flex-col gap-1">
                      <label className="text-xs uppercase tracking-wide text-stone-400">Estado</label>
                      <select name="status" defaultValue={i.status} className={inputClass}>
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs uppercase tracking-wide text-stone-400">Horas cumplidas</label>
                      <input type="number" name="completedHours" min={0} defaultValue={i.completedHours} className={`${inputClass} w-24`} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs uppercase tracking-wide text-stone-400">Fecha de fin</label>
                      <input
                        type="date"
                        name="endDate"
                        defaultValue={i.endDate ? new Date(i.endDate).toISOString().slice(0, 10) : ""}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1">
                      <label className="text-xs uppercase tracking-wide text-stone-400">Evaluación</label>
                      <input type="text" name="evaluation" defaultValue={i.evaluation ?? ""} className={`${inputClass} w-full`} />
                    </div>
                    <Button type="submit" size="sm" variant="outline">
                      Guardar
                    </Button>
                  </form>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Agregar práctica</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addInternshipAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="studentId" value={studentId} />
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-wide text-stone-400">Lugar *</label>
                <input type="text" name="place" required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-wide text-stone-400">Tutor *</label>
                <input type="text" name="tutor" required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-wide text-stone-400">Horas requeridas *</label>
                <input type="number" name="requiredHours" min={1} required className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs uppercase tracking-wide text-stone-400">Fecha de inicio</label>
                <input type="date" name="startDate" className={inputClass} />
              </div>
              <div className="lg:col-span-4">
                <Button type="submit" size="sm">
                  Agregar práctica
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
