import { prisma } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function HistorialPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;

  // El historial de auditoría cubre la alumna y las cuotas asociadas (pagos registrados sobre su legajo).
  const tuitionIds = (await prisma.tuition.findMany({ where: { studentId }, select: { id: true } })).map((t) => t.id);

  const logs = await prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: "Student", entityId: studentId },
        { entity: "Payment", entityId: { in: tuitionIds } },
      ],
    },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de auditoría</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {logs.length === 0 ? (
          <p className="text-stone-500">No hay eventos de auditoría registrados para esta alumna todavía.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="rounded-md border border-stone-200 px-3 py-2">
              <p className="text-stone-900">
                {new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(log.createdAt)} —{" "}
                <span className="font-medium">{log.user?.name ?? "Sistema"}</span> — {log.action} {log.entity}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
