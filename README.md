# MedTrack — Refactorización mediante Patrones de Diseño GoF

Repositorio público asociado al Trabajo Fin de Grado:

> **Ingeniería inversa y reingeniería de una PWA para oncología domiciliaria:
> de solución personal a plataforma con arquitectura escalable**
>
> Grado en Ingeniería Informática — Universidad Internacional de La Rioja (UNIR)
> Autor: Iago Moure Pazos

---

## Descripción

Este repositorio documenta las tres refactorizaciones implementadas como parte del
**Objetivo Específico OE6** del TFG, aplicando patrones de diseño GoF (Gamma et al., 1994)
al código del PoC de MedTrack para alinearlo con la arquitectura TO-BE diseñada.

Cada refactorización incluye:
- Código original del PoC (BEFORE) — extracto real del repositorio privado
- Código refactorizado (AFTER) — implementación del patrón
- Tests unitarios que verifican el comportamiento correcto

---

## Estructura del repositorio

```
medtrack-refactoring/
├── R1-adapter-repository/
│   ├── before/
│   │   └── supabase.ts          # God Object original (854 líneas, todos los dominios)
│   └── after/
│       ├── MedicationRepository.ts        # Interfaz del repositorio
│       ├── SupabaseMedicationRepository.ts # Adaptador concreto
│       └── useMedications.ts              # Hook desacoplado
├── R2-command-sync/
│   ├── before/
│   │   └── db.ts                # Cola de sync sin tipado ni retry
│   └── after/
│       ├── SyncCommand.ts             # Interfaz Command
│       ├── ConfirmDoseCommand.ts      # Comando concreto
│       └── SyncQueueProcessor.ts     # Procesador de la cola
├── R3-builder-dosing/
│   ├── before/
│   │   └── useMedicationCycles.ts    # dosing_rule: any, lógica dispersa
│   └── after/
│       ├── DosingRule.ts                  # Tipos de dominio
│       └── MedicationScheduleBuilder.ts  # Builder con API fluida
├── tests/
│   ├── useMedications.test.ts      # Tests R1
│   ├── ConfirmDoseCommand.test.ts  # Tests R2
│   └── MedicationScheduleBuilder.test.ts # Tests R3
├── package.json
├── tsconfig.json
└── README.md
```

---

## Las 3 refactorizaciones

### R1 — Patrón Adapter / Repository (Estructural)

**Problema detectado:** `src/lib/supabase.ts` es un *God Object* de 854 líneas que
concentra en un único objeto literal (`supabaseUtils`) todas las operaciones de acceso
a datos de todos los dominios: autenticación, medicación, dosis, constantes vitales,
informes y sincronización. Este diseño viola el Principio de Responsabilidad Única
(SRP) y acopla directamente los hooks de negocio a la implementación concreta de Supabase.

**Solución aplicada:** Patrón Adapter materializado como Repository Pattern. Se definen
interfaces de repositorio por bounded context (`MedicationRepository`, `VitalsRepository`,
`DoseRepository`) y se implementan adaptadores concretos que encapsulan las llamadas
a Supabase. Los hooks consumen exclusivamente la interfaz.

```
MedicationRepository (interfaz)
    ↑ implements
SupabaseMedicationRepository  ←  supabase client
    ↑ depends via DI
useMedications (hook)
```

---

### R2 — Patrón Command (Comportamental)

**Problema detectado:** `src/lib/db.ts` implementa `addToSyncQueue` con objetos planos
sin tipado fuerte (`entity: string as any`, `payload: any`). No existe lógica de reintento,
ni operación de deshacer, ni validación. La función `syncLocalData()` en `supabase.ts`
es un stub vacío (`console.log` sin implementación).

**Solución aplicada:** Patrón Command. Cada operación de sincronización se encapsula
en un objeto tipado que implementa `SyncCommand` con métodos `execute()`, `undo()` y
`canRetry()`. El `SyncQueueProcessor` gestiona el ciclo de vida completo con reintentos
e idempotencia clínica.

```
SyncCommand (interfaz)
    ↑ implements
ConfirmDoseCommand / UpdateStockCommand / SaveVitalsCommand
    ↑ procesa
SyncQueueProcessor  →  pending → syncing → synced | failed | conflict
```

---

### R3 — Patrón Builder (Creacional)

**Problema detectado:** `src/hooks/useMedicationCycles.ts` define `MedicationCycle`
con `dosing_rule: any`, perdiendo toda garantía de tipo en compilación. La lógica de
construcción de protocolos oncológicos (tratamiento 21 días + descanso 7 días, ajuste
de dosis por toxicidad, múltiples ciclos) está dispersa entre el hook, los formularios
y las llamadas directas a Supabase.

**Solución aplicada:** Patrón Builder con API fluida. `MedicationScheduleBuilder`
expone métodos encadenables (`forMedication`, `withFrequency`, `withCycles`,
`withDoseAdjustment`, `build`) que construyen y validan el objeto `MedicationSchedule`
de forma incremental y tipada.

```typescript
// Protocolo quimioterapia estándar — 6 ciclos de 21+7 días
const schedule = new MedicationScheduleBuilder()
  .forMedication('med-tamoxifeno')
  .forPatient('patient-001')
  .startingOn('2025-07-01')
  .withFrequency(1, 'daily')
  .withDailyDoses(2, ['08:00', '20:00'])
  .takeWithFood(true)
  .withCycles(21, 7, 6)
  .build();
```

---

## Ejecutar los tests

```bash
# Instalar dependencias
npm install

# Ejecutar todos los tests
npm test

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar tests de una refactorización concreta
npm test -- useMedications
npm test -- ConfirmDoseCommand
npm test -- MedicationScheduleBuilder
```

---

## Resultados esperados

```
PASS  tests/useMedications.test.ts
  useMedications con Repository Pattern
    ✓ carga medicaciones sin depender de Supabase
    ✓ crea medicacion mediante interfaz de repositorio

PASS  tests/ConfirmDoseCommand.test.ts
  ConfirmDoseCommand
    ✓ ejecuta confirmacion de dosis y cambia estado a synced
    ✓ reintenta comandos fallidos hasta maxRetries

PASS  tests/MedicationScheduleBuilder.test.ts
  MedicationScheduleBuilder
    ✓ construye protocolo quimioterapia 21+7 con 6 ciclos
    ✓ lanza error si falta frecuencia de dosificacion
    ✓ lanza error si faltan campos obligatorios
    ✓ construye posologia simple sin ciclos

Test Suites: 3 passed, 3 total
Tests:       8 passed, 8 total
```

---


## Resultados obtendiso

```
 npm install
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me

added 280 packages, and audited 281 packages in 1s

34 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
❯ npm test

> medtrack-refactoring@1.0.0 test
> jest --config jest.config.js

 PASS  tests/ConfirmDoseCommand.test.ts
  ConfirmDoseCommand
    ✓ ejecuta confirmacion de dosis y cambia estado a synced (3 ms)
    ✓ reintenta comandos fallidos hasta maxRetries (5 ms)

 PASS  tests/MedicationScheduleBuilder.test.ts
  MedicationScheduleBuilder
    ✓ construye protocolo quimioterapia 21+7 con 6 ciclos (3 ms)
    ✓ lanza error si falta frecuencia de dosificacion (17 ms)
    ✓ lanza error si faltan campos obligatorios
    ✓ construye posologia simple sin ciclos (1 ms)

 PASS  tests/useMedications.test.ts
  useMedications con Repository Pattern
    ✓ carga medicaciones sin depender de Supabase (2 ms)
    ✓ crea medicacion mediante interfaz de repositorio (1 ms)

Test Suites: 3 passed, 3 total
Tests:       8 passed, 8 total
Snapshots:   0 total
Time:        1.495 s
Ran all test suites.
```

---

## Referencias

- Gamma, E., Helm, R., Johnson, R., & Vlissides, J. (1994). *Design Patterns: Elements
  of Reusable Object-Oriented Software*. Addison-Wesley.
- Fowler, M. (1999). *Refactoring: Improving the Design of Existing Code*. Addison-Wesley.
- Fowler, M. (2002). *Patterns of Enterprise Application Architecture*. Addison-Wesley.
- Martin, R. C. (2003). *Agile Software Development: Principles, Patterns, and Practices*.
  Prentice Hall.
- Martin, R. C. (2017). *Clean Architecture: A Craftsman's Guide to Software Structure
  and Design*. Prentice Hall.
