import { prisma } from "../../src/server/db";
import { faker } from "./lib";

type SubjectSeed = {
  name: string;
  code: string;
  type: "ANNUAL" | "SEMESTER" | "WORKSHOP" | "PRACTICE" | "THESIS";
  semesterOrder?: 1 | 2;
};

const YEAR1_SUBJECTS: SubjectSeed[] = [
  { name: "Anatomía y Fisiología Aplicada", code: "ANU-101", type: "ANNUAL" },
  { name: "Cosmetología General", code: "ANU-102", type: "ANNUAL" },
  { name: "Dermatología", code: "ANU-103", type: "ANNUAL" },
  { name: "Química Cosmética", code: "ANU-104", type: "ANNUAL" },
  { name: "Introducción a la Cosmetología", code: "C1-101", type: "SEMESTER", semesterOrder: 1 },
  { name: "Bioseguridad e Higiene", code: "C1-102", type: "SEMESTER", semesterOrder: 1 },
  { name: "Cosmetología Facial I", code: "C2-101", type: "SEMESTER", semesterOrder: 2 },
  { name: "Técnicas de Masaje Facial", code: "C2-102", type: "SEMESTER", semesterOrder: 2 },
  { name: "Taller de Diagnóstico Facial", code: "TAL-101", type: "WORKSHOP" },
  { name: "Taller de Productos Cosméticos", code: "TAL-102", type: "WORKSHOP" },
];

const YEAR2_SUBJECTS: SubjectSeed[] = [
  { name: "Cosmetología Facial II", code: "ANU-201", type: "ANNUAL" },
  { name: "Cosmetología Corporal", code: "ANU-202", type: "ANNUAL" },
  { name: "Dermatocosmética", code: "ANU-203", type: "ANNUAL" },
  { name: "Anatomía Aplicada II", code: "ANU-204", type: "ANNUAL" },
  { name: "Técnicas de Masaje Corporal", code: "C1-201", type: "SEMESTER", semesterOrder: 1 },
  { name: "Aparatología Estética I", code: "C1-202", type: "SEMESTER", semesterOrder: 1 },
  { name: "Cosmetología Spa", code: "C1-203", type: "SEMESTER", semesterOrder: 1 },
  { name: "Aparatología Estética II", code: "C2-201", type: "SEMESTER", semesterOrder: 2 },
  { name: "Tratamientos Corporales", code: "C2-202", type: "SEMESTER", semesterOrder: 2 },
  { name: "Marketing y Gestión Profesional", code: "C2-203", type: "SEMESTER", semesterOrder: 2 },
  { name: "Taller de Protocolos Faciales", code: "TAL-201", type: "WORKSHOP" },
  { name: "Taller de Protocolos Corporales", code: "TAL-202", type: "WORKSHOP" },
];

const FINAL_STAGE_SUBJECTS: SubjectSeed[] = [
  { name: "Prácticas Profesionales Supervisadas", code: "PRA-301", type: "PRACTICE" },
  { name: "Tesina Final", code: "TES-301", type: "THESIS" },
];

async function createEvaluationTemplates(subjectId: string, type: SubjectSeed["type"]) {
  if (type === "ANNUAL" || type === "SEMESTER") {
    const partial1 = await prisma.evaluationTemplate.create({
      data: { subjectId, name: "Parcial 1", type: "PARTIAL", order: 1, isRequired: true, affectsPromotion: true },
    });
    const partial2 = await prisma.evaluationTemplate.create({
      data: { subjectId, name: "Parcial 2", type: "PARTIAL", order: 2, isRequired: true, affectsPromotion: true, allowsRetake: true },
    });
    await prisma.evaluationTemplate.create({
      data: {
        subjectId,
        name: "Recuperatorio",
        type: "RETAKE",
        order: 3,
        isRequired: false,
        affectsPromotion: false,
        retakeOfId: partial2.id,
      },
    });
    return { partial1Id: partial1.id, partial2Id: partial2.id };
  }

  if (type === "WORKSHOP") {
    await prisma.evaluationTemplate.create({
      data: { subjectId, name: "Trabajo Práctico Integrador", type: "PRACTICAL_WORK", order: 1, isRequired: true, affectsPromotion: true },
    });
    await prisma.evaluationTemplate.create({
      data: { subjectId, name: "Evaluación Práctica", type: "PRACTICAL_EVALUATION", order: 2, isRequired: true, affectsPromotion: true },
    });
    return {};
  }

  if (type === "PRACTICE") {
    await prisma.evaluationTemplate.create({
      data: { subjectId, name: "Evaluación de Práctica", type: "PRACTICAL_EVALUATION", order: 1, isRequired: true, affectsPromotion: true },
    });
    return {};
  }

  // THESIS
  await prisma.evaluationTemplate.create({
    data: { subjectId, name: "Presentación", type: "PRESENTATION", order: 1, isRequired: true, affectsPromotion: true },
  });
  await prisma.evaluationTemplate.create({
    data: { subjectId, name: "Defensa", type: "DEFENSE", order: 2, isRequired: true, affectsPromotion: true },
  });
  return {};
}

export async function buildAcademicStructure(institutionId: string) {
  const career = await prisma.career.create({
    data: {
      institutionId,
      name: "Tecnicatura Superior en Cosmetología Facial y Corporal",
      durationMonths: 30,
    },
  });

  const studyPlan = await prisma.studyPlan.create({
    data: { careerId: career.id, name: "Plan 2026", version: "1" },
  });

  const year1 = await prisma.academicYear.create({
    data: { studyPlanId: studyPlan.id, order: 1, name: "1° Año" },
  });
  const year2 = await prisma.academicYear.create({
    data: { studyPlanId: studyPlan.id, order: 2, name: "2° Año" },
  });
  const finalStage = await prisma.academicYear.create({
    data: { studyPlanId: studyPlan.id, order: 3, name: "Etapa Final", isFinalStage: true },
  });

  const year1Sem1 = await prisma.semester.create({ data: { academicYearId: year1.id, order: 1, name: "1° Cuatrimestre" } });
  const year1Sem2 = await prisma.semester.create({ data: { academicYearId: year1.id, order: 2, name: "2° Cuatrimestre" } });
  const year2Sem1 = await prisma.semester.create({ data: { academicYearId: year2.id, order: 1, name: "1° Cuatrimestre" } });
  const year2Sem2 = await prisma.semester.create({ data: { academicYearId: year2.id, order: 2, name: "2° Cuatrimestre" } });

  async function createSubjects(
    seeds: SubjectSeed[],
    academicYearId: string,
    semesters: { 1: string; 2: string } | null
  ) {
    const created: Array<{ id: string; code: string; name: string; type: SubjectSeed["type"]; partial1Id?: string; partial2Id?: string }> = [];
    for (const s of seeds) {
      const subject = await prisma.subject.create({
        data: {
          academicYearId,
          semesterId: s.semesterOrder && semesters ? semesters[s.semesterOrder] : null,
          name: s.name,
          code: s.code,
          type: s.type,
        },
      });
      const templates = await createEvaluationTemplates(subject.id, s.type);
      created.push({ id: subject.id, code: subject.code, name: subject.name, type: s.type, ...templates });
    }
    return created;
  }

  const year1Subjects = await createSubjects(YEAR1_SUBJECTS, year1.id, { 1: year1Sem1.id, 2: year1Sem2.id });
  const year2Subjects = await createSubjects(YEAR2_SUBJECTS, year2.id, { 1: year2Sem1.id, 2: year2Sem2.id });
  const finalSubjects = await createSubjects(FINAL_STAGE_SUBJECTS, finalStage.id, null);

  // Cohortes: 2024 (etapa final / próximas a egresar), 2025 (2° año), 2026 (1° año).
  const cohort2024 = await prisma.cohort.create({ data: { institutionId, careerId: career.id, name: "Cohorte 2024", startYear: 2024 } });
  const cohort2025 = await prisma.cohort.create({ data: { institutionId, careerId: career.id, name: "Cohorte 2025", startYear: 2025 } });
  const cohort2026 = await prisma.cohort.create({ data: { institutionId, careerId: career.id, name: "Cohorte 2026", startYear: 2026 } });

  async function createCommissions(cohortId: string, names: string[]) {
    const commissions = [];
    for (const name of names) {
      commissions.push(
        await prisma.commission.create({
          data: { institutionId, cohortId, name, shift: faker.helpers.arrayElement(["Mañana", "Tarde"]) },
        })
      );
    }
    return commissions;
  }

  const commissionsCohort2024 = await createCommissions(cohort2024.id, ["Etapa Final A"]);
  const commissionsCohort2025 = await createCommissions(cohort2025.id, ["2° A", "2° B"]);
  const commissionsCohort2026 = await createCommissions(cohort2026.id, ["1° A", "1° B"]);

  async function createOfferings(
    subjects: Array<{ id: string; code: string }>,
    commissions: Array<{ id: string }>
  ) {
    const offerings: Array<{ subjectId: string; subjectCode: string; commissionId: string; id: string }> = [];
    for (const subject of subjects) {
      for (const commission of commissions) {
        const offering = await prisma.subjectOffering.create({
          data: {
            subjectId: subject.id,
            commissionId: commission.id,
            teacherName: faker.person.fullName(),
            calendarYear: 2026,
          },
        });
        offerings.push({ subjectId: subject.id, subjectCode: subject.code, commissionId: commission.id, id: offering.id });
        await prisma.assignmentTemplate.create({
          data: {
            subjectOfferingId: offering.id,
            name: "Trabajos Prácticos de cursada",
            isRequired: true,
          },
        });
      }
    }
    return offerings;
  }

  const offeringsYear1 = await createOfferings(year1Subjects, commissionsCohort2026);
  const offeringsYear2 = await createOfferings(year2Subjects, commissionsCohort2025);
  const offeringsFinal = await createOfferings(finalSubjects, commissionsCohort2024);

  return {
    career,
    studyPlan,
    year1Subjects,
    year2Subjects,
    finalSubjects,
    cohort2024,
    cohort2025,
    cohort2026,
    commissionsCohort2024,
    commissionsCohort2025,
    commissionsCohort2026,
    offeringsYear1,
    offeringsYear2,
    offeringsFinal,
  };
}

export type AcademicStructure = Awaited<ReturnType<typeof buildAcademicStructure>>;
