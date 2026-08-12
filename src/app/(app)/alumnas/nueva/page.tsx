import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createStudentAction } from "./actions";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "rounded-md border border-slate-300 px-3 py-1.5 text-sm";

export default async function NuevaAlumnaPage() {
  const session = await auth();
  if (!can(session!.user.permissions, "student:write")) {
    redirect("/alumnas");
  }

  const institutionId = session!.user.institutionId;
  const [careers, cohorts, commissions] = await Promise.all([
    prisma.career.findMany({ where: { institutionId, active: true }, orderBy: { name: "asc" } }),
    prisma.cohort.findMany({ where: { institutionId }, include: { career: true }, orderBy: { startYear: "desc" } }),
    prisma.commission.findMany({ where: { institutionId }, include: { cohort: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-4">
      <Link href="/alumnas" className="text-sm text-slate-500 hover:text-slate-800">
        ← Volver a Alumnas
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Nueva alumna</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStudentAction} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Nombre *">
                <input type="text" name="firstName" required className={inputClass} />
              </Field>
              <Field label="Apellido *">
                <input type="text" name="lastName" required className={inputClass} />
              </Field>
              <Field label="DNI *">
                <input type="text" name="dni" required className={inputClass} />
              </Field>
              <Field label="Fecha de nacimiento">
                <input type="date" name="birthDate" className={inputClass} />
              </Field>
              <Field label="Lugar de nacimiento">
                <input type="text" name="birthPlace" className={inputClass} />
              </Field>
              <Field label="Nacionalidad">
                <input type="text" name="nationality" className={inputClass} />
              </Field>
              <Field label="Domicilio">
                <input type="text" name="address" className={inputClass} />
              </Field>
              <Field label="Localidad">
                <input type="text" name="city" className={inputClass} />
              </Field>
              <Field label="Provincia">
                <input type="text" name="province" className={inputClass} />
              </Field>
              <Field label="Teléfono">
                <input type="tel" name="phone" className={inputClass} />
              </Field>
              <Field label="Email">
                <input type="email" name="email" className={inputClass} />
              </Field>
              <Field label="Contacto de emergencia">
                <input type="text" name="emergencyContactName" className={inputClass} />
              </Field>
              <Field label="Teléfono de emergencia">
                <input type="tel" name="emergencyContactPhone" className={inputClass} />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
              <Field label="Carrera">
                <select name="careerId" defaultValue="" className={inputClass}>
                  <option value="">Sin asignar</option>
                  {careers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Cohorte">
                <select name="cohortId" defaultValue="" className={inputClass}>
                  <option value="">Sin asignar</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.career.name})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Comisión">
                <select name="commissionId" defaultValue="" className={inputClass}>
                  <option value="">Sin asignar</option>
                  {commissions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.cohort.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <Field label="Observaciones">
                <textarea name="notes" rows={3} className={inputClass} />
              </Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Link href="/alumnas">
                <Button type="button" variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit">Crear alumna</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
