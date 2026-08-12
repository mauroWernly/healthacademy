import { calculateTuitionStatus, type TuitionLike, type TuitionRulesConfig } from "./tuition";

/**
 * Estado financiero agregado de una alumna (sección 32). Se deriva SIEMPRE
 * de sus cuotas — nunca se persiste como campo editable, para que no quede
 * desactualizado.
 *
 * Prioridad (de mayor a menor severidad):
 *  1. SUSPENDIDA     — tiene una suspensión activa (dato externo a las cuotas).
 *  2. MOROSA         — alguna cuota llegó al día crítico sin pago.
 *  3. CON_RECARGO    — alguna cuota está vencida y con recargo (incluye lo que
 *                       coloquialmente se llama "atrasada": el recargo se
 *                       aplica inmediatamente al vencer, sección 29, por lo
 *                       que no existe una ventana "vencida sin recargo").
 *  4. PENDIENTE      — alguna cuota está impaga pero todavía no vencida.
 *  5. AL_DIA         — no hay cuotas impagas.
 */
export type FinancialStatus = "AL_DIA" | "PENDIENTE" | "CON_RECARGO" | "MOROSA" | "SUSPENDIDA";

export interface FinancialStatusResult {
  status: FinancialStatus;
  totalDebt: number;
  pendingCount: number;
  overdueCount: number;
  criticalCount: number;
}

export function calculateFinancialStatus(
  tuitions: TuitionLike[],
  today: Date,
  config: TuitionRulesConfig,
  hasActiveSuspension: boolean
): FinancialStatusResult {
  let totalDebt = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let criticalCount = 0;

  for (const tuition of tuitions) {
    const computed = calculateTuitionStatus(tuition, today, config);
    if (computed.status === "PAGADA") continue;

    totalDebt += computed.total;
    if (computed.status === "PENDIENTE") pendingCount++;
    if (computed.status === "CON_RECARGO") overdueCount++;
    if (computed.isCritical) criticalCount++;
  }

  let status: FinancialStatus;
  if (hasActiveSuspension) {
    status = "SUSPENDIDA";
  } else if (criticalCount > 0) {
    status = "MOROSA";
  } else if (overdueCount > 0) {
    status = "CON_RECARGO";
  } else if (pendingCount > 0) {
    status = "PENDIENTE";
  } else {
    status = "AL_DIA";
  }

  return { status, totalDebt, pendingCount, overdueCount, criticalCount };
}
