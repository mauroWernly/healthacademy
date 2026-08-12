import { prisma } from "../../src/server/db";
import { faker, nextDni, nextFileNumber, emailFor, fakePhone, dueDate, daysBefore } from "./lib";
import type { AcademicStructure } from "./academic-structure";

const FIRST_NAMES_FEMALE = [
  "María", "Ana", "Lucía", "Camila", "Valentina", "Sofía", "Martina", "Julieta", "Florencia", "Micaela",
  "Agustina", "Antonella", "Rocío", "Milagros", "Catalina", "Bianca", "Delfina", "Guadalupe", "Ludmila", "Paula",
  "Victoria", "Carolina", "Daniela", "Emilia", "Josefina", "Luciana", "Malena", "Noelia", "Priscila", "Renata",
];
const LAST_NAMES = [
  "González", "Rodríguez", "Fernández", "López", "Díaz", "Martínez", "Pérez", "Gómez", "Sánchez", "Romero",
  "Sosa", "Torres", "Álvarez", "Ruiz", "Ramírez", "Flores", "Acosta", "Benítez", "Medina", "Herrera",
  "Aguirre", "Vega", "Molina", "Ojeda", "Silva", "Núñez", "Cabrera", "Rojas", "Paz", "Ibáñez",
];

const DOCUMENT_TYPE_KEYS = [
  "dni",
  "foto_carnet",
  "partida_nacimiento",
  "titulo_secundario",
  "analitico_secundario",
  "certificado_buena_conducta",
  "carnet_vacunacion",
  "datos_personales_completos",
];

const TODAY = new Date(2026, 7, 12); // sección "currentDate": 2026-08-12

type Ids = {
  institutionId: string;
  documentTypeIdByKey: Record<string, string>;
  transferenciaId: string;
  efectivoId: string;
  secretariaUserId: string;
  coordinadorUserId: string;
};

type PaymentProfile = "al_dia" | "pendiente" | "atrasada" | "morosa" | "suspendida" | "egresada";
type AttendanceProfile = "high" | "borderline" | "low";

interface StudentCreationOptions {
  academicStatus: "ACTIVA" | "REGULAR" | "CONDICIONAL" | "EGRESADA" | "SUSPENDIDA" | "BAJA";
  paymentProfile: PaymentProfile;
  attendanceProfile: AttendanceProfile;
  documentationComplete: boolean;
  stage: "year1" | "year2" | "final";
  /** Overrides puntuales para materializar los casos de demo explícitos de la sección 51. */
  overrides?: {
    fileNumber?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    forcedGrades?: { partial1: number; partial2: number; retake?: number };
    forcedAssignmentsOk?: boolean;
    forcedAttendancePercent?: number;
  };
}

// ── Cachés compartidas entre alumnas (las clases y evaluaciones son por dictado, no por alumna) ──
const classSessionCache = new Map<string, string[]>();
const evaluationCache = new Map<string, Record<string, string>>(); // offeringId -> templateId -> evaluationId
const assignmentTemplateCache = new Map<string, string>(); // offeringId -> templateId

async function ensureClassSessions(offeringId: string): Promise<string[]> {
  const cached = classSessionCache.get(offeringId);
  if (cached) return cached;

  const sessionCount = 8;
  const sessions = await Promise.all(
    Array.from({ length: sessionCount }, (_, i) =>
      prisma.classSession.create({
        data: { subjectOfferingId: offeringId, date: daysBefore(TODAY, (sessionCount - i) * 7) },
      })
    )
  );
  const ids = sessions.map((s) => s.id);
  classSessionCache.set(offeringId, ids);
  return ids;
}

async function ensureEvaluations(offeringId: string): Promise<Record<string, string>> {
  const cached = evaluationCache.get(offeringId);
  if (cached) return cached;

  const offering = await prisma.subjectOffering.findUniqueOrThrow({
    where: { id: offeringId },
    include: { subject: { include: { evaluationTemplates: true } } },
  });

  const map: Record<string, string> = {};
  for (const template of offering.subject.evaluationTemplates) {
    const evaluation = await prisma.evaluation.create({
      data: { subjectOfferingId: offeringId, templateId: template.id, date: daysBefore(TODAY, 14) },
    });
    map[template.name] = evaluation.id;
    map[`__template__${template.name}`] = template.id;
  }
  evaluationCache.set(offeringId, map);
  return map;
}

async function ensureAssignmentTemplate(offeringId: string): Promise<string> {
  const cached = assignmentTemplateCache.get(offeringId);
  if (cached) return cached;
  const template = await prisma.assignmentTemplate.findFirstOrThrow({ where: { subjectOfferingId: offeringId } });
  assignmentTemplateCache.set(offeringId, template.id);
  return template.id;
}

function attendanceStatusesFor(profile: AttendanceProfile, forcedPercent: number | undefined, totalSessions: number) {
  const targetPercent = forcedPercent ?? (profile === "high" ? faker.number.int({ min: 85, max: 98 }) : profile === "borderline" ? faker.number.int({ min: 78, max: 84 }) : faker.number.int({ min: 60, max: 76 }));
  const presentCount = Math.round((targetPercent / 100) * totalSessions);
  const statuses: Array<"PRESENTE" | "AUSENTE" | "AUSENTE_JUSTIFICADA"> = [];
  for (let i = 0; i < totalSessions; i++) {
    if (i < presentCount) statuses.push("PRESENTE");
    else statuses.push(i % 3 === 0 ? "AUSENTE_JUSTIFICADA" : "AUSENTE");
  }
  return statuses;
}

function gradeFor(profile: AttendanceProfile, forced?: number) {
  if (forced !== undefined) return forced;
  if (profile === "high") return faker.number.int({ min: 7, max: 10 });
  if (profile === "borderline") return faker.number.int({ min: 6, max: 8 });
  return faker.number.int({ min: 4, max: 7 });
}

let studentSeq = 0;

export async function createStudent(
  ids: Ids,
  structure: AcademicStructure,
  options: StudentCreationOptions
) {
  studentSeq += 1;
  const firstName = options.overrides?.firstName ?? faker.helpers.arrayElement(FIRST_NAMES_FEMALE);
  const lastName = options.overrides?.lastName ?? faker.helpers.arrayElement(LAST_NAMES);
  const fileNumber = options.overrides?.fileNumber ?? nextFileNumber();
  const email = options.overrides?.email ?? emailFor(`${firstName}${studentSeq}`, lastName);

  const { cohort, commission, offerings, priorOfferings } = pickCohortAndCommission(structure, options.stage);

  const student = await prisma.student.create({
    data: {
      institutionId: ids.institutionId,
      fileNumber,
      firstName,
      lastName,
      dni: nextDni(),
      birthDate: faker.date.birthdate({ min: 18, max: 35, mode: "age" }),
      birthPlace: faker.location.city(),
      nationality: "Argentina",
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      province: faker.helpers.arrayElement(["Buenos Aires", "CABA", "Córdoba", "Santa Fe", "Mendoza"]),
      phone: fakePhone(),
      email,
      emergencyContactName: `${faker.helpers.arrayElement(FIRST_NAMES_FEMALE)} ${faker.helpers.arrayElement(LAST_NAMES)}`,
      emergencyContactPhone: fakePhone(),
      careerId: structure.career.id,
      cohortId: cohort.id,
      commissionId: commission.id,
      academicStatus: options.academicStatus,
    },
  });

  await prisma.enrollment.create({ data: { studentId: student.id, studyPlanId: structure.studyPlan.id } });

  await createDocuments(student.id, ids, options.documentationComplete);
  await createTuitions(student.id, ids, options.paymentProfile);

  if (options.academicStatus === "SUSPENDIDA") {
    await prisma.suspension.create({
      data: {
        studentId: student.id,
        reason: "Falta de pago sostenida — cuota impaga más allá del día crítico institucional.",
        startDate: daysBefore(TODAY, 10),
        createdById: ids.secretariaUserId,
      },
    });
  }

  if (options.academicStatus === "BAJA") {
    // Baja: se enrola en la cursada actual pero se marca LIBRE, sin simular asistencia/notas completas.
    await prisma.subjectEnrollment.createMany({
      data: offerings.map((o) => ({ studentId: student.id, subjectOfferingId: o.id, status: "LIBRE" as const })),
      skipDuplicates: true,
    });
    await prisma.subjectEnrollment.createMany({
      data: priorOfferings.map((o) => ({ studentId: student.id, subjectOfferingId: o.id, status: "APROBADA" as const })),
      skipDuplicates: true,
    });
    return student;
  }

  // Materias de años previos: aprobadas/promocionadas en bloque (sin recrear el detalle histórico).
  if (priorOfferings.length > 0) {
    await prisma.subjectEnrollment.createMany({
      data: priorOfferings.map((o) => ({
        studentId: student.id,
        subjectOfferingId: o.id,
        status: faker.helpers.weightedArrayElement([
          { value: "APROBADA" as const, weight: 7 },
          { value: "PROMOCIONADA" as const, weight: 3 },
        ]),
      })),
      skipDuplicates: true,
    });
  }

  // Materias en curso: simulación completa (asistencia + notas + TP).
  await simulateCurrentCoursework(student.id, ids, offerings, options);

  if (options.academicStatus === "EGRESADA") {
    await prisma.internship.create({
      data: {
        studentId: student.id,
        place: `Centro de Estética ${faker.company.name()}`,
        tutor: faker.person.fullName(),
        startDate: daysBefore(TODAY, 200),
        endDate: daysBefore(TODAY, 60),
        requiredHours: 120,
        completedHours: 120,
        evaluation: "Excelente desempeño, cumple con todos los protocolos.",
        status: "APROBADA",
      },
    });
    await prisma.thesis.create({
      data: {
        studentId: student.id,
        title: `Protocolos integrales de tratamiento facial y corporal — caso ${fileNumber}`,
        tutor: faker.person.fullName(),
        date: daysBefore(TODAY, 45),
        status: "APROBADA",
        grade: faker.number.int({ min: 8, max: 10 }),
      },
    });
  } else if (options.stage === "final") {
    await prisma.internship.create({
      data: {
        studentId: student.id,
        place: `Centro de Estética ${faker.company.name()}`,
        tutor: faker.person.fullName(),
        startDate: daysBefore(TODAY, 90),
        requiredHours: 120,
        completedHours: faker.number.int({ min: 40, max: 100 }),
        status: "EN_CURSO",
      },
    });
    await prisma.thesis.create({
      data: { studentId: student.id, status: "EN_PREPARACION" },
    });
  }

  return student;
}

/**
 * Para historial de años previos usamos SIEMPRE la primera comisión de la
 * cohorte correspondiente como referencia (no importa cuál cursó realmente
 * en ese entonces): da exactamente un dictado por materia sin duplicar por
 * comisión A/B, que es lo único que necesitamos para poblar "materias
 * aprobadas".
 */
function pickCohortAndCommission(structure: AcademicStructure, stage: "year1" | "year2" | "final") {
  const repYear1Commission = structure.commissionsCohort2026[0];
  const repYear2Commission = structure.commissionsCohort2025[0];

  if (stage === "final") {
    const commission = faker.helpers.arrayElement(structure.commissionsCohort2024);
    const offerings = structure.offeringsFinal.filter((o) => o.commissionId === commission.id);
    const priorOfferings = [
      ...structure.offeringsYear1.filter((o) => o.commissionId === repYear1Commission.id),
      ...structure.offeringsYear2.filter((o) => o.commissionId === repYear2Commission.id),
    ];
    return { cohort: structure.cohort2024, commission, offerings, priorOfferings };
  }
  if (stage === "year2") {
    const commission = faker.helpers.arrayElement(structure.commissionsCohort2025);
    const offerings = structure.offeringsYear2.filter((o) => o.commissionId === commission.id);
    const priorOfferings = structure.offeringsYear1.filter((o) => o.commissionId === repYear1Commission.id);
    return { cohort: structure.cohort2025, commission, offerings, priorOfferings };
  }
  const commission = faker.helpers.arrayElement(structure.commissionsCohort2026);
  const offerings = structure.offeringsYear1.filter((o) => o.commissionId === commission.id);
  return { cohort: structure.cohort2026, commission, offerings, priorOfferings: [] as typeof offerings };
}

async function createDocuments(studentId: string, ids: Ids, complete: boolean) {
  const now = TODAY;
  const data = DOCUMENT_TYPE_KEYS.map((key, index) => {
    const documentTypeId = ids.documentTypeIdByKey[key];
    const incomplete = !complete && index < 2; // dos documentos pendientes
    const rejected = !complete && index === 2; // un documento rechazado
    if (incomplete) {
      return { studentId, documentTypeId, status: "PENDIENTE" as const };
    }
    if (rejected) {
      return {
        studentId,
        documentTypeId,
        status: "RECHAZADO" as const,
        storageKey: `local/students/pending/${studentId}/${key}.pdf`,
        storageProvider: "local",
        uploadedAt: daysBefore(now, 20),
        observations: "El archivo no es legible, se solicitó reenvío.",
      };
    }
    return {
      studentId,
      documentTypeId,
      status: "VALIDADO" as const,
      storageKey: `local/students/${studentId}/${key}.pdf`,
      storageProvider: "local",
      uploadedAt: daysBefore(now, 60),
      validatedAt: daysBefore(now, 55),
      validatedById: ids.secretariaUserId,
    };
  });
  await prisma.document.createMany({ data, skipDuplicates: true });
}

const TUITION_PERIODS: Array<{ period: string; month: number }> = [
  { period: "2026-05", month: 5 },
  { period: "2026-06", month: 6 },
  { period: "2026-07", month: 7 },
  { period: "2026-08", month: 8 },
];

async function createTuitions(studentId: string, ids: Ids, profile: PaymentProfile) {
  const amount = 50000;
  const surcharge = 5000;

  if (profile === "egresada") {
    // Historial: todas las cuotas de su trayectoria pagadas en término (simplificación de demo).
    for (const { period, month } of TUITION_PERIODS) {
      const due = dueDate(2026, month, 10);
      const tuition = await prisma.tuition.create({ data: { studentId, period, amount, dueDate: due, status: "PAGADA" } });
      await prisma.payment.create({
        data: {
          tuitionId: tuition.id,
          methodId: faker.helpers.arrayElement([ids.transferenciaId, ids.efectivoId]),
          amountPaid: amount,
          paidAt: daysBefore(due, faker.number.int({ min: 1, max: 5 })),
          recordedById: ids.secretariaUserId,
        },
      });
    }
    return;
  }

  const periodsToLeaveUnpaid: Record<PaymentProfile, string[]> = {
    al_dia: [],
    pendiente: [],
    atrasada: ["2026-08"],
    morosa: ["2026-07", "2026-08"],
    suspendida: ["2026-06", "2026-07", "2026-08"],
    egresada: [],
  };
  const unpaid = new Set(periodsToLeaveUnpaid[profile]);

  for (const { period, month } of TUITION_PERIODS) {
    const due = dueDate(2026, month, 10);
    if (unpaid.has(period)) {
      await prisma.tuition.create({ data: { studentId, period, amount, dueDate: due, status: "CON_RECARGO" } });
      continue;
    }
    const tuition = await prisma.tuition.create({ data: { studentId, period, amount, dueDate: due, status: "PAGADA" } });
    await prisma.payment.create({
      data: {
        tuitionId: tuition.id,
        methodId: faker.helpers.arrayElement([ids.transferenciaId, ids.efectivoId]),
        amountPaid: amount,
        paidAt: daysBefore(due, faker.number.int({ min: 1, max: 5 })),
        recordedById: ids.secretariaUserId,
      },
    });
  }

  // "Pendiente": la próxima cuota (Septiembre) ya fue emitida y todavía no vence ni está pagada.
  // Las alumnas "al día" no la tienen creada todavía (recién se emite al iniciar el mes).
  if (profile === "pendiente") {
    const due = dueDate(2026, 9, 10);
    await prisma.tuition.create({ data: { studentId, period: "2026-09", amount, dueDate: due, status: "PENDIENTE" } });
  }
  void surcharge;
}

async function simulateCurrentCoursework(
  studentId: string,
  ids: Ids,
  offerings: AcademicStructure["offeringsYear1"],
  options: StudentCreationOptions
) {
  await prisma.subjectEnrollment.createMany({
    data: offerings.map((o) => ({ studentId, subjectOfferingId: o.id, status: "CURSANDO" as const })),
    skipDuplicates: true,
  });

  const assignmentsOk = options.overrides?.forcedAssignmentsOk ?? faker.datatype.boolean({ probability: options.attendanceProfile === "low" ? 0.6 : 0.9 });

  for (const offering of offerings) {
    const sessionIds = await ensureClassSessions(offering.id);
    const statuses = attendanceStatusesFor(options.attendanceProfile, options.overrides?.forcedAttendancePercent, sessionIds.length);
    await prisma.attendance.createMany({
      data: sessionIds.map((classSessionId, i) => ({
        studentId,
        classSessionId,
        status: statuses[i],
        recordedById: ids.coordinadorUserId,
      })),
      skipDuplicates: true,
    });

    const evaluationsByName = await ensureEvaluations(offering.id);
    const gradeData: Array<{ studentId: string; evaluationId: string; score: number; gradedAt: Date; recordedById: string }> = [];

    for (const [name, evaluationId] of Object.entries(evaluationsByName)) {
      if (name.startsWith("__template__")) continue;
      if (name === "Recuperatorio") continue; // se completa aparte solo si hizo falta
      const forced =
        options.overrides?.forcedGrades && name === "Parcial 1"
          ? options.overrides.forcedGrades.partial1
          : options.overrides?.forcedGrades && name === "Parcial 2"
            ? options.overrides.forcedGrades.partial2
            : undefined;
      gradeData.push({
        studentId,
        evaluationId,
        score: gradeFor(options.attendanceProfile, forced),
        gradedAt: daysBefore(TODAY, 14),
        recordedById: ids.coordinadorUserId,
      });
    }
    await prisma.grade.createMany({ data: gradeData, skipDuplicates: true });

    // Recuperatorio: solo si el Parcial 2 quedó por debajo de la nota mínima institucional (8), o si se forzó explícitamente.
    const parcial2 = gradeData.find((g) => evaluationsByName["Parcial 2"] === g.evaluationId);
    const needsRetake = options.overrides?.forcedGrades?.retake !== undefined || (parcial2 && parcial2.score < 6);
    if (needsRetake && evaluationsByName["Recuperatorio"]) {
      await prisma.grade.create({
        data: {
          studentId,
          evaluationId: evaluationsByName["Recuperatorio"],
          score: options.overrides?.forcedGrades?.retake ?? gradeFor("high"),
          gradedAt: daysBefore(TODAY, 7),
          recordedById: ids.coordinadorUserId,
        },
      });
    }

    const assignmentTemplateId = await ensureAssignmentTemplate(offering.id);
    await prisma.assignment.create({
      data: {
        studentId,
        templateId: assignmentTemplateId,
        status: assignmentsOk ? "APROBADO" : "PENDIENTE",
        submittedAt: assignmentsOk ? daysBefore(TODAY, 10) : null,
      },
    });
  }
}
