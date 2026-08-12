# Arquitectura — Sistema Integral de Gestión Educativa

**Instituto Superior de Cosmetología Integral** (institución ficticia, datos de demo)

Este documento se produce antes de escribir código de interfaz, conforme a la
Fase 1 del proyecto. Cubre los 16 puntos requeridos: arquitectura general,
stack, modelo de datos, carpetas, autenticación, roles/permisos, reglas de
negocio, flujos principales, dashboard, legajo, plan de implementación,
testing, almacenamiento de documentos, backups y seed.

---

## 1. Arquitectura general

Aplicación web full-stack monolítica modular (no microservicios: la escala
objetivo — miles de alumnas, una institución por despliegue — no lo
justifica, y un monolito modular es más simple de operar y auditar).

```
┌─────────────────────────────────────────────────────────┐
│                       Next.js App                        │
│  ┌───────────────┐   ┌────────────────────────────────┐ │
│  │  UI (RSC +     │   │  Server layer                   │ │
│  │  Client comps) │──▶│  - Server Actions / Route Handl.│ │
│  │  App Router    │   │  - Auth (session + role check)  │ │
│  └───────────────┘   │  - Domain services (reglas)      │ │
│                       │  - Prisma ORM                    │ │
│                       └───────────────┬──────────────────┘ │
└───────────────────────────────────────┼─────────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         │        PostgreSQL              │
                         └─────────────────────────────────┘
                         ┌─────────────────────────────────┐
                         │  File storage (StorageProvider)  │
                         │  local (dev) → S3-compatible      │
                         │  (prod, swap sin tocar dominio)   │
                         └─────────────────────────────────┘
```

Reglas clave:
- **Toda regla de negocio vive en el servidor** (services en
  `src/server/domain/*`), nunca solo en el cliente. El frontend consume
  resultados ya calculados.
- **Multi-tenant-ready a nivel de modelo** (tabla `Institution`), aunque el
  despliegue inicial sirva una sola institución. Todo dato cuelga de
  `institutionId`.
- **Configuración en base de datos**, no en constantes de código
  (`InstitutionConfig`): asistencia mínima, nota mínima, importe de cuota,
  día de vencimiento, recargo, día crítico, regla de suspensión, etc.

## 2. Stack tecnológico y justificación

| Capa | Elección | Por qué |
|---|---|---|
| Framework | **Next.js 15 (App Router) + TypeScript** | Un solo repo/deploy para UI y backend (Server Actions + Route Handlers), RSC para dashboards data-heavy sin duplicar fetch en cliente, ecosistema maduro. |
| Base de datos | **PostgreSQL** | Relacional, ACID, soporta miles de alumnas sin problema, constraints reales para integridad (FKs, unique DNI/legajo). |
| ORM | **Prisma** | Migraciones versionadas, tipos generados, buen soporte de relaciones normalizadas y auditable. |
| Auth | **Auth.js (NextAuth v5), Credentials provider + bcrypt** | Login usuario/contraseña interno (no hay SSO institucional hoy), sesión JWT con `role` embebido, extensible a proveedores futuros. |
| Validación | **Zod** | Un solo schema reusado en formulario (cliente) y Server Action (servidor) — evita reglas duplicadas. |
| UI | **Tailwind CSS + componentes propios estilo shadcn/ui** | Sistema de diseño consistente (tipografía, espaciado, badges, tabs) sin bloatear con una librería de componentes pesada. |
| Storage de archivos | **Interfaz `StorageProvider`**: implementación local (`fs`, dev) + implementación S3-compatible (prod) | Se guarda referencia (path/key) en `Document`/`StudentFile`, nunca el binario en la base. Cambiar de local a cloud es cambiar una implementación, no el dominio. |
| Testing | **Vitest** (unidad: reglas de negocio) + **Playwright** (E2E: login, búsqueda, pago, promoción) | Las reglas críticas (promoción, cuotas, asistencia, permisos) son funciones puras testeables sin UI. |
| Auditoría | Tabla `AuditLog` + middleware de escritura en cada service crítico | Trazabilidad legal de pagos/notas/documentación. |

## 3. Modelo de datos (resumen entidad-relación)

```
Institution 1───* Career 1───* StudyPlan 1───* AcademicYear 1───* Semester
                                                      │
Career 1───* Commission                              │
                                                      ▼
Student *───1 Career          StudyPlan 1───* Subject *───* Commission
Student *───1 Cohort (cohorte = campo simple por ahora)
Student 1───* Enrollment (inscripción a la carrera)
Student 1───* SubjectEnrollment ──1 Subject
Student 1───* Document (documentación de legajo)
Student 1───* StudentFile (archivo genérico: foto, etc.)
Student 1───* Attendance ──1 ClassSession ──1 Subject/Commission
Student 1───* Grade ──1 Evaluation ──1 Subject
Student 1───* Assignment (TP) ──1 Subject
Student 1───* Tuition (cuota) 1───1? Payment
Student 1───* Suspension
Student 1───* Internship (práctica)
Student 1───1? Thesis
User *───1 Role ──*  Permission (rol → permisos)
AuditLog *───1 User, referencia polimórfica (entity, entityId)
InstitutionConfig 1───1 Institution (reglas configurables)
```

Detalle completo en `prisma/schema.prisma` (fuente de verdad). Puntos de
diseño relevantes:

- **`Evaluation` es independiente de `Subject`**: una materia define qué
  evaluaciones tiene (Parcial 1, Parcial 2, Recuperatorio, Final, TP,
  Defensa...) vía `EvaluationTemplate`, no se asume una estructura fija de
  "dos parciales". `Grade` referencia `Evaluation` y guarda la nota; un
  recuperatorio es **otra fila de `Evaluation`/`Grade`**, nunca sobrescribe
  la original — el historial completo queda visible.
- **Asistencia por clase**: `ClassSession` (fecha, materia, comisión) +
  `Attendance` (alumna, sesión, estado). El % se calcula sobre las clases
  *efectivamente registradas* de esa materia, nunca sobre un total fijo.
- **`Tuition` (obligación) separada de `Payment` (registro de cobro)**: una
  cuota es una obligación 1 a 1 con un eventual pago; nunca hay pagos
  parciales ni un pago cubriendo varias cuotas (constraint a nivel de
  service, no solo UI). Anulaciones de pago son un nuevo registro
  (`PaymentVoid`/estado `ANULADO`), nunca un `DELETE`.
- **Soft delete**: `Student`, `Payment`, `Grade`, `Attendance`, `Document`,
  `Suspension` usan un campo `status`/`deletedAt` en vez de borrado físico.
- **`AuditLog`** genérico: `userId`, `action`, `entity`, `entityId`,
  `before` (JSON), `after` (JSON), `createdAt`.

## 4. Estructura de carpetas

```
healthacademy/
├── prisma/
│   ├── schema.prisma
│   └── seed/
│       ├── index.ts
│       ├── factories/           # generadores fake (faker.js)
│       └── scenarios/           # casos de demo (sección 51)
├── src/
│   ├── app/
│   │   ├── (auth)/login/
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── alumnas/[studentId]/(tabs)/...
│   │   │   ├── materias/
│   │   │   ├── pagos/
│   │   │   ├── practicas/
│   │   │   ├── tesinas/
│   │   │   ├── reportes/
│   │   │   └── configuracion/
│   │   └── api/                 # route handlers (webhooks, exports)
│   ├── server/
│   │   ├── domain/              # reglas puras: promotion, attendance, tuition
│   │   ├── services/            # orquestan domain + prisma + audit
│   │   ├── auth/                # auth.ts, permissions.ts
│   │   └── storage/             # StorageProvider (local/s3)
│   ├── components/
│   │   ├── ui/                  # botones, inputs, badges, tabs, modal...
│   │   └── features/
│   ├── lib/                     # zod schemas, utils, config constants keys
│   └── types/
├── tests/
│   ├── unit/
│   └── e2e/
└── ARCHITECTURE.md
```

## 5. Autenticación

- Auth.js con **Credentials provider**: email + password (bcrypt, cost 12).
- Sesión **JWT** (stateless) con `userId`, `role`, `institutionId`.
- Middleware (`middleware.ts`) protege todas las rutas de `(app)/*`,
  redirige a `/login` si no hay sesión.
- Cada Server Action / Route Handler vuelve a resolver la sesión server-side
  y valida permiso — **nunca confía en que el middleware ya filtró**, porque
  un handler puede invocarse directo.
- Passwords nunca en texto plano ni en logs; reseteo por admin genera
  temporal + forced change.

## 6. Roles y permisos

Modelo **Role → Permission** (no roles hardcodeados en `if`), para poder
agregar "Docente" en el futuro sin tocar código, solo datos:

| Rol | Permisos (resumen) |
|---|---|
| **Administrador** | `*` (todo) |
| **Secretaría** | `student:read/write`, `document:read/write`, `payment:read/write`, `academic:read` |
| **Coordinador académico** | `subject:read/write`, `evaluation:read/write`, `grade:write`, `attendance:write`, `assignment:write`, `internship:write`, `thesis:write` |
| **Docente** (futuro) | `attendance:write` (propias comisiones), `grade:write` (propias materias) |

Verificación: helper `can(session, "payment:write")` usado en cada Server
Action, **antes** de tocar Prisma. La UI oculta botones según el mismo
mapa, pero eso es cosmético — la fuente de verdad es el chequeo server-side.
Un intento de acceder a `/alumnas/123` sin permiso o cambiando el ID en la
URL se resuelve en el service (`getStudentOr403`), no en el router.

## 7. Reglas de negocio (dónde viven)

Todas en `src/server/domain/*` como funciones puras + tests, leídas desde
`InstitutionConfig` (nunca constantes hardcodeadas):

- `attendance.ts` → `calculateAttendance(sessions[]) → { percentage, meetsMinimum }`, mínimo configurable (default 80%).
- `promotion.ts` → `evaluatePromotion(subject, grades[], assignmentsOk, attendance) → { result, reasons[] }`, motor genérico dirigido por el `EvaluationTemplate` de la materia (no asume "dos parciales").
- `tuition.ts` → `calculateTuitionStatus(tuition, today, config) → { status, surcharge, total }`, día de vencimiento/recargo/día crítico configurables.
- `financialStatus.ts` → agrega estado financiero de una alumna a partir de sus cuotas.
- `suspension.ts` → decide si el día crítico dispara alerta o suspensión automática según config institucional (por defecto: solo alerta, la suspensión es manual).

## 8. Flujos principales

`Dashboard → Alumnas → Buscar → Legajo → Resumen → (tabs con contexto
persistente de la alumna)`. Cada tab del legajo comparte el mismo layout
(`app/(app)/alumnas/[studentId]/layout.tsx`) para no perder contexto ni
recargar el encabezado.

Acciones rápidas (pago, documento, nota, asistencia) se resuelven en
**modales** desde el propio legajo, sin navegar al módulo global.

## 9. Dashboard

RSC que agrega, en paralelo, los indicadores (Server Actions ejecutando
queries agregadas — `count`/`groupBy` de Prisma, no cargar todo en memoria).
Cada card de indicador es un link a `/alumnas?filter=...` con el filtro
correspondiente pre-aplicado vía querystring — clic en "15 cuotas vencidas"
navega a la tabla ya filtrada, no abre un modal genérico.

## 10. Legajo

Header fijo (foto, nombre, DNI, legajo, carrera, año, comisión, estado) +
tabs (`Resumen, Datos, Documentación, Materias, Notas, Asistencia, TPs,
Pagos, Prácticas, Tesina, Historial`). El tab "Resumen" pre-calcula (server)
documentación completa/incompleta, estado financiero, asistencia general y
situación académica reutilizando los mismos services del dashboard —
**una sola fuente de verdad para "¿esta alumna está bien?"**.

## 11. Plan de implementación (fases)

Fase 1 (este documento + scaffold + schema + auth) → Fase 2 (roles/permisos)
→ Fase 3 (alumnas/legajos/documentación) → Fase 4 (carreras/materias/
comisiones) → Fase 5 (asistencia/evaluaciones/notas) → Fase 6 (promoción) →
Fase 7 (cuotas/pagos/morosidad) → Fase 8 (suspensiones) → Fase 9 (prácticas/
tesina) → Fase 10 (dashboard/reportes) → Fase 11 (auditoría/testing/
seguridad). Cada fase se implementa completa y funcional antes de avanzar.

## 12. Testing

- **Vitest** sobre `src/server/domain/*`: casos de la sección 54 (promoción,
  asistencia límite 80%, TP faltante, recuperatorio) y sección 67 (pagos:
  antes/después del día 10, recargo, rechazo de pago parcial/múltiple).
- **Vitest** sobre `src/server/auth/permissions.ts`: matriz rol×acción.
- **Playwright** E2E sobre flujos críticos: login, búsqueda global, registrar
  pago, ver legajo.

## 13. Almacenamiento de documentos

`StorageProvider` interface (`save`, `getUrl`, `delete`) con dos
implementaciones: `LocalStorageProvider` (dev, `./storage` fuera del
repo/`public`) y `S3StorageProvider` (prod, cualquier S3-compatible). La
tabla `Document`/`StudentFile` guarda `storageKey` + `provider`, nunca el
binario. Acceso a archivos vía Route Handler que revalida sesión/permiso
antes de servir/firmar URL — no se sirven directo desde `/public`.

## 14. Backups

Responsabilidad de infraestructura, no de la app: `pg_dump` diario
automatizado (cron/servicio gestionado) + retención 30 días, y el bucket de
storage con versionado activado si el proveedor lo permite. La app expone
únicamente `AuditLog` como red de seguridad para reconstrucción de eventos,
no reemplaza el backup de base.

## 15. Seed de datos ficticios

`prisma/seed/index.ts` orquesta factories (`@faker-js/faker`, locale
`es_AR` cuando exista, con nombres/apellidos argentinos ficticios) para
generar ~300 alumnas distribuidas según la sección 50, más los 6 casos de
demo explícitos de la sección 51 (Perfecto, Morosidad, Documentación,
Académico, Recuperatorio, Egresada) con IDs predecibles para poder
referenciarlos en tests/E2E. Reseteo: `npm run db:reset` (`prisma migrate
reset` + seed).

## 16. Resumen de decisiones que priorizan flexibilidad futura

- Multi-institución y multi-carrera desde el modelo, aunque el seed sea
  una sola institución.
- Reglas académicas y financieras 100% configurables en base, no en código.
- Motor de evaluación/promoción genérico por `EvaluationTemplate`, no
  hardcodeado a "dos parciales".
- Métodos de pago como tabla (`PaymentMethod`), no enum cerrado — agregar
  Mercado Pago/tarjetas es una fila nueva, no un release.
- Storage abstraído para migrar de local a cloud sin tocar dominio.
