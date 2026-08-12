import { cache } from "react";
import { getStudentSummary } from "@/server/services/students.service";

/** Memoiza la consulta dentro de un mismo request: el layout y la página activa comparten el resultado. */
export const getCachedStudentSummary = cache(async (studentId: string) => {
  return getStudentSummary(studentId);
});

export function cohortToYearLabel(cohortName: string | null | undefined): string {
  if (cohortName === "Cohorte 2026") return "1° Año";
  if (cohortName === "Cohorte 2025") return "2° Año";
  if (cohortName === "Cohorte 2024") return "Etapa Final";
  return "—";
}
