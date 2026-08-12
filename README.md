# Instituto Superior de Cosmetología Integral — Sistema de Gestión Educativa

Sistema integral de gestión académica y administrativa para una institución
de nivel superior ficticia (~300 alumnas, una carrera). Ver
[`ARCHITECTURE.md`](./ARCHITECTURE.md) para la arquitectura completa,
decisiones de diseño y plan de implementación por fases.

**Todos los datos son ficticios**, generados por el seed. No usar con datos
reales sin antes revisar la sección de seguridad de `ARCHITECTURE.md`.

## Stack

Next.js 16 (App Router) · TypeScript · PostgreSQL · Prisma 7 · Auth.js v5 ·
Tailwind CSS · Vitest.

## Requisitos

- Node.js 22+
- PostgreSQL 16+ corriendo localmente (o accesible por `DATABASE_URL`)

## Setup

```bash
npm install
cp .env.example .env   # ajustar DATABASE_URL / AUTH_SECRET si hace falta
npx prisma migrate dev # crea el esquema
npm run db:seed        # carga ~300 alumnas ficticias + usuarios demo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Usuarios de demostración (creados por el seed)

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@cosmetologia.demo | Admin123! |
| Secretaría | secretaria@cosmetologia.demo | Secretaria123! |
| Coordinación académica | coordinacion@cosmetologia.demo | Coordinador123! |

### Qué puede editar cada rol dentro del legajo

Cada sección del legajo de una alumna está atada a un permiso distinto — un
rol de demo no ve el botón de una sección si no tiene el permiso correspondiente
(salvo Administrador, que los tiene todos):

| Sección | Permiso requerido | Quién lo tiene |
|---|---|---|
| Documentación | `document:write` | Secretaría, Admin |
| Materias / Notas / Asistencia / Trabajos prácticos | `subject:write` / `grade:write` / `attendance:write` / `assignment:write` | Coordinación, Admin |
| Datos personales / Estado académico / Nueva alumna | `student:write` | Secretaría, Admin |
| Suspensión | `suspension:write` | Secretaría, Admin |
| Pagos | `payment:write` | Secretaría, Admin |

### Resetear los datos de demo

```bash
npm run db:reset   # prisma migrate reset --force (vuelve a correr el seed)
```

### Casos de demo explícitos (sección 51)

Buscá estos legajos desde `/alumnas` (buscador por apellido) para ver cada
escenario:

| Legajo | Caso |
|---|---|
| 000001 | Perfecta — documentación, cuotas y asistencia al día, egresada |
| 000002 | Morosidad — varias cuotas impagas, suspendida |
| 000003 | Documentación incompleta — 2 pendientes + 1 rechazado |
| 000004 | Académico — notas excelentes, asistencia < 80%, no promociona |
| 000005 | Recuperatorio — parcial desaprobado, recuperatorio aprobado |
| 000006 | Egresada — carrera completa, tesina y práctica aprobadas |

## Scripts

```bash
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run test     # tests unitarios (reglas de negocio y permisos)
npm run lint     # eslint
npm run db:seed  # (re)carga los datos de demo
npm run db:reset # resetea la base y vuelve a sembrar
```

## Estructura

Ver la sección 4 de `ARCHITECTURE.md` para el detalle de carpetas. En breve:

- `prisma/schema.prisma` — modelo de datos completo.
- `prisma/seed/` — factories y generación de datos de demo.
- `src/server/domain/` — reglas de negocio puras (promoción, asistencia,
  cuotas), con tests en `tests/unit/`.
- `src/server/services/` — orquestación de esas reglas contra la base.
- `src/server/auth/` — autenticación y matriz de permisos por rol.
- `src/app/(auth)` / `src/app/(app)` — rutas públicas y protegidas.
