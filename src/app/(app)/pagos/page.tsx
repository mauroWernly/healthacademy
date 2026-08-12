import Link from "next/link";
import { auth } from "@/server/auth/config";
import { prisma } from "@/server/db";
import { calculateTuitionStatus } from "@/server/domain/tuition";
import { getInstitutionConfig } from "@/server/services/config.service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SearchParams {
  filtro?: "todas" | "pendientes" | "vencidas" | "recargo" | "dia20" | "transferencia" | "efectivo";
}

export default async function ControlDeCuotasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { filtro = "todas" } = await searchParams;
  const session = await auth();
  const institutionId = session!.user.institutionId;
  const config = await getInstitutionConfig(institutionId);
  const today = new Date();

  const tuitions = await prisma.tuition.findMany({
    where: { student: { institutionId, deletedAt: null }, deletedAt: null },
    include: { student: true, payment: { include: { method: true } } },
    orderBy: { dueDate: "asc" },
  });

  let rows = tuitions
    .filter((t) => !(t.payment?.status === "CONFIRMADO"))
    .map((t) => {
      const computed = calculateTuitionStatus({ amount: t.amount.toNumber(), dueDate: t.dueDate, paidAt: null }, today, config);
      const daysLate = Math.max(0, Math.floor((today.getTime() - t.dueDate.getTime()) / 86400000));
      return { tuition: t, computed, daysLate };
    });

  if (filtro === "pendientes") rows = rows.filter((r) => r.computed.status === "PENDIENTE");
  if (filtro === "vencidas" || filtro === "recargo") rows = rows.filter((r) => r.computed.status === "CON_RECARGO");
  if (filtro === "dia20") rows = rows.filter((r) => r.computed.isCritical);

  const filters: Array<{ key: SearchParams["filtro"]; label: string }> = [
    { key: "todas", label: "Todas" },
    { key: "pendientes", label: "Pendientes" },
    { key: "vencidas", label: "Vencidas" },
    { key: "recargo", label: "Con recargo" },
    { key: "dia20", label: "Sin pago al día 20" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight text-stone-900">Control de cuotas</h1>
        <p className="text-sm text-stone-500">Cuotas impagas — {rows.length} resultado{rows.length === 1 ? "" : "s"}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <Link
            key={f.key}
            href={{ pathname: "/pagos", query: { filtro: f.key } }}
            className={`rounded-full px-3 py-1 text-sm ${filtro === f.key ? "bg-accent text-accent-foreground" : "bg-surface text-stone-600 ring-1 ring-inset ring-stone-200 hover:bg-stone-50"}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-stone-50/70 text-[11px] font-semibold uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3.5">Alumna</th>
                <th className="px-4 py-3.5">DNI</th>
                <th className="px-4 py-3.5">Legajo</th>
                <th className="px-4 py-3.5">Período</th>
                <th className="px-4 py-3.5">Vencimiento</th>
                <th className="px-4 py-3.5">Días de atraso</th>
                <th className="px-4 py-3.5">Importe</th>
                <th className="px-4 py-3.5">Recargo</th>
                <th className="px-4 py-3.5">Total</th>
                <th className="px-4 py-3.5">Estado</th>
                <th className="px-4 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {rows.map(({ tuition: t, computed, daysLate }) => (
                <tr key={t.id} className="transition-colors hover:bg-accent/[0.04]">
                  <td className="px-4 py-3.5 font-medium text-stone-900">
                    {t.student.lastName}, {t.student.firstName}
                  </td>
                  <td className="px-4 py-3.5 text-stone-600">{t.student.dni}</td>
                  <td className="px-4 py-3.5 text-stone-600">{t.student.fileNumber}</td>
                  <td className="px-4 py-3.5 text-stone-600">{t.period}</td>
                  <td className="px-4 py-3.5 text-stone-600">{formatDate(t.dueDate)}</td>
                  <td className="px-4 py-3.5 text-stone-600">{daysLate > 0 ? daysLate : "—"}</td>
                  <td className="px-4 py-3.5 text-stone-600">{formatCurrency(t.amount.toNumber())}</td>
                  <td className="px-4 py-3.5 text-stone-600">{computed.surcharge > 0 ? formatCurrency(computed.surcharge) : "—"}</td>
                  <td className="px-4 py-3.5 font-medium">{formatCurrency(computed.total)}</td>
                  <td className="px-4 py-3.5">
                    <Badge tone={computed.isCritical ? "red" : computed.status === "CON_RECARGO" ? "yellow" : "blue"}>
                      {computed.isCritical ? "Crítica" : computed.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link href={`/alumnas/${t.studentId}/pagos`} className="text-sm font-medium text-stone-900 hover:underline">
                      Registrar pago
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-10 text-center text-sm text-stone-500">
                    No hay cuotas que coincidan con este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
