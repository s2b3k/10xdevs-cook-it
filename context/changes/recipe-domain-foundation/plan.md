# Recipe Domain Foundation (F-01) Implementation Plan

## Overview

Wdrażamy fundament domeny przepisów dla cook.it, który dostarcza minimalny model danych recipe + taxonomy z ownership per user, politykami RLS i podstawową warstwą usług. Celem jest bezpieczne odblokowanie S-01 bez wchodzenia jeszcze w pełny feature CRUD na poziomie UI.

## Current State Analysis

Repo ma gotową infrastrukturę auth i middleware (Supabase SSR, user w context.locals), ale nie ma jeszcze domeny recipe/taxonomy, migracji ani współdzielonych typów domenowych. Warstwa API istnieje tylko dla auth i pokazuje wzorzec route handlerów Astro.

## Desired End State

Po zakończeniu planu istnieje spójny fundament danych dla recipe i taxonomy z egzekwowaniem własności danych użytkownika przez RLS, podstawowymi indeksami i kontraktem usług domenowych gotowym do użycia w S-01. Weryfikacja końcowa potwierdza, że migracje działają, lint/build przechodzą, a kontrakt warstwy service obsługuje błędy w ujednolicony sposób.

### Key Discoveries:

- Middleware już ustala zalogowanego użytkownika i przypisuje go do kontekstu żądania: src/middleware.ts:1
- Wzorzec dostępu do Supabase po stronie serwera jest scentralizowany i gotowy do reuse: src/lib/supabase.ts:1
- Istniejący standard API oparty jest o uppercase exporty POST oraz redirect/error handling dla formularzy auth: src/pages/api/auth/signin.ts:1
- Brak obecnej warstwy domenowej i brak src/types.ts, więc kontrakty domenowe trzeba zdefiniować od zera.
- Repo ma rygor lint/build bez dedykowanego test runnera, więc plan musi opierać automatyczną weryfikację o istniejące quality gates: package.json:5

## What We're NOT Doing

- Nie implementujemy pełnych endpointów feature dla przepisów i taksonomii (to zakres S-01/S-02/S-03).
- Nie implementujemy autocomplete i logiki rankingowej wyszukiwania (to zakres S-02).
- Nie dodajemy importu z URL, YouTube ani funkcji współdzielenia przepisów (poza zakresem PRD MVP).
- Nie wdrażamy pełnej observability stack (metryki/alerting) w tym change.

## Implementation Approach

Podejście sekwencyjne: najpierw schema i polityki dostępu, potem kontrakty domenowe i minimalna warstwa service, na końcu walidacja odblokowania kolejnego slice. Zakres utrzymujemy celowo wąski, ale z mocnym naciskiem na ownership, RLS i integralność relacji, bo to najdroższe do poprawy po fakcie.

## Critical Implementation Details

### Timing & lifecycle

RLS i relacje muszą być wdrożone po utworzeniu tabel i constraintów, ale przed stabilizacją kontraktu service. W przeciwnym razie service może utrwalić zachowanie niezgodne z docelową polityką dostępu.

### State sequencing

Usuwanie taksonomii ma być blokowane przy istniejących powiązaniach recipe-taxonomy. To zachowanie powinno być egzekwowane na poziomie modelu danych i propagowane jako kontrolowany błąd domenowy w warstwie service.

## Phase 1: Schema, Ownership and RLS Foundation

### Overview

Tworzymy minimalny model danych recipe i taxonomy wraz z relacjami, indeksami oraz politykami RLS, tak aby własność danych była egzekwowana przez bazę.

### Changes Required:

#### 1. Domain schema migrations

**File**: `supabase/migrations/20260526110001_create_recipes.sql`

**Intent**: Dodać tabelę przepisów z kolumnami niezbędnymi pod FR-001 i ownership użytkownika.

**Contract**: Tabela recipes zawiera klucz główny, owner/user reference, pola treści przepisu i znaczniki czasu, z constraintami spójności wymaganymi dla dalszych relacji.

**File**: `supabase/migrations/20260526110002_create_taxonomy.sql`

**Intent**: Wprowadzić współdzieloną encję taxonomy jako bazę pod FR-003.

**Contract**: Tabela taxonomy przechowuje znormalizowane wartości klasyfikacji (minimum: identyfikator i nazwa, opcjonalnie kategoria), gotowe do relacji wiele-do-wielu.

**File**: `supabase/migrations/20260526110003_create_recipe_taxonomy.sql`

**Intent**: Zdefiniować relację recipe-taxonomy i integralność referencyjną.

**Contract**: Tabela łącząca utrzymuje unikalność par recipe_id + taxonomy_id i wymusza poprawność FK.

#### 2. Access policies and indexes

**File**: `supabase/migrations/20260526110004_enable_rls_and_policies.sql`

**Intent**: Włączyć i skonfigurować RLS dla danych zależnych od użytkownika.

**Contract**: Policies zezwalają użytkownikowi tylko na operacje na własnych rekordach recipes i powiązaniach recipe-taxonomy, bez przekroczenia granicy danych innych kont.

**File**: `supabase/migrations/20260526110005_add_core_indexes.sql`

**Intent**: Dodać minimalny zestaw indeksów pod ownership i filtrowanie taxonomy.

**Contract**: Indeksy pokrywają kluczowe ścieżki zapytań dla S-01 i przyszłego S-02 bez przedwczesnej, szerokiej optymalizacji.

### Success Criteria:

#### Automated Verification:

- Sekwencja migracji jest kompletna i uporządkowana po timestampach.
- Lokalne odtworzenie bazy z migracji kończy się sukcesem: `npx supabase db reset`.
- Lint przechodzi po zmianach: `npm run lint`.

#### Manual Verification:

- Potwierdzenie weryfikacji ownership: użytkownik A nie ma dostępu do rekordów użytkownika B.
- Próba usunięcia taxonomy z istniejącymi powiązaniami jest blokowana zgodnie z decyzją architektoniczną.

**Implementation Note**: Po zakończeniu tej fazy i przejściu automatycznej weryfikacji zatrzymaj się na bramce manualnej przed fazą 2.

---

## Phase 2: Domain Contracts and Service Layer

### Overview

Definiujemy współdzielone typy domenowe i minimalną warstwę service z ujednoliconym kontraktem błędów, gotową pod wykorzystanie w S-01.

### Changes Required:

#### 1. Shared domain types

**File**: `src/types.ts`

**Intent**: Wprowadzić typy domenowe dla Recipe, Taxonomy i relacji, aby kolejne warstwy miały jeden punkt prawdy.

**Contract**: Typy obejmują encje bazowe i minimalne DTO dla operacji create/read, bez wejścia w szczegóły UI.

#### 2. Recipe service contracts

**File**: `src/lib/services/recipe.service.ts`

**Intent**: Dostarczyć cienką warstwę operacji domenowych wymaganych do startu S-01.

**Contract**: Service udostępnia kontrakty funkcji dla create/list/update/delete recipe i operacji przypisywania taxonomy, a błędy mapuje do stabilnych kodów domenowych.

#### 3. Service error model

**File**: `src/lib/services/recipe.errors.ts`

**Intent**: Ujednolicić reprezentację błędów domenowych odseparowaną od surowych komunikatów providerów.

**Contract**: Stały zestaw typów/kodów błędów wykorzystywany przez service i przyszłe route handlery API.

### Success Criteria:

#### Automated Verification:

- Type-checking przechodzi dla nowych kontraktów typów i service: `npx astro sync`.
- Lint przechodzi dla nowych plików i importów: `npm run lint`.
- Build przechodzi po dodaniu warstwy service: `npm run build`.

#### Manual Verification:

- Przegląd kontraktów: typy i interfejsy service są jednoznaczne dla implementacji S-01.
- Przegląd błędów: przypadki naruszenia ownership i integrity zwracają kontrolowane błędy domenowe.

**Implementation Note**: Po zakończeniu tej fazy i automatycznej weryfikacji zatrzymaj się na bramce manualnej przed fazą 3.

---

## Phase 3: Foundation Verification and Handoff Readiness

### Overview

Domykamy F-01 jako gotowy fundament: porządkujemy handoff do S-01 i potwierdzamy, że change jest implementowalny bez otwartych decyzji.

### Changes Required:

#### 1. Handoff notes in change context

**File**: `context/changes/recipe-domain-foundation/change.md`

**Intent**: Utrwalić status planned/completed i kluczowe notatki handoff dla następnych kroków.

**Contract**: Zmieniony status oraz notatki zawierają jednoznaczny stan gotowości fundamentu dla `/10x-implement` i dla kolejnego planowania S-01.

#### 2. Optional migration readme

**File**: `supabase/migrations/README.md`

**Intent**: Opisać kolejność i cel nowych migracji, aby ograniczyć ryzyko błędnego uruchamiania przez kolejnych wykonawców.

**Contract**: Krótki opis sekwencji i zależności migracji F-01, bez duplikowania dokumentacji produktu.

### Success Criteria:

#### Automated Verification:

- Końcowa walidacja quality gates przechodzi: `npm run lint` oraz `npm run build`.
- Historia migracji jest deterministyczna i gotowa do uruchomienia w clean env.

#### Manual Verification:

- Handoff do S-01 jest czytelny: wiadomo, które kontrakty są stabilne i co jest poza zakresem F-01.
- Potwierdzenie, że F-01 nie zawiera ukrytych decyzji blokujących start S-01.

**Implementation Note**: Po zakończeniu tej fazy i automatycznej weryfikacji zatrzymaj się na finalnej bramce manualnej.

---

## Testing Strategy

### Unit Tests:

- Dla warstwy service: mapowanie błędów domenowych dla naruszeń ownership i integrity.
- Dla kontraktów typów: zgodność minimalnych DTO z wejściami service.

### Integration Tests:

- Scenariusz użytkownika A i B na tych samych endpointach/operacjach service z potwierdzeniem izolacji danych.
- Scenariusz dodania recipe i przypięcia taxonomy z poprawną integralnością relacji.

### Manual Testing Steps:

1. Uruchomić czyste odtworzenie bazy i przejść przez sekwencję migracji.
2. Zweryfikować ręcznie ograniczenia RLS na dwóch kontach testowych.
3. Zweryfikować blokadę usunięcia taxonomy z aktywnymi powiązaniami.

## Performance Considerations

- Skupiamy się na minimalnych indeksach pod ownership i filtrowanie taxonomy; pełna optymalizacja wyszukiwania należy do S-02.
- Brak ciężkich optymalizacji przed potwierdzeniem podstawowego flow domenowego.

## Migration Notes

- Migracje dzielimy na małe, sekwencyjne kroki (schema -> RLS/policies -> indeksy).
- Rollback realizujemy na poziomie pojedynczych kroków migracji, unikając jednej dużej, trudnej do odwrócenia zmiany.

## References

- Roadmap context: `context/foundation/roadmap.md`
- Product requirements: `context/foundation/prd.md`
- Auth and ownership context: `src/middleware.ts:1`
- Supabase SSR pattern: `src/lib/supabase.ts:1`
- API route convention: `src/pages/api/auth/signin.ts:1`
- Quality gates and scripts: `package.json:5`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Schema, Ownership and RLS Foundation

#### Automated

- [x] 1.1 Sekwencja migracji jest kompletna i uporządkowana po timestampach — deb0a5c
- [x] 1.2 Lokalne odtworzenie bazy z migracji kończy się sukcesem (`npx supabase db reset`) — deb0a5c
- [x] 1.3 Lint przechodzi po zmianach (`npm run lint`) — deb0a5c

#### Manual

- [x] 1.4 Ownership działa: użytkownik A nie ma dostępu do rekordów użytkownika B
- [x] 1.5 Usunięcie taxonomy z istniejącymi powiązaniami jest blokowane

### Phase 2: Domain Contracts and Service Layer

#### Automated

- [x] 2.1 Type-checking przechodzi dla nowych kontraktów (`npx astro sync`)
- [x] 2.2 Lint przechodzi dla nowych plików i importów (`npm run lint`)
- [x] 2.3 Build przechodzi po dodaniu warstwy service (`npm run build`)

#### Manual

- [x] 2.4 Kontrakty typów i service są jednoznaczne dla implementacji S-01
- [x] 2.5 Naruszenia ownership i integrity zwracają kontrolowane błędy domenowe

### Phase 3: Foundation Verification and Handoff Readiness

#### Automated

- [ ] 3.1 Końcowa walidacja quality gates przechodzi (`npm run lint` i `npm run build`)
- [x] 3.2 Historia migracji jest deterministyczna i gotowa do clean env

#### Manual

- [ ] 3.3 Handoff do S-01 jest czytelny i jednoznaczny
- [ ] 3.4 Brak ukrytych decyzji blokujących start S-01
