import Link from "next/link";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { listStudents } from "@/server/services/students.service";
import { Card, CardContent } from "@/components/ui/card";
import { AcademicStatusBadge, FinancialStatusBadge, DocumentationBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

const ACADEMIC_STATUS_OPTIONS = [
  "PREINSCRIPTA",
  "INSCRIPTA",
  "ACTIVA",
  "REGULAR",
  "CONDICIONAL",
  "EGRESADA",
  "SUSPENDIDA",
  "BAJA",
  "INACTIVA",
];

const FINANCIAL_STATUS_OPTIONS = ["AL_DIA", "PENDIENTE", "CON_RECARGO", "MOROSA", "SUSPENDIDA"];

interface SearchParams {
  q?: string;
  estado?: string;
  financiero?: string;
  documentacion?: string;
  asistencia?: string;
  etapa?: string;
  page?: string;
}

export default async function AlumnasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const session = await auth();

  const page = Number(sp.page ?? "1") || 1;
  const { rows, total, pageSize } = await listStudents(session!.user.institutionId, {
    q: sp.q,
    academicStatus: sp.estado,
    financialStatus: sp.financiero as never,
    documentacion: sp.documentacion === "incompleta" ? "incompleta" : undefined,
    asistencia: sp.asistencia === "baja" ? "baja" : undefined,
    etapa: sp.etapa === "final" ? "final" : undefined,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canWrite = can(session!.user.permissions, "student:write");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-medium tracking-tight text-stone-900">Alumnas</h1>
          <p className="text-sm text-stone-500">{total} resultado{total === 1 ? "" : "s"}</p>
        </div>
        {canWrite && (
          <Link href="/alumnas/nueva">
            <Button>+ Nueva alumna</Button>
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="py-4">
          <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" method="GET">
            <input
              type="search"
              name="q"
              defaultValue={sp.q ?? ""}
              placeholder="Nombre, DNI, legajo, email..."
              className="rounded-md border border-stone-300 px-3 py-1.5 text-sm lg:col-span-2"
            />
            <select name="estado" defaultValue={sp.estado ?? ""} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">
              <option value="">Estado académico (todos)</option>
              {ACADEMIC_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select name="financiero" defaultValue={sp.financiero ?? ""} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm">
              <option value="">Estado financiero (todos)</option>
              {FINANCIAL_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground hover:bg-accent-hover">
              Filtrar
            </button>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-2.5">Alumna</th>
                <th className="px-4 py-2.5">DNI</th>
                <th className="px-4 py-2.5">Legajo</th>
                <th className="px-4 py-2.5">Carrera / Comisión</th>
                <th className="px-4 py-2.5">Estado académico</th>
                <th className="px-4 py-2.5">Estado financiero</th>
                <th className="px-4 py-2.5">Documentación</th>
                <th className="px-4 py-2.5">Asistencia</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-stone-50">
                  <td className="px-4 py-2.5 font-medium text-stone-900">
                    {s.lastName}, {s.firstName}
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{s.dni}</td>
                  <td className="px-4 py-2.5 text-stone-600">{s.fileNumber}</td>
                  <td className="px-4 py-2.5 text-stone-600">
                    {s.cohortName} — {s.commissionName}
                  </td>
                  <td className="px-4 py-2.5">
                    <AcademicStatusBadge status={s.academicStatus} />
                  </td>
                  <td className="px-4 py-2.5">
                    <FinancialStatusBadge status={s.financialStatus} />
                    {s.debt > 0 && <p className="mt-0.5 text-xs text-stone-500">{formatCurrency(s.debt)}</p>}
                  </td>
                  <td className="px-4 py-2.5">
                    <DocumentationBadge complete={s.documentationComplete} />
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{s.attendancePercentage.toFixed(0)}%</td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/alumnas/${s.id}`} className="text-sm font-medium text-stone-900 underline-offset-2 hover:underline">
                      Abrir legajo
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-stone-500">
                    No hay alumnas que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={{ pathname: "/alumnas", query: { ...sp, page: String(p) } }}
              className={`rounded-md px-3 py-1 ${p === page ? "bg-accent text-accent-foreground" : "text-stone-600 hover:bg-stone-100"}`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
