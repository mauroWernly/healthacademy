import { describe, expect, it } from "vitest";
import {
  calculateTuitionStatus,
  shouldAutoSuspend,
  validatePaymentAmount,
  InvalidPaymentError,
} from "@/server/domain/tuition";
import { calculateFinancialStatus } from "@/server/domain/financialStatus";

const config = { surchargeAmount: 5000, criticalDay: 20 };
const dueDate = new Date(2026, 7, 10); // 10 de agosto de 2026

describe("calculateTuitionStatus (secciones 29-30, 67)", () => {
  it("pago antes del día 10: sin recargo", () => {
    const result = calculateTuitionStatus(
      { amount: 50000, dueDate, paidAt: new Date(2026, 7, 5) },
      new Date(2026, 7, 5),
      config
    );
    expect(result.status).toBe("PAGADA");
    expect(result.surcharge).toBe(0);
    expect(result.total).toBe(50000);
  });

  it("pago después del día 10: aplica recargo fijo", () => {
    const result = calculateTuitionStatus(
      { amount: 50000, dueDate, paidAt: new Date(2026, 7, 15) },
      new Date(2026, 7, 15),
      config
    );
    expect(result.status).toBe("PAGADA");
    expect(result.surcharge).toBe(5000);
    expect(result.total).toBe(55000);
  });

  it("cuota vencida sin pagar antes del día crítico: CON_RECARGO, no crítica", () => {
    const result = calculateTuitionStatus(
      { amount: 50000, dueDate, paidAt: null },
      new Date(2026, 7, 15),
      config
    );
    expect(result.status).toBe("CON_RECARGO");
    expect(result.isCritical).toBe(false);
  });

  it("cuota impaga al llegar al día crítico (20): marca isCritical", () => {
    const result = calculateTuitionStatus(
      { amount: 50000, dueDate, paidAt: null },
      new Date(2026, 7, 20),
      config
    );
    expect(result.status).toBe("CON_RECARGO");
    expect(result.isCritical).toBe(true);
  });

  it("día crítico NO implica suspensión automática salvo que esté configurada", () => {
    expect(shouldAutoSuspend(true, false)).toBe(false);
    expect(shouldAutoSuspend(true, true)).toBe(true);
    expect(shouldAutoSuspend(false, true)).toBe(false);
  });
});

describe("validatePaymentAmount (sección 29/35 — sin pagos parciales)", () => {
  it("acepta el importe exacto", () => {
    expect(() => validatePaymentAmount(55000, 55000)).not.toThrow();
  });

  it("rechaza un pago parcial", () => {
    expect(() => validatePaymentAmount(55000, 30000)).toThrow(InvalidPaymentError);
  });

  it("rechaza un pago que excede el total (ej. intento de cubrir varias cuotas)", () => {
    expect(() => validatePaymentAmount(55000, 110000)).toThrow(InvalidPaymentError);
  });
});

describe("calculateFinancialStatus (sección 32, varias cuotas)", () => {
  it("varias cuotas pendientes acumuladas y ninguna crítica -> CON_RECARGO", () => {
    const today = new Date(2026, 7, 15);
    const tuitions = [
      { amount: 50000, dueDate: new Date(2026, 7, 1), paidAt: null },
      { amount: 50000, dueDate: new Date(2026, 7, 10), paidAt: null },
    ];
    const result = calculateFinancialStatus(tuitions, today, config, false);
    expect(result.status).toBe("CON_RECARGO");
    expect(result.totalDebt).toBe(110000);
  });

  it("alguna cuota alcanzó el día crítico -> MOROSA", () => {
    const today = new Date(2026, 7, 20);
    const tuitions = [{ amount: 50000, dueDate: new Date(2026, 7, 10), paidAt: null }];
    const result = calculateFinancialStatus(tuitions, today, config, false);
    expect(result.status).toBe("MOROSA");
  });

  it("suspensión activa domina sobre cualquier otro estado", () => {
    const today = new Date(2026, 7, 20);
    const tuitions = [{ amount: 50000, dueDate: new Date(2026, 7, 10), paidAt: null }];
    const result = calculateFinancialStatus(tuitions, today, config, true);
    expect(result.status).toBe("SUSPENDIDA");
  });

  it("sin cuotas impagas -> AL_DIA", () => {
    const today = new Date(2026, 7, 15);
    const tuitions = [{ amount: 50000, dueDate: new Date(2026, 7, 10), paidAt: new Date(2026, 7, 5) }];
    const result = calculateFinancialStatus(tuitions, today, config, false);
    expect(result.status).toBe("AL_DIA");
  });
});
