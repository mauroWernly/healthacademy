import { describe, expect, it } from "vitest";
import { evaluatePromotion, resolveEvaluationOutcome, type PromotionInput } from "@/server/domain/promotion";

function twoPartials(p1: number | null, p2: number | null): PromotionInput["evaluations"] {
  return [
    {
      templateId: "p1",
      name: "Parcial 1",
      isRequired: true,
      affectsPromotion: true,
      retakeOfTemplateId: null,
      minGradeForPromotion: null,
      score: p1,
    },
    {
      templateId: "p2",
      name: "Parcial 2",
      isRequired: true,
      affectsPromotion: true,
      retakeOfTemplateId: null,
      minGradeForPromotion: null,
      score: p2,
    },
  ];
}

const base = { defaultMinGradeForPromotion: 8 };

describe("evaluatePromotion (sección 54)", () => {
  it("caso promoción: todo aprobado -> PROMOCIONA", () => {
    const result = evaluatePromotion({
      ...base,
      evaluations: twoPartials(9, 8),
      assignmentsOk: true,
      attendance: { percentage: 90, meetsMinimum: true },
    });
    expect(result.promotes).toBe(true);
    expect(result.average).toBe(8.5);
    expect(result.reasons).toHaveLength(0);
  });

  it("caso parcial insuficiente: Parcial 2 < 8 -> NO PROMOCIONA aunque el promedio sea 8", () => {
    const result = evaluatePromotion({
      ...base,
      evaluations: twoPartials(9, 7),
      assignmentsOk: true,
      attendance: { percentage: 91, meetsMinimum: true },
    });
    expect(result.promotes).toBe(false);
    expect(result.average).toBe(8);
    expect(result.reasons).toContain("Parcial 2 no alcanzó la nota mínima requerida (8).");
  });

  it("caso asistencia insuficiente: notas 9 y 9 pero 76% de asistencia -> NO PROMOCIONA", () => {
    const result = evaluatePromotion({
      ...base,
      evaluations: twoPartials(9, 9),
      assignmentsOk: true,
      attendance: { percentage: 76, meetsMinimum: false },
    });
    expect(result.promotes).toBe(false);
    expect(result.reasons.some((r) => r.includes("Asistencia"))).toBe(true);
  });

  it("caso TP insuficiente: notas altas y asistencia ok, pero TP=No -> NO PROMOCIONA", () => {
    const result = evaluatePromotion({
      ...base,
      evaluations: twoPartials(9, 9),
      assignmentsOk: false,
      attendance: { percentage: 92, meetsMinimum: true },
    });
    expect(result.promotes).toBe(false);
    expect(result.reasons).toContain("No cumple con los trabajos prácticos requeridos.");
  });
});

describe("resolveEvaluationOutcome (recuperatorio, sección 21)", () => {
  it("aprobado directo sin necesitar recuperatorio", () => {
    const outcome = resolveEvaluationOutcome({ score: 8 }, null, 4);
    expect(outcome.outcome).toBe("APROBADO");
  });

  it("parcial insuficiente + recuperatorio aprobado -> aprobado mediante recuperatorio, conserva ambas notas", () => {
    const outcome = resolveEvaluationOutcome({ score: 5 }, { score: 8 }, 6);
    expect(outcome.outcome).toBe("APROBADO_RECUPERATORIO");
    expect(outcome.detail).toContain("Parcial: 5");
    expect(outcome.detail).toContain("Recuperatorio: 8");
  });

  it("parcial y recuperatorio insuficientes -> desaprobado", () => {
    const outcome = resolveEvaluationOutcome({ score: 3 }, { score: 4 }, 6);
    expect(outcome.outcome).toBe("DESAPROBADO");
  });
});
