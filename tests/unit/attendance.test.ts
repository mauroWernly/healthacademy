import { describe, expect, it } from "vitest";
import { calculateAttendance } from "@/server/domain/attendance";

function records(present: number, absent: number, justified: number) {
  return [
    ...Array(present).fill({ status: "PRESENTE" as const }),
    ...Array(absent).fill({ status: "AUSENTE" as const }),
    ...Array(justified).fill({ status: "AUSENTE_JUSTIFICADA" as const }),
  ];
}

describe("calculateAttendance", () => {
  it("exactamente 80% cumple el mínimo (sección 53 — límite)", () => {
    const summary = calculateAttendance(records(16, 4, 0), 80);
    expect(summary.percentage).toBe(80);
    expect(summary.meetsMinimum).toBe(true);
  });

  it("75% no cumple el mínimo (sección 53 — insuficiente)", () => {
    const summary = calculateAttendance(records(15, 5, 0), 80);
    expect(summary.percentage).toBe(75);
    expect(summary.meetsMinimum).toBe(false);
  });

  it("más de 80% cumple con margen", () => {
    const summary = calculateAttendance(records(18, 1, 1), 80);
    expect(summary.percentage).toBe(90);
    expect(summary.meetsMinimum).toBe(true);
  });

  it("el porcentaje se calcula sobre las clases efectivamente registradas, no un total fijo", () => {
    const summary = calculateAttendance(records(4, 1, 0), 80);
    expect(summary.totalClasses).toBe(5);
    expect(summary.percentage).toBe(80);
  });

  it("sin clases registradas no penaliza (100% informativo)", () => {
    const summary = calculateAttendance([], 80);
    expect(summary.percentage).toBe(100);
    expect(summary.meetsMinimum).toBe(true);
  });
});
