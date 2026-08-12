import { describe, expect, it } from "vitest";
import { can, requirePermission, ForbiddenError, ROLE_DEFINITIONS } from "@/server/auth/permissions";

function permissionsFor(roleKey: keyof typeof ROLE_DEFINITIONS): string[] {
  const def = ROLE_DEFINITIONS[roleKey].permissions;
  return def === "*" ? ["*"] : def;
}

describe("matriz de permisos por rol (sección 41, 67)", () => {
  it("administrador tiene acceso total", () => {
    const perms = permissionsFor("admin");
    expect(can(perms, "payment:write")).toBe(true);
    expect(can(perms, "config:write")).toBe(true);
    expect(can(perms, "user:write")).toBe(true);
  });

  it("secretaría puede gestionar pagos y documentación pero no materias/notas", () => {
    const perms = permissionsFor("secretaria");
    expect(can(perms, "payment:write")).toBe(true);
    expect(can(perms, "document:write")).toBe(true);
    expect(can(perms, "grade:write")).toBe(false);
    expect(can(perms, "config:write")).toBe(false);
  });

  it("coordinación puede registrar notas y asistencia pero no pagos", () => {
    const perms = permissionsFor("coordinador");
    expect(can(perms, "grade:write")).toBe(true);
    expect(can(perms, "attendance:write")).toBe(true);
    expect(can(perms, "payment:write")).toBe(false);
  });

  it("un acceso no autorizado lanza ForbiddenError", () => {
    const perms = permissionsFor("secretaria");
    expect(() => requirePermission(perms, "grade:write")).toThrow(ForbiddenError);
  });
});
