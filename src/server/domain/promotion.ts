/**
 * Motor de promoción — genérico por materia, dirigido por el
 * `EvaluationTemplate` real de cada materia (sección 25). NO asume una
 * estructura fija de "dos parciales": si una materia define TP + Defensa,
 * el motor evalúa exactamente esas evaluaciones requeridas que afectan
 * promoción.
 */

export interface PromotionEvaluationInput {
  templateId: string;
  name: string;
  isRequired: boolean;
  affectsPromotion: boolean;
  /** Si esta evaluación ES un recuperatorio de otra, se excluye del cálculo de promoción directa. */
  retakeOfTemplateId: string | null;
  /** Override de nota mínima para promoción directa; si es null usa `defaultMinGradeForPromotion`. */
  minGradeForPromotion: number | null;
  /** Nota original (null = todavía no calificada). */
  score: number | null;
}

export interface PromotionInput {
  evaluations: PromotionEvaluationInput[];
  /** Booleano simplificado de la sección 22: "Cumple trabajos prácticos". */
  assignmentsOk: boolean;
  attendance: { percentage: number; meetsMinimum: boolean };
  defaultMinGradeForPromotion: number;
}

export interface PromotionCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface PromotionResult {
  promotes: boolean;
  checks: PromotionCheck[];
  /** Vacío si promociona. */
  reasons: string[];
  /** Promedio informativo de las evaluaciones que afectan promoción (no decide el resultado, sección 27). */
  average: number | null;
}

export function evaluatePromotion(input: PromotionInput): PromotionResult {
  const checks: PromotionCheck[] = [];
  const reasons: string[] = [];

  const promotionEvaluations = input.evaluations.filter(
    (e) => e.affectsPromotion && e.isRequired && e.retakeOfTemplateId === null
  );

  for (const evaluation of promotionEvaluations) {
    const minGrade = evaluation.minGradeForPromotion ?? input.defaultMinGradeForPromotion;
    const passed = evaluation.score !== null && evaluation.score >= minGrade;

    checks.push({
      label: evaluation.name,
      passed,
      detail:
        evaluation.score === null
          ? `${evaluation.name}: sin calificar`
          : `${evaluation.name}: ${evaluation.score} (mínimo ${minGrade})`,
    });

    if (!passed) {
      reasons.push(
        evaluation.score === null
          ? `${evaluation.name} todavía no fue calificado/a.`
          : `${evaluation.name} no alcanzó la nota mínima requerida (${minGrade}).`
      );
    }
  }

  checks.push({
    label: "Trabajos prácticos",
    passed: input.assignmentsOk,
    detail: input.assignmentsOk ? "Cumple trabajos prácticos" : "No cumple trabajos prácticos",
  });
  if (!input.assignmentsOk) {
    reasons.push("No cumple con los trabajos prácticos requeridos.");
  }

  checks.push({
    label: "Asistencia",
    passed: input.attendance.meetsMinimum,
    detail: `${input.attendance.percentage}% de asistencia`,
  });
  if (!input.attendance.meetsMinimum) {
    reasons.push(`Asistencia inferior al mínimo requerido (${input.attendance.percentage}%).`);
  }

  return {
    promotes: reasons.length === 0,
    checks,
    reasons,
    average: calculateAverage(promotionEvaluations.map((e) => e.score)),
  };
}

function calculateAverage(scores: (number | null)[]): number | null {
  const valid = scores.filter((s): s is number => s !== null);
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  // No se redondea automáticamente salvo regla configurable explícita (sección 20).
  return Math.round((sum / valid.length) * 100) / 100;
}

export type EvaluationOutcome = "APROBADO" | "APROBADO_RECUPERATORIO" | "DESAPROBADO" | "PENDIENTE";

/**
 * Resuelve el resultado de aprobación de un par (evaluación original, recuperatorio),
 * conservando siempre ambas notas en el historial (sección 21).
 */
export function resolveEvaluationOutcome(
  original: { score: number | null },
  retake: { score: number | null } | null,
  passingGrade: number
): { outcome: EvaluationOutcome; detail: string } {
  if (original.score !== null && original.score >= passingGrade) {
    return { outcome: "APROBADO", detail: `Aprobado (${original.score})` };
  }
  if (retake?.score !== null && retake?.score !== undefined && retake.score >= passingGrade) {
    return {
      outcome: "APROBADO_RECUPERATORIO",
      detail: `Aprobado mediante recuperatorio (Parcial: ${original.score ?? "—"}, Recuperatorio: ${retake.score})`,
    };
  }
  if (retake?.score !== null && retake?.score !== undefined) {
    return {
      outcome: "DESAPROBADO",
      detail: `Desaprobado (Parcial: ${original.score ?? "—"}, Recuperatorio: ${retake.score})`,
    };
  }
  if (original.score !== null) {
    return { outcome: "DESAPROBADO", detail: `Desaprobado (${original.score})` };
  }
  return { outcome: "PENDIENTE", detail: "Pendiente" };
}
