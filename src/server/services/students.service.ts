import { prisma } from "@/server/db";
import { calculateFinancialStatus, type FinancialStatus } from "@/server/domain/financialStatus";
import { calculateAttendance } from "@/server/domain/attendance";
import { evaluatePromotion } from "@/server/domain/promotion";
import { getInstitutionConfig } from "./config.service";

export interface StudentListFilters {
  q?: string;
  academicStatus?: string;
  financialStatus?: FinancialStatus;
  documentacion?: "incompleta";
  asistencia?: "baja";
  /** "final" = comisión de la cohorte en etapa final, próxima a egresar (sección 4). */
  etapa?: "final";
  page?: number;
  pageSize?: number;
}

export async function listStudents(institutionId: string, filters: StudentListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = filters.pageSize ?? 25;
  const config = await getInstitutionConfig(institutionId);
  const today = new Date();

  const where = {
    institutionId,
    deletedAt: null,
    ...(filters.academicStatus ? { academicStatus: filters.academicStatus as never } : {}),
    ...(filters.etapa === "final" ? { commission: { cohort: { name: "Cohorte 2024" } } } : {}),
    ...(filters.q
      ? {
          OR: [
            { firstName: { contains: filters.q, mode: "insensitive" as const } },
            { lastName: { contains: filters.q, mode: "insensitive" as const } },
            { dni: { contains: filters.q } },
            { fileNumber: { contains: filters.q } },
            { email: { contains: filters.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, students] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      include: { career: true, cohort: true, commission: true },
    }),
  ]);

  const studentIds = students.map((s) => s.id);
  const [tuitions, suspensions, documents, attendanceRows] = await Promise.all([
    prisma.tuition.findMany({ where: { studentId: { in: studentIds }, deletedAt: null }, include: { payment: true } }),
    prisma.suspension.findMany({ where: { studentId: { in: studentIds }, liftedAt: null } }),
    prisma.document.findMany({ where: { studentId: { in: studentIds }, deletedAt: null } }),
    prisma.attendance.findMany({
      where: { studentId: { in: studentIds }, deletedAt: null },
      select: { studentId: true, status: true },
    }),
  ]);

  const activeSuspensionIds = new Set(suspensions.map((s) => s.studentId));
  const tuitionsByStudent = new Map<string, typeof tuitions>();
  for (const t of tuitions) {
    const arr = tuitionsByStudent.get(t.studentId) ?? [];
    arr.push(t);
    tuitionsByStudent.set(t.studentId, arr);
  }
  const documentsByStudent = new Map<string, typeof documents>();
  for (const d of documents) {
    const arr = documentsByStudent.get(d.studentId) ?? [];
    arr.push(d);
    documentsByStudent.set(d.studentId, arr);
  }
  const attendanceByStudent = new Map<string, typeof attendanceRows>();
  for (const a of attendanceRows) {
    const arr = attendanceByStudent.get(a.studentId) ?? [];
    arr.push(a);
    attendanceByStudent.set(a.studentId, arr);
  }

  let rows = students.map((s) => {
    const studentTuitions = (tuitionsByStudent.get(s.id) ?? []).map((t) => ({
      amount: t.amount.toNumber(),
      dueDate: t.dueDate,
      paidAt: t.payment && t.payment.status === "CONFIRMADO" ? t.payment.paidAt : null,
    }));
    const financial = calculateFinancialStatus(studentTuitions, today, config, activeSuspensionIds.has(s.id));

    const studentDocuments = documentsByStudent.get(s.id) ?? [];
    const documentationComplete = studentDocuments.length > 0 && studentDocuments.every((d) => d.status === "VALIDADO");

    const attendance = calculateAttendance(attendanceByStudent.get(s.id) ?? [], config.minAttendancePercent);

    return {
      id: s.id,
      fileNumber: s.fileNumber,
      firstName: s.firstName,
      lastName: s.lastName,
      dni: s.dni,
      careerName: s.career?.name ?? null,
      cohortName: s.cohort?.name ?? null,
      commissionName: s.commission?.name ?? null,
      academicStatus: s.academicStatus,
      financialStatus: financial.status,
      debt: financial.totalDebt,
      documentationComplete,
      attendancePercentage: attendance.percentage,
    };
  });

  if (filters.financialStatus) {
    rows = rows.filter((r) => r.financialStatus === filters.financialStatus);
  }
  if (filters.documentacion === "incompleta") {
    rows = rows.filter((r) => !r.documentationComplete);
  }
  if (filters.asistencia === "baja") {
    rows = rows.filter((r) => r.attendancePercentage < config.minAttendancePercent);
  }

  const filteredTotal = rows.length;
  const paged = rows.slice((page - 1) * pageSize, page * pageSize);

  return { rows: paged, total: filters.financialStatus || filters.documentacion || filters.asistencia ? filteredTotal : total, page, pageSize };
}

export async function getStudentSummary(studentId: string) {
  const student = await prisma.student.findUniqueOrThrow({
    where: { id: studentId },
    include: {
      career: true,
      cohort: true,
      commission: true,
      documents: { include: { documentType: true } },
      suspensions: { orderBy: { startDate: "desc" } },
    },
  });

  const config = await getInstitutionConfig(student.institutionId);
  const today = new Date();

  const [tuitions, enrollments, attendanceRows, gradeRows, assignmentRows] = await Promise.all([
    prisma.tuition.findMany({ where: { studentId, deletedAt: null }, include: { payment: { include: { method: true } } }, orderBy: { dueDate: "asc" } }),
    prisma.subjectEnrollment.findMany({
      where: { studentId },
      include: { subjectOffering: { include: { subject: true } } },
    }),
    prisma.attendance.findMany({
      where: { studentId, deletedAt: null },
      include: { classSession: { select: { subjectOfferingId: true } } },
    }),
    prisma.grade.findMany({
      where: { studentId, deletedAt: null },
      include: { evaluation: { include: { template: true, subjectOffering: true } } },
    }),
    prisma.assignment.findMany({ where: { studentId }, include: { template: true } }),
  ]);

  const tuitionLikes = tuitions.map((t) => ({
    amount: t.amount.toNumber(),
    dueDate: t.dueDate,
    paidAt: t.payment && t.payment.status === "CONFIRMADO" ? t.payment.paidAt : null,
  }));
  const activeSuspension = student.suspensions.find((s) => !s.liftedAt) ?? null;
  const financial = calculateFinancialStatus(tuitionLikes, today, config, !!activeSuspension);

  const documentationComplete = student.documents.length > 0 && student.documents.every((d) => d.status === "VALIDADO");
  const missingDocuments = student.documents.filter((d) => d.status !== "VALIDADO");

  const overallAttendance = calculateAttendance(attendanceRows.map((a) => ({ status: a.status })), config.minAttendancePercent);

  const attendanceByOffering = new Map<string, Array<{ status: "PRESENTE" | "AUSENTE" | "AUSENTE_JUSTIFICADA" }>>();
  for (const a of attendanceRows) {
    const arr = attendanceByOffering.get(a.classSession.subjectOfferingId) ?? [];
    arr.push({ status: a.status });
    attendanceByOffering.set(a.classSession.subjectOfferingId, arr);
  }

  const currentSubjectRows = enrollments
    .filter((e) => e.status === "CURSANDO")
    .map((e) => {
      const offeringId = e.subjectOfferingId;
      const subject = e.subjectOffering.subject;
      const minAttendance = subject.minAttendancePercent ? subject.minAttendancePercent.toNumber() : config.minAttendancePercent;
      const attendance = calculateAttendance(attendanceByOffering.get(offeringId) ?? [], minAttendance);

      const evaluations = gradeRows
        .filter((g) => g.evaluation.subjectOfferingId === offeringId)
        .map((g) => ({
          templateId: g.evaluation.templateId,
          name: g.evaluation.template.name,
          isRequired: g.evaluation.template.isRequired,
          affectsPromotion: g.evaluation.template.affectsPromotion,
          retakeOfTemplateId: g.evaluation.template.retakeOfId,
          minGradeForPromotion: g.evaluation.template.minGradeForPromotion ? g.evaluation.template.minGradeForPromotion.toNumber() : null,
          score: g.score !== null ? g.score.toNumber() : null,
        }));

      const assignmentsForOffering = assignmentRows.filter((a) => a.template.subjectOfferingId === offeringId);
      const assignmentsOk = assignmentsForOffering.length > 0 && assignmentsForOffering.every((a) => a.status === "APROBADO");

      const promotion = evaluatePromotion({
        evaluations,
        assignmentsOk,
        attendance: { percentage: attendance.percentage, meetsMinimum: attendance.meetsMinimum },
        defaultMinGradeForPromotion: config.minPartialGradeForPromotion,
      });

      return {
        subjectOfferingId: offeringId,
        subjectName: subject.name,
        average: promotion.average,
        attendancePercentage: attendance.percentage,
        assignmentsOk,
        promotes: promotion.promotes,
        reasons: promotion.reasons,
        checks: promotion.checks,
      };
    });

  const approvedCount = enrollments.filter((e) => e.status === "APROBADA" || e.status === "PROMOCIONADA").length;
  const inProgressCount = enrollments.filter((e) => e.status === "CURSANDO").length;
  const pendingCount = enrollments.filter((e) => e.status === "DESAPROBADA" || e.status === "LIBRE").length;

  return {
    student,
    financial,
    documentationComplete,
    missingDocuments,
    overallAttendance,
    currentSubjectRows,
    approvedCount,
    inProgressCount,
    pendingCount,
    tuitions,
    activeSuspension,
  };
}

export type StudentSummary = Awaited<ReturnType<typeof getStudentSummary>>;
