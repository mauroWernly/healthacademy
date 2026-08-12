import Link from "next/link";
import { auth } from "@/server/auth/config";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "gray",
  EN_PREPARACION: "blue",
  PRESENTADA: "blue",
  APROBADA: "green",
  DESAPROBADA: "red",
};

export default async function TesinasIndexPage() {
  const session = await auth();
  const theses = await prisma.thesis.findMany({
    where: { student: { institutionId: session!.user.institutionId } },
    include: { student: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Tesinas</h1>
        <p className="text-sm text-slate-500">{theses.length} registro{theses.length === 1 ? "" : "s"}</p>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Alumna</th>
                <th className="px-4 py-2.5">Título</th>
                <th className="px-4 py-2.5">Tutor</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {theses.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {t.student.lastName}, {t.student.firstName}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{t.title ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{t.tutor ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/alumnas/${t.studentId}/tesina`} className="text-sm font-medium text-slate-900 hover:underline">
                      Ver legajo
                    </Link>
                  </td>
                </tr>
              ))}
              {theses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    No hay tesinas registradas todavía.
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
