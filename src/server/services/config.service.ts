import { prisma } from "@/server/db";

export interface ResolvedInstitutionConfig {
  minAttendancePercent: number;
  minPartialGradeForPromotion: number;
  passingGrade: number;
  tuitionAmount: number;
  tuitionDueDay: number;
  surchargeAmount: number;
  criticalDay: number;
  autoSuspendOnCriticalDay: boolean;
}

export async function getInstitutionConfig(institutionId: string): Promise<ResolvedInstitutionConfig> {
  const config = await prisma.institutionConfig.findUniqueOrThrow({ where: { institutionId } });
  return {
    minAttendancePercent: config.minAttendancePercent.toNumber(),
    minPartialGradeForPromotion: config.minPartialGradeForPromotion.toNumber(),
    passingGrade: config.passingGrade.toNumber(),
    tuitionAmount: config.tuitionAmount.toNumber(),
    tuitionDueDay: config.tuitionDueDay,
    surchargeAmount: config.surchargeAmount.toNumber(),
    criticalDay: config.criticalDay,
    autoSuspendOnCriticalDay: config.autoSuspendOnCriticalDay,
  };
}
