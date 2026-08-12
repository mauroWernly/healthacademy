import Link from "next/link";
import { notFound } from "next/navigation";
import { getCachedStudentSummary, cohortToYearLabel } from "./data";
import { AcademicStatusBadge, FinancialStatusBadge, DocumentationBadge, AttendanceBadge } from "@/components/ui/badge";
import { StudentNav } from "./student-nav";

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
      <Link href="/alumnas" className="text-sm text-muted transition-colors hover:text-accent">
        ← Volver a Alumnas
      </Link>

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-[0_1px_2px_rgba(32,29,26,0.04),0_8px_24px_-16px_rgba(32,29,26,0.12)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-xl font-medium tracking-tight text-foreground">
              {student.lastName}, {student.firstName}
            </h1>
            <p className="text-sm text-muted">
              DNI {student.dni} · Legajo {student.fileNumber} · {student.career?.name}
            </p>
            <p className="text-sm text-muted">
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

      <StudentNav studentId={studentId} />

      <div>{children}</div>
    </div>
  );
}
