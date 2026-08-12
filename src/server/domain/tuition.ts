/**
 * Reglas de cuotas y morosidad (secciones 28-34). Cada cuota es una
 * obligación independiente: nunca hay pagos parciales ni un pago que cubra
 * varias cuotas — esa restricción se aplica en `payment.service.ts`, acá
 * solo se calcula estado/recargo/criticidad.
 */

export interface TuitionLike {
  amount: number;
  dueDate: Date;
  /** Fecha de pago confirmado, o null si sigue impaga. */
  paidAt: Date | null;
}

export interface TuitionRulesConfig {
  surchargeAmount: number;
  /** Día del mes en que la situación se vuelve "crítica" (posible suspensión) — sección 34. */
  criticalDay: number;
}

export type TuitionComputedStatus = "PAGADA" | "PENDIENTE" | "CON_RECARGO";

export interface TuitionComputedState {
  status: TuitionComputedStatus;
  surcharge: number;
  total: number;
  /** true si llegó al día crítico configurado sin pago (sección 34). */
  isCritical: boolean;
}

export function calculateTuitionStatus(
  tuition: TuitionLike,
  today: Date,
  config: TuitionRulesConfig
): TuitionComputedState {
  if (tuition.paidAt) {
    const paidLate = tuition.paidAt.getTime() > tuition.dueDate.getTime();
    const surcharge = paidLate ? config.surchargeAmount : 0;
    return { status: "PAGADA", surcharge, total: tuition.amount + surcharge, isCritical: false };
  }

  if (today.getTime() <= tuition.dueDate.getTime()) {
    return { status: "PENDIENTE", surcharge: 0, total: tuition.amount, isCritical: false };
  }

  const surcharge = config.surchargeAmount;
  const criticalDate = new Date(
    tuition.dueDate.getFullYear(),
    tuition.dueDate.getMonth(),
    config.criticalDay
  );
  const isCritical = today.getTime() >= criticalDate.getTime();

  return { status: "CON_RECARGO", surcharge, total: tuition.amount + surcharge, isCritical };
}

/**
 * El día crítico por sí solo NO implica suspensión automática (sección 34):
 * la institución decide vía `InstitutionConfig.autoSuspendOnCriticalDay`.
 */
export function shouldAutoSuspend(isCritical: boolean, autoSuspendOnCriticalDay: boolean): boolean {
  return isCritical && autoSuspendOnCriticalDay;
}

export class InvalidPaymentError extends Error {}

/** No se permiten pagos parciales (sección 29/35): el importe pagado debe ser exactamente el total adeudado. */
export function validatePaymentAmount(totalDue: number, amountPaid: number): void {
  if (Math.abs(amountPaid - totalDue) > 0.005) {
    throw new InvalidPaymentError(
      `El importe pagado ($${amountPaid}) debe coincidir exactamente con el total adeudado ($${totalDue}). No se permiten pagos parciales.`
    );
  }
}
