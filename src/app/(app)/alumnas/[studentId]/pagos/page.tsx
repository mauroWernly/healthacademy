import { prisma } from "@/server/db";
import { auth } from "@/server/auth/config";
import { can } from "@/server/auth/permissions";
import { calculateTuitionStatus } from "@/server/domain/tuition";
import { getInstitutionConfig } from "@/server/services/config.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { registerPaymentAction } from "./actions";

export default async function PagosPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const session = await auth();
  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId }, select: { institutionId: true } });
  const config = await getInstitutionConfig(student.institutionId);
  const today = new Date();

  const [tuitions, methods] = await Promise.all([
    prisma.tuition.findMany({
      where: { studentId, deletedAt: null },
      include: { payment: { include: { method: true } } },
      orderBy: { dueDate: "asc" },
    }),
    prisma.paymentMethod.findMany({ where: { institutionId: student.institutionId, active: true } }),
  ]);

  const canRegisterPayment = can(session!.user.permissions, "payment:write");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuotas y pagos</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 pr-4">Período</th>
              <th className="py-2 pr-4">Vencimiento</th>
              <th className="py-2 pr-4">Importe</th>
              <th className="py-2 pr-4">Recargo</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2 pr-4">Estado</th>
              <th className="py-2 pr-4">Método / Fecha de pago</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tuitions.map((t) => {
              const isPaid = t.payment?.status === "CONFIRMADO";
              const computed = calculateTuitionStatus(
                { amount: t.amount.toNumber(), dueDate: t.dueDate, paidAt: isPaid ? t.payment!.paidAt : null },
                today,
                config
              );
              return (
                <tr key={t.id}>
                  <td className="py-2 pr-4 font-medium text-slate-900">{t.period}</td>
                  <td className="py-2 pr-4 text-slate-600">{formatDate(t.dueDate)}</td>
                  <td className="py-2 pr-4 text-slate-600">{formatCurrency(t.amount.toNumber())}</td>
                  <td className="py-2 pr-4 text-slate-600">{computed.surcharge > 0 ? formatCurrency(computed.surcharge) : "—"}</td>
                  <td className="py-2 pr-4 font-medium">{formatCurrency(computed.total)}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={isPaid ? "green" : computed.isCritical ? "red" : computed.status === "CON_RECARGO" ? "yellow" : "blue"}>
                      {isPaid ? "Pagada" : computed.isCritical ? "Crítica" : computed.status}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-slate-600">
                    {isPaid ? `${t.payment!.method.name} — ${formatDate(t.payment!.paidAt)}` : "—"}
                  </td>
                  <td className="py-2 pr-4">
                    {!isPaid && canRegisterPayment && (
                      <form action={registerPaymentAction} className="flex items-center gap-2">
                        <input type="hidden" name="tuitionId" value={t.id} />
                        <input type="hidden" name="studentId" value={studentId} />
                        <select name="methodId" required className="rounded-md border border-slate-300 px-2 py-1 text-xs">
                          {methods.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                        </select>
                        <Button type="submit" size="sm">
                          Confirmar pago {formatCurrency(computed.total)}
                        </Button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {tuitions.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  Esta alumna no tiene cuotas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
