import Link from "next/link";
import { notFound } from "next/navigation";
import { getCachedStudentSummary, cohortToYearLabel } from "./data";
import { AcademicStatusBadge, FinancialStatusBadge, DocumentationBadge, AttendanceBadge } from "@/components/ui/badge";

const TABS = [
  { href: "", label: "Resumen" },
  { href: "/datos", label: "Datos personales" },
  { href: "/documentacion", label: "Documentación" },
  { href: "/materias", label: "Materias" },
  { href: "/notas", label: "Notas" },
  { href: "/asistencia", label: "Asistencia" },
  { href: "/trabajos-practicos", label: "Trabajos prácticos" },
  { href: "/pagos", label: "Pagos" },
  { href: "/practicas", label: "Prácticas" },
  { href: "/tesina", label: "Tesina" },
  { href: "/historial", label: "Historial" },
];

export default async function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const summary = await getCachedStudentSummary(studentId).catch(() => null);
  if (!summary) notFound();

  const { student } = summary;

  return (
    <div className="space-y-4">
      <Link href="/alumnas" className="text-sm text-slate-500 hover:text-slate-800">
        ← Volver a Alumnas
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {student.lastName}, {student.firstName}
            </h1>
            <p className="text-sm text-slate-500">
              DNI {student.dni} · Legajo {student.fileNumber} · {student.career?.name}
            </p>
            <p className="text-sm text-slate-500">
              {cohortToYearLabel(student.cohort?.name)} · Comisión {student.commission?.name} · {student.cohort?.name}
            </p>
          </div>
          <AcademicStatusBadge status={student.academicStatus} />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <DocumentationBadge complete={summary.documentationComplete} />
          <FinancialStatusBadge status={summary.financial.status} />
          <AttendanceBadge percentage={summary.overallAttendance.percentage} minimum={80} />
        </div>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={`/alumnas/${studentId}${tab.href}`}
            className="rounded-t-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div>{children}</div>
    </div>
  );
}
