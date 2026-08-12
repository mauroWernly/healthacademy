/**
 * Catálogo de permisos y matriz rol → permisos.
 * Fuente de verdad para el seed (que crea Role/Permission/RolePermission en DB)
 * y para los checks en runtime. Nunca hardcodear "if (role === 'admin')" en
 * un service — siempre pasar por `can()`.
 */
export const PERMISSIONS = [
  "student:read",
  "student:write",
  "document:read",
  "document:write",
  "payment:read",
  "payment:write",
  "academic:read",
  "subject:write",
  "evaluation:write",
  "grade:write",
  "attendance:write",
  "assignment:write",
  "internship:write",
  "thesis:write",
  "suspension:write",
  "config:write",
  "user:write",
  "audit:read",
  "report:read",
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number];

export const ROLE_DEFINITIONS: Record<
  string,
  { name: string; description: string; permissions: "*" | PermissionKey[] }
> = {
  admin: {
    name: "Administrador",
    description: "Acceso completo al sistema.",
    permissions: "*",
  },
  secretaria: {
    name: "Secretaría",
    description: "Gestión de alumnas, legajos, documentación y pagos.",
    permissions: [
      "student:read",
      "student:write",
      "document:read",
      "document:write",
      "payment:read",
      "payment:write",
      "academic:read",
      "suspension:write",
      "report:read",
    ],
  },
  coordinador: {
    name: "Coordinador académico",
    description:
      "Gestión de materias, evaluaciones, notas, asistencia, prácticas y tesinas.",
    permissions: [
      "student:read",
      "academic:read",
      "subject:write",
      "evaluation:write",
      "grade:write",
      "attendance:write",
      "assignment:write",
      "internship:write",
      "thesis:write",
      "report:read",
    ],
  },
  docente: {
    name: "Docente",
    description: "Futuro: ver sus materias, cargar notas y asistencia propias.",
    permissions: ["student:read", "academic:read", "grade:write", "attendance:write"],
  },
};

/** Chequeo server-side de permisos. `permissions` viene de la sesión (JWT), poblada en el login. */
export function can(permissions: string[], required: PermissionKey): boolean {
  return permissions.includes("*") || permissions.includes(required);
}

export class ForbiddenError extends Error {
  constructor(permission: string) {
    super(`No tenés permiso para realizar esta acción (${permission}).`);
    this.name = "ForbiddenError";
  }
}

/** Usar al comienzo de todo Server Action / service crítico. Nunca confiar solo en la UI. */
export function requirePermission(permissions: string[], required: PermissionKey): void {
  if (!can(permissions, required)) {
    throw new ForbiddenError(required);
  }
}
