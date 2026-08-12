import * as React from "react";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-700/20",
  yellow: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-800 ring-red-700/20",
  blue: "bg-blue-50 text-blue-800 ring-blue-700/20",
  gray: "bg-stone-100 text-stone-700 ring-stone-500/20",
} as const;

export type BadgeTone = keyof typeof TONE_CLASSES;

export function Badge({ tone = "gray", className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONE_CLASSES[tone], className)}>
      {children}
    </span>
  );
}

// Nunca depender solo del color (sección 59): siempre acompañar con texto/ícono.
const FINANCIAL_STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  AL_DIA: { label: "Al día", tone: "green" },
  PENDIENTE: { label: "Pendiente", tone: "blue" },
  CON_RECARGO: { label: "Con recargo", tone: "yellow" },
  MOROSA: { label: "Morosa", tone: "red" },
  SUSPENDIDA: { label: "Suspendida", tone: "red" },
};

export function FinancialStatusBadge({ status }: { status: string }) {
  const meta = FINANCIAL_STATUS_LABEL[status] ?? { label: status, tone: "gray" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

const ACADEMIC_STATUS_LABEL: Record<string, { label: string; tone: BadgeTone }> = {
  PREINSCRIPTA: { label: "Preinscripta", tone: "gray" },
  INSCRIPTA: { label: "Inscripta", tone: "blue" },
  ACTIVA: { label: "Activa", tone: "green" },
  REGULAR: { label: "Regular", tone: "green" },
  CONDICIONAL: { label: "Condicional", tone: "yellow" },
  EGRESADA: { label: "Egresada", tone: "blue" },
  SUSPENDIDA: { label: "Suspendida", tone: "red" },
  BAJA: { label: "Baja", tone: "gray" },
  INACTIVA: { label: "Inactiva", tone: "gray" },
};

export function AcademicStatusBadge({ status }: { status: string }) {
  const meta = ACADEMIC_STATUS_LABEL[status] ?? { label: status, tone: "gray" as const };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}

export function DocumentationBadge({ complete }: { complete: boolean }) {
  return complete ? <Badge tone="green">Completa</Badge> : <Badge tone="yellow">Incompleta</Badge>;
}

export function AttendanceBadge({ percentage, minimum }: { percentage: number; minimum: number }) {
  const meets = percentage >= minimum;
  return <Badge tone={meets ? "green" : "red"}>{percentage.toFixed(0)}% {meets ? "— Cumple" : "— No cumple"}</Badge>;
}
