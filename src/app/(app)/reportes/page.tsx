import Link from "next/link";
import { auth } from "@/server/auth/config";
import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default async function ReportesPage() {
  const session = await auth();
  const institutionId = session!.user.institutionId;

  const [byAcademicStatus, paymentsByMethod] = await Promise.all([
    prisma.student.groupBy({
      by: ["academicStatus"],
      where: { institutionId, deletedAt: null },
      _count: true,
    }),
    prisma.payment.groupBy({
      by: ["methodId"],
      where: { status: "CONFIRMADO", tuition: { student: { institutionId } } },
      _sum: { amountPaid: true },
      _count: true,
    }),
  ]);

  const methods = await prisma.paymentMethod.findMany({ where: { institutionId } });
  const methodName = new Map(methods.map((m) => [m.id, m.name]));

  const reportLinks = [
    { label: "Alumnas activas", href: "/alumnas?estado=ACTIVA" },
    { label: "Alumnas egresadas", href: "/alumnas?estado=EGRESADA" },
    { label: "Alumnas suspendidas", href: "/alumnas?estado=SUSPENDIDA" },
    { label: "Alumnas condicionales", href: "/alumnas?estado=CONDICIONAL" },
    { label: "Documentación incompleta", href: "/alumnas?documentacion=incompleta" },
    { label: "Cuotas pendientes", href: "/pagos?filtro=pendientes" },
    { label: "Cuotas vencidas / con recargo", href: "/pagos?filtro=vencidas" },
    { label: "Sin pago al día 20", href: "/pagos?filtro=dia20" },
    { label: "Asistencia inferior al mínimo", href: "/alumnas?asistencia=baja" },
    { label: "Próximas a egresar", href: "/alumnas?etapa=final" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-medium tracking-tight text-stone-900">Reportes</h1>
        <p className="text-sm text-stone-500">
          Exportación a CSV/Excel y PDF planificada — por ahora cada reporte abre el listado filtrado correspondiente.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reportes administrativos</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {reportLinks.map((r) => (
            <Link key={r.href} href={r.href} className="rounded-md border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50">
              {r.label}
            </Link>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alumnas por estado académico</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-stone-100">
              {byAcademicStatus.map((row) => (
                <tr key={row.academicStatus}>
                  <td className="py-1.5 pr-4 text-stone-700">{row.academicStatus}</td>
                  <td className="py-1.5 font-medium text-stone-900">{row._count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recaudación por método de pago</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-stone-100">
              {paymentsByMethod.map((row) => (
                <tr key={row.methodId}>
                  <td className="py-1.5 pr-4 text-stone-700">{methodName.get(row.methodId) ?? row.methodId}</td>
                  <td className="py-1.5 pr-4 text-stone-500">{row._count} pagos</td>
                  <td className="py-1.5 font-medium text-stone-900">{formatCurrency(row._sum.amountPaid?.toNumber() ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
