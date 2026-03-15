#!/bin/bash
# =============================================================================
# setup-repo.sh — Inicializa el historial de git del repo medtrack-refactoring
#
# USO:
#   1. Abre esta carpeta en VS Code o en tu terminal
#   2. Asegúrate de estar DENTRO de la carpeta medtrack-refactoring/
#   3. Ejecuta:  bash setup-repo.sh
#   4. Después sube a GitHub:
#        git remote add origin https://github.com/TU_USUARIO/medtrack-refactoring.git
#        git push -u origin main
# =============================================================================

set -e  # salir si hay cualquier error

echo "🔧 Inicializando repositorio medtrack-refactoring..."
echo ""

# Configura git si no está configurado globalmente
git config user.name "Iago Moure Pazos" 2>/dev/null || true
git config user.email "i40130@gmail.com" 2>/dev/null || true

# Inicializar repo
git init
git checkout -b main

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 1 — Estructura base del proyecto
# ─────────────────────────────────────────────────────────────────────────────
echo "📦 Commit 1/14: estructura base..."
git add .gitignore package.json tsconfig.json jest.config.js
git commit -m "chore: init project structure

- package.json con dependencias Jest + ts-jest
- tsconfig.json con strict mode habilitado
- jest.config.js configurado para tests TypeScript
- .gitignore estándar para Node/TypeScript"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 2 — README con contexto del TFG
# ─────────────────────────────────────────────────────────────────────────────
echo "📖 Commit 2/14: README con descripción del proyecto..."
git add README.md
git commit -m "docs: add README with OE6 refactoring scope and structure

Documenta las 3 refactorizaciones GoF (Adapter/Repository, Command, Builder)
con descripción del problema, solución aplicada y ejemplos de uso.
Incluye instrucciones para ejecutar tests y referencias bibliográficas."

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 3 — Código BEFORE de R1 (God Object original)
# ─────────────────────────────────────────────────────────────────────────────
echo "🔍 Commit 3/14: R1 - código original del PoC (God Object)..."
git add R1-adapter-repository/before/
git commit -m "feat(R1): add original PoC code showing God Object antipattern

Extracto real de src/lib/supabase.ts del PoC:
- Objeto supabaseUtils con todas las operaciones de todos los dominios
- 854 lineas en el fichero original, sin separacion de responsabilidades
- signIn, signOut, getAllMedications, addMedication, getBloodPressure,
  getWeightRecords, getCurrentReport, syncLocalData (stub vacio)
Code smell identificado: God Class (Fowler, 1999)"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 4 — Interfaz MedicationRepository
# ─────────────────────────────────────────────────────────────────────────────
echo "🏗️  Commit 4/14: R1 - interfaz MedicationRepository..."
git add R1-adapter-repository/after/MedicationRepository.ts
git commit -m "feat(R1): define MedicationRepository interface (port)

Interfaz de repositorio para el dominio de medicacion:
- getAll, getById, create, update, delete, getByStatus
- Desacopla la logica de negocio de la tecnologia de persistencia
- Aplica Dependency Inversion Principle (Martin, 2003)
- Habilita la sustitucion de Supabase sin modificar el dominio"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 5 — Adaptador concreto Supabase
# ─────────────────────────────────────────────────────────────────────────────
echo "🔌 Commit 5/14: R1 - adaptador SupabaseMedicationRepository..."
git add R1-adapter-repository/after/SupabaseMedicationRepository.ts
git commit -m "feat(R1): implement SupabaseMedicationRepository adapter

Adaptador concreto que implementa MedicationRepository:
- Encapsula todas las llamadas a supabase.from('medications')
- Errores tipados con RepositoryError (codigo + mensaje)
- Metodos: getAll, getById, create, update, delete, getByStatus
- Patron Adapter (Gamma et al., 1994) + Repository (Fowler, 2002)"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 6 — Hook refactorizado
# ─────────────────────────────────────────────────────────────────────────────
echo "🪝 Commit 6/14: R1 - hook useMedications desacoplado..."
git add R1-adapter-repository/after/useMedications.ts
git commit -m "feat(R1): refactor useMedications hook to depend on interface

Hook de negocio que consume MedicationRepository por inyeccion:
- Recibe repo como parametro (inyeccion de dependencias)
- Sin importacion directa de supabase ni supabaseUtils
- loadMedications, addMedication, updateMedication, deleteMedication
- Compatible con cualquier implementacion de la interfaz (mock, REST, etc.)"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 7 — Tests R1
# ─────────────────────────────────────────────────────────────────────────────
echo "🧪 Commit 7/14: tests para R1 (Adapter/Repository)..."
git add tests/useMedications.test.ts
git commit -m "test(R1): add unit tests for repository decoupling

2 tests unitarios que verifican el patron Adapter/Repository:
- Test 1: carga medicaciones sin depender de Supabase (mock del repo)
- Test 2: crea medicacion mediante interfaz de repositorio
Valida que el hook NO importa Supabase directamente (desacoplamiento real)"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 8 — Código BEFORE de R2 (cola de sync sin tipado)
# ─────────────────────────────────────────────────────────────────────────────
echo "🔍 Commit 8/14: R2 - código original del PoC (cola de sync sin tipado)..."
git add R2-command-sync/before/
git commit -m "feat(R2): add original PoC code showing untyped syncQueue

Extracto real de src/lib/db.ts del PoC:
- addToSyncQueue con entity: string as any, payload: any
- Sin logica de reintento ni operacion de deshacer
- markDoseAsTaken encola directamente sin validacion
- syncLocalData() en supabase.ts es stub vacio (solo console.log)
Code smell: Untyped operations, no retry, no idempotencia"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 9 — Interfaz SyncCommand + tipos
# ─────────────────────────────────────────────────────────────────────────────
echo "📋 Commit 9/14: R2 - interfaz SyncCommand..."
git add R2-command-sync/after/SyncCommand.ts
git commit -m "feat(R2): define SyncCommand interface and SyncStatus type

Contrato tipado para comandos de sincronizacion offline:
- SyncStatus: pending | syncing | synced | failed | conflict
- SyncCommand<T>: id, entity, entityId, payload, status, retryCount
- Metodos: execute(), undo(), canRetry(), toQueueEntry()
Patron Command (Gamma et al., 1994, pp. 233-242)"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 10 — ConfirmDoseCommand + SyncQueueProcessor
# ─────────────────────────────────────────────────────────────────────────────
echo "⚡ Commit 10/14: R2 - ConfirmDoseCommand y SyncQueueProcessor..."
git add R2-command-sync/after/ConfirmDoseCommand.ts R2-command-sync/after/SyncQueueProcessor.ts
git commit -m "feat(R2): implement ConfirmDoseCommand and SyncQueueProcessor

ConfirmDoseCommand:
- execute(): upsert idempotente con idempotency_key (UUID v4)
- undo(): revierte la toma de dosis en Supabase
- canRetry(): hasta maxRetries=3 intentos ante fallos de red
- Estado: pending -> syncing -> synced | failed

SyncQueueProcessor:
- enqueue(): agrega comandos a la cola
- processAll(): ejecuta pendientes, gestiona reintentos
- undoLast(): deshace el ultimo comando encolado
- getPending(): lista de comandos sin procesar"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 11 — Tests R2
# ─────────────────────────────────────────────────────────────────────────────
echo "🧪 Commit 11/14: tests para R2 (Command)..."
git add tests/ConfirmDoseCommand.test.ts
git commit -m "test(R2): add unit tests for Command pattern and retry logic

2 tests unitarios que verifican el patron Command:
- Test 1: ejecuta confirmacion de dosis -> estado synced
- Test 2: reintenta comandos fallidos hasta maxRetries -> estado failed
Mockea supabase client para tests unitarios sin dependencias externas"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 12 — Código BEFORE de R3 + tipos de dominio
# ─────────────────────────────────────────────────────────────────────────────
echo "🔍 Commit 12/14: R3 - código original + tipos DosingRule..."
git add R3-builder-dosing/before/
git add R3-builder-dosing/after/DosingRule.ts
git commit -m "feat(R3): add PoC before-code and define typed DosingRule domain

Antes (PoC): dosing_rule: any en MedicationCycle, sin validacion,
logica de ciclos dispersa entre hook y llamadas directas a Supabase.
Code smell: Feature Envy (Fowler, 1999)

Tipos de dominio definidos:
- FrequencyUnit: hours | daily | weekly
- CyclePhase: treatment | rest | evaluation
- DosingRule, CycleConfig, MedicationSchedule, SchedulePhase
Elimina todos los campos 'any' con tipos estrictos en compilacion"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 13 — MedicationScheduleBuilder
# ─────────────────────────────────────────────────────────────────────────────
echo "🏗️  Commit 13/14: R3 - MedicationScheduleBuilder..."
git add R3-builder-dosing/after/MedicationScheduleBuilder.ts
git commit -m "feat(R3): implement MedicationScheduleBuilder with fluent API

Builder para construccion de posologias oncologicas complejas:
- forMedication(), forPatient(), startingOn() - campos obligatorios
- withFrequency(), withDailyDoses(), takeWithFood() - regla de dosificacion
- withCycles(treatDays, restDays, total) - protocolo de ciclos
- withDoseAdjustment(percent) - ajuste por toxicidad
- build(): valida y genera MedicationSchedule con fases calculadas
- generatePhases(): calcula automaticamente fases treatment/rest

Ejemplo protocolo quimioterapia 21+7 con 6 ciclos:
  builder.withCycles(21, 7, 6).build() -> 12 fases generadas"

# ─────────────────────────────────────────────────────────────────────────────
# COMMIT 14 — Tests R3 + cierre
# ─────────────────────────────────────────────────────────────────────────────
echo "🧪 Commit 14/14: tests R3 + limpieza final..."
git add tests/MedicationScheduleBuilder.test.ts
git commit -m "test(R3): add unit tests for Builder and final cleanup

4 tests unitarios que verifican el patron Builder:
- Test 1: construye protocolo quimioterapia 21+7 con 6 ciclos (12 fases)
- Test 2: lanza error si falta frecuencia de dosificacion
- Test 3: lanza error si faltan campos obligatorios
- Test 4: construye posologia simple sin ciclos (endDate null)

6 tests R1 + R2 + 4 tests R3 = 8 tests totales en 3 suites
Todas las validaciones OE6 cubiertas: problema, solucion, 2 tests/mejora"

echo ""
echo "✅ Historial de commits creado correctamente (14 commits)"
echo ""
echo "📊 Resumen del repo:"
git log --oneline
echo ""
echo "────────────────────────────────────────────────────────"
echo "🚀 SIGUIENTE PASO — Subir a GitHub:"
echo ""
echo "  1. Crea un repo PÚBLICO en github.com (sin inicializar)"
echo "     Nombre sugerido: medtrack-refactoring"
echo ""
echo "  2. Ejecuta en esta misma terminal:"
echo "     git remote add origin https://github.com/i40130/medtrack-refactoring.git"
echo "     git push -u origin main"
echo ""
echo "  3. Verifica en GitHub que aparecen los 14 commits y todos los ficheros"
echo "────────────────────────────────────────────────────────"
