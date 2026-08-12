export type AttendanceRecordStatus = "PRESENTE" | "AUSENTE" | "AUSENTE_JUSTIFICADA";

export interface AttendanceRecordLike {
  status: AttendanceRecordStatus;
}

export interface AttendanceSummary {
  totalClasses: number;
  present: number;
  absent: number;
  justified: number;
  /** 0-100, redondeado a 2 decimales. */
  percentage: number;
  meetsMinimum: boolean;
}

/**
 * El % de asistencia se calcula sobre las clases EFECTIVAMENTE registradas
 * para esa materia (sección 24), nunca sobre un total fijo de clases.
 *
 * Decisión de diseño: una ausencia justificada cuenta como ausencia para el
 * cálculo del porcentaje (solo se distingue para fines administrativos /
 * de visualización). Si la institución necesita que las justificadas no
 * penalicen, es un cambio acotado a esta función.
 */
export function calculateAttendance(
  records: AttendanceRecordLike[],
  minAttendancePercent: number
): AttendanceSummary {
  const totalClasses = records.length;
  const present = records.filter((r) => r.status === "PRESENTE").length;
  const absent = records.filter((r) => r.status === "AUSENTE").length;
  const justified = records.filter((r) => r.status === "AUSENTE_JUSTIFICADA").length;

  const percentage = totalClasses === 0 ? 100 : round2((present / totalClasses) * 100);

  return {
    totalClasses,
    present,
    absent,
    justified,
    percentage,
    meetsMinimum: percentage >= minAttendancePercent,
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
