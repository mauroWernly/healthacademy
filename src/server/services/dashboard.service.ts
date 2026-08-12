import { prisma } from "@/server/db";
import { calculateTuitionStatus } from "@/server/domain/tuition";
import { getInstitutionConfig } from "./config.service";

export interface DashboardIndicator {
  label: string;
  value: number;
  href: string;
}

export interface DashboardAlert {
  level: "red" | "orange" | "yellow";
  message: string;
  href: string;
}

export interface DashboardData {
  indicators: DashboardIndicator[];
  alerts: DashboardAlert[];
}

/**
 * NOTA de escalabilidad: para ~300 alumnas es razonable calcular asistencia
 * y estado de cuotas en memoria en cada carga del dashboard. Al crecer a
 * miles de alumnas esto debería moverse a una vista materializada /ejob
 * agregado — el cálculo en sí (`calculateTuitionStatus`/`calculateAttendance`)
 * no cambia, solo dónde se ejecuta.
 */
export async function getDashboardData(institutionId: string): Promise<DashboardData> {
  const today = new Date();
  const config = await getInstitutionConfig(institutionId);

  const [activeStudents, suspendedStudents, incompleteFiles, tuitions, attendanceRows, graduatingStudents, newStudents] =
    await Promise.all([
      prisma.student.count({ where: { institutionId, deletedAt: null, academicStatus: { in: ["ACTIVA", "REGULAR"] } } }),
      prisma.student.count({ where: { institutionId, deletedAt: null, academicStatus: "SUSPENDIDA" } }),
      prisma.student.count({
        where: {
          institutionId,
          deletedAt: null,
          documents: { some: { status: { in: ["PENDIENTE", "RECHAZADO"] }, deletedAt: null } },
        },
      }),
      prisma.tuition.findMany({
        where: { student: { institutionId, deletedAt: null }, deletedAt: null },
        select: {
          studentId: true,
          amount: true,
          dueDate: true,
          payment: { select: { paidAt: true, status: true } },
        },
      }),
      prisma.attendance.findMany({
        where: { student: { institutionId, deletedAt: null }, deletedAt: null },
        select: { studentId: true, status: true, classSession: { select: { subjectOfferingId: true } } },
      }),
      prisma.student.count({
        where: {
          institutionId,
          deletedAt: null,
          academicStatus: { in: ["ACTIVA", "REGULAR"] },
          commission: { cohort: { name: "Cohorte 2024" } },
        },
      }),
      prisma.student.count({
        where: {
          institutionId,
          deletedAt: null,
          createdAt: { gte: new Date(today.getFullYear(), today.getMonth() - 1, today.getDate()) },
        },
      }),
    ]);

  let pendingTuitions = 0;
  let overdueTuitions = 0;
  const criticalStudentIds = new Set<string>();

  for (const t of tuitions) {
    const computed = calculateTuitionStatus(
      {
        amount: t.amount.toNumber(),
        dueDate: t.dueDate,
        paidAt: t.payment && t.payment.status === "CONFIRMADO" ? t.payment.paidAt : null,
      },
      today,
      config
    );
    if (computed.status === "PENDIENTE") pendingTuitions++;
    if (computed.status === "CON_RECARGO") overdueTuitions++;
    if (computed.isCritical) criticalStudentIds.add(t.studentId);
  }

  const bySubjectOffering = new Map<string, { present: number; total: number }>();
  for (const a of attendanceRows) {
    const key = `${a.studentId}:${a.classSession.subjectOfferingId}`;
    const entry = bySubjectOffering.get(key) ?? { present: 0, total: 0 };
    entry.total += 1;
    if (a.status === "PRESENTE") entry.present += 1;
    bySubjectOffering.set(key, entry);
  }
  const lowAttendanceStudentIds = new Set<string>();
  for (const [key, { present, total }] of bySubjectOffering) {
    const percentage = total === 0 ? 100 : (present / total) * 100;
    if (percentage < config.minAttendancePercent) {
      lowAttendanceStudentIds.add(key.split(":")[0]);
    }
  }

  const indicators: DashboardIndicator[] = [
    { label: "Alumnas activas", value: activeStudents, href: "/alumnas?estado=ACTIVA" },
    { label: "Alumnas nuevas (últimos 30 días)", value: newStudents, href: "/alumnas?orden=recientes" },
    { label: "Legajos incompletos", value: incompleteFiles, href: "/alumnas?documentacion=incompleta" },
    { label: "Cuotas pendientes", value: pendingTuitions, href: "/alumnas?financiero=PENDIENTE" },
    { label: "Cuotas con recargo / vencidas", value: overdueTuitions, href: "/alumnas?financiero=CON_RECARGO" },
    { label: "Sin pago al día 20 (crítico)", value: criticalStudentIds.size, href: "/alumnas?financiero=MOROSA" },
    { label: "Alumnas suspendidas", value: suspendedStudents, href: "/alumnas?estado=SUSPENDIDA" },
    { label: "Asistencia inferior al mínimo", value: lowAttendanceStudentIds.size, href: "/alumnas?asistencia=baja" },
    { label: "Próximas a egresar", value: graduatingStudents, href: "/alumnas?etapa=final" },
  ];

  const alerts: DashboardAlert[] = [];
  if (overdueTuitions > 0) {
    alerts.push({ level: "red", message: `${overdueTuitions} cuotas vencidas con recargo.`, href: "/alumnas?financiero=CON_RECARGO" });
  }
  if (criticalStudentIds.size > 0) {
    alerts.push({ level: "red", message: `${criticalStudentIds.size} alumnas sin pago al llegar al día crítico.`, href: "/alumnas?financiero=MOROSA" });
  }
  if (suspendedStudents > 0) {
    alerts.push({ level: "red", message: `${suspendedStudents} alumnas están suspendidas.`, href: "/alumnas?estado=SUSPENDIDA" });
  }
  if (lowAttendanceStudentIds.size > 0) {
    alerts.push({
      level: "yellow",
      message: `${lowAttendanceStudentIds.size} alumnas tienen asistencia inferior al ${config.minAttendancePercent}% en alguna materia.`,
      href: "/alumnas?asistencia=baja",
    });
  }
  if (incompleteFiles > 0) {
    alerts.push({ level: "yellow", message: `${incompleteFiles} legajos tienen documentación incompleta.`, href: "/alumnas?documentacion=incompleta" });
  }
  if (pendingTuitions > 0) {
    alerts.push({ level: "yellow", message: `${pendingTuitions} cuotas pendientes de pago.`, href: "/alumnas?financiero=PENDIENTE" });
  }

  return { indicators, alerts };
}
