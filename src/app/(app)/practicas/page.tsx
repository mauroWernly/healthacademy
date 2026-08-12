import Link from "next/link";
import { auth } from "@/server/auth/config";
import { prisma } from "@/server/db";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BadgeTone } from "@/components/ui/badge";

const STATUS_TONE: Record<string, BadgeTone> = {
  PENDIENTE: "gray",
  EN_CURSO: "blue",
  COMPLETA: "blue",
  APROBADA: "green",
  NO_APROBADA: "red",
};

export default async function PracticasIndexPage() {
  const session = await auth();
  const internships = await prisma.internship.findMany({
    where: { student: { institutionId: session!.user.institutionId } },
    include: { student: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Prácticas profesionales supervisadas</h1>
        <p className="text-sm text-slate-500">{internships.length} registro{internships.length === 1 ? "" : "s"}</p>
      </div>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Alumna</th>
                <th className="px-4 py-2.5">Lugar</th>
                <th className="px-4 py-2.5">Tutor</th>
                <th className="px-4 py-2.5">Horas</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {internships.map((i) => (
                <tr key={i.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {i.student.lastName}, {i.student.firstName}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{i.place}</td>
                  <td className="px-4 py-2.5 text-slate-600">{i.tutor}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {i.completedHours}/{i.requiredHours}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge tone={STATUS_TONE[i.status]}>{i.status}</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/alumnas/${i.studentId}/practicas`} className="text-sm font-medium text-slate-900 hover:underline">
                      Ver legajo
                    </Link>
                  </td>
                </tr>
              ))}
              {internships.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No hay prácticas registradas todavía.
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
