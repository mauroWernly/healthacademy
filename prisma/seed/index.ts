import bcrypt from "bcryptjs";
import { prisma } from "../../src/server/db";
import { PERMISSIONS, ROLE_DEFINITIONS } from "../../src/server/auth/permissions";
import { buildAcademicStructure } from "./academic-structure";
import { createStudent } from "./students";

async function main() {
  console.log("🌱 Seed — Instituto Superior de Cosmetología Integral (datos ficticios)");

  const institution = await prisma.institution.create({
    data: { name: "Instituto Superior de Cosmetología Integral" },
  });

  await prisma.institutionConfig.create({
    data: {
      institutionId: institution.id,
      minAttendancePercent: 80,
      minPartialGradeForPromotion: 8,
      passingGrade: 4,
      tuitionAmount: 50000,
      tuitionDueDay: 10,
      surchargeAmount: 5000,
      criticalDay: 20,
      autoSuspendOnCriticalDay: false,
    },
  });

  // ── Permisos, roles y usuarios ──────────────────────────────────────────
  const permissionByKey = new Map<string, string>();
  for (const key of PERMISSIONS) {
    const permission = await prisma.permission.create({ data: { key } });
    permissionByKey.set(key, permission.id);
  }
  const wildcardPermission = await prisma.permission.create({ data: { key: "*", description: "Acceso total" } });
  permissionByKey.set("*", wildcardPermission.id);

  const roleByKey = new Map<string, string>();
  for (const [key, def] of Object.entries(ROLE_DEFINITIONS)) {
    const role = await prisma.role.create({ data: { key, name: def.name, description: def.description } });
    roleByKey.set(key, role.id);
    const perms = def.permissions === "*" ? ["*"] : def.permissions;
    await prisma.rolePermission.createMany({
      data: perms.map((p) => ({ roleId: role.id, permissionId: permissionByKey.get(p)! })),
    });
  }

  async function createUser(name: string, email: string, roleKey: string, password: string) {
    return prisma.user.create({
      data: {
        institutionId: institution.id,
        name,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        roleId: roleByKey.get(roleKey)!,
      },
    });
  }

  const adminUser = await createUser("Administración", "admin@cosmetologia.demo", "admin", "Admin123!");
  const secretariaUser = await createUser("Secretaría Académica", "secretaria@cosmetologia.demo", "secretaria", "Secretaria123!");
  const coordinadorUser = await createUser("Coordinación Académica", "coordinacion@cosmetologia.demo", "coordinador", "Coordinador123!");

  console.log("👤 Usuarios demo:");
  console.log("   admin@cosmetologia.demo         / Admin123!");
  console.log("   secretaria@cosmetologia.demo     / Secretaria123!");
  console.log("   coordinacion@cosmetologia.demo   / Coordinador123!");

  // ── Documentación y métodos de pago ─────────────────────────────────────
  const documentTypesSeed = [
    { key: "dni", name: "DNI" },
    { key: "foto_carnet", name: "Foto carnet 4x4 (fondo celeste)" },
    { key: "partida_nacimiento", name: "Partida de nacimiento" },
    { key: "titulo_secundario", name: "Título secundario" },
    { key: "analitico_secundario", name: "Analítico secundario" },
    { key: "certificado_buena_conducta", name: "Certificado de buena conducta" },
    { key: "carnet_vacunacion", name: "Carnet de vacunación" },
    { key: "datos_personales_completos", name: "Datos personales completos" },
  ];
  const documentTypeIdByKey: Record<string, string> = {};
  for (const dt of documentTypesSeed) {
    const created = await prisma.documentType.create({ data: { institutionId: institution.id, key: dt.key, name: dt.name } });
    documentTypeIdByKey[dt.key] = created.id;
  }

  const transferencia = await prisma.paymentMethod.create({ data: { institutionId: institution.id, key: "transferencia", name: "Transferencia bancaria" } });
  const efectivo = await prisma.paymentMethod.create({ data: { institutionId: institution.id, key: "efectivo", name: "Efectivo" } });
  await prisma.paymentMethod.createMany({
    data: [
      { institutionId: institution.id, key: "mercadopago", name: "Mercado Pago", active: false },
      { institutionId: institution.id, key: "tarjeta", name: "Tarjeta de crédito/débito", active: false },
      { institutionId: institution.id, key: "debito_automatico", name: "Débito automático", active: false },
    ],
  });

  // ── Estructura académica ────────────────────────────────────────────────
  console.log("🎓 Creando carrera, plan de estudios, materias, comisiones...");
  const structure = await buildAcademicStructure(institution.id);

  const ids = {
    institutionId: institution.id,
    documentTypeIdByKey,
    transferenciaId: transferencia.id,
    efectivoId: efectivo.id,
    secretariaUserId: secretariaUser.id,
    coordinadorUserId: coordinadorUser.id,
  };

  // ── Alumnas (sección 50): distribución de ~300 con 6 casos de demo embebidos (sección 51) ──
  console.log("👩‍🎓 Generando alumnas ficticias (esto puede tardar unos minutos)...");

  type Bucket = {
    key: string;
    count: number;
    academicStatus: "ACTIVA" | "REGULAR" | "CONDICIONAL" | "EGRESADA" | "SUSPENDIDA" | "BAJA";
    paymentProfile: "al_dia" | "pendiente" | "atrasada" | "morosa" | "suspendida" | "egresada";
    attendanceProfile: "high" | "borderline" | "low";
    documentationComplete: boolean;
    stage: "year1" | "year2" | "final";
  };

  const buckets: Bucket[] = [
    { key: "activas_al_dia", count: 220, academicStatus: "ACTIVA", paymentProfile: "al_dia", attendanceProfile: "high", documentationComplete: true, stage: "year1" },
    { key: "pendientes", count: 25, academicStatus: "ACTIVA", paymentProfile: "pendiente", attendanceProfile: "high", documentationComplete: true, stage: "year2" },
    { key: "atrasadas_recargo", count: 15, academicStatus: "ACTIVA", paymentProfile: "atrasada", attendanceProfile: "high", documentationComplete: true, stage: "year1" },
    { key: "sin_pago_dia20", count: 10, academicStatus: "ACTIVA", paymentProfile: "morosa", attendanceProfile: "borderline", documentationComplete: true, stage: "year2" },
    { key: "suspendidas", count: 5, academicStatus: "SUSPENDIDA", paymentProfile: "suspendida", attendanceProfile: "borderline", documentationComplete: true, stage: "year1" },
    { key: "documentacion_incompleta", count: 10, academicStatus: "ACTIVA", paymentProfile: "al_dia", attendanceProfile: "high", documentationComplete: false, stage: "year2" },
    { key: "egresadas", count: 5, academicStatus: "EGRESADA", paymentProfile: "egresada", attendanceProfile: "high", documentationComplete: true, stage: "final" },
    { key: "condicionales", count: 5, academicStatus: "CONDICIONAL", paymentProfile: "al_dia", attendanceProfile: "low", documentationComplete: true, stage: "year2" },
    { key: "baja", count: 5, academicStatus: "BAJA", paymentProfile: "atrasada", attendanceProfile: "low", documentationComplete: false, stage: "year1" },
  ];

  const totalStudents = buckets.reduce((sum, b) => sum + b.count, 0);
  if (totalStudents !== 300) {
    throw new Error(`La distribución de buckets debe sumar 300 alumnas (suma actual: ${totalStudents}).`);
  }

  let created = 0;
  for (const bucket of buckets) {
    for (let i = 0; i < bucket.count; i++) {
      // Casos de demo explícitos (sección 51), embebidos en el bucket que ya representa su escenario.
      let overrides: Parameters<typeof createStudent>[2]["overrides"];
      if (bucket.key === "egresadas" && i === 0) {
        overrides = { fileNumber: "000001", firstName: "Valentina", lastName: "Caso Perfecto" };
      } else if (bucket.key === "suspendidas" && i === 0) {
        overrides = { fileNumber: "000002", firstName: "Rocío", lastName: "Caso Morosidad" };
      } else if (bucket.key === "documentacion_incompleta" && i === 0) {
        overrides = { fileNumber: "000003", firstName: "Milagros", lastName: "Caso Documentación" };
      } else if (bucket.key === "activas_al_dia" && i === 0) {
        overrides = {
          fileNumber: "000004",
          firstName: "Camila",
          lastName: "Caso Académico",
          forcedAttendancePercent: 76,
          forcedGrades: { partial1: 9, partial2: 9 },
          forcedAssignmentsOk: true,
        };
      } else if (bucket.key === "activas_al_dia" && i === 1) {
        overrides = {
          fileNumber: "000005",
          firstName: "Antonella",
          lastName: "Caso Recuperatorio",
          forcedGrades: { partial1: 8, partial2: 5, retake: 8 },
          forcedAssignmentsOk: true,
        };
      } else if (bucket.key === "egresadas" && i === 1) {
        overrides = { fileNumber: "000006", firstName: "Florencia", lastName: "Caso Egresada" };
      }

      await createStudent(ids, structure, {
        academicStatus: bucket.academicStatus,
        paymentProfile: bucket.paymentProfile,
        attendanceProfile: bucket.attendanceProfile,
        documentationComplete: bucket.documentationComplete,
        stage: bucket.stage,
        overrides,
      });

      created += 1;
      if (created % 25 === 0) console.log(`   ...${created}/${totalStudents}`);
    }
  }

  await prisma.auditLog.create({
    data: {
      institutionId: institution.id,
      userId: adminUser.id,
      action: "SEED",
      entity: "Institution",
      entityId: institution.id,
      after: { note: "Carga inicial de datos de demo (seed determinístico)." },
    },
  });

  console.log(`✅ Seed completo: ${created} alumnas creadas.`);
}

main()
  .catch((err) => {
    console.error("❌ Error durante el seed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
