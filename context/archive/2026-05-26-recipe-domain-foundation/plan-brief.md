# Recipe Domain Foundation (F-01) — Plan Brief

> Full plan: `context/changes/recipe-domain-foundation/plan.md`

## What & Why

Wdrażamy fundament domeny przepisów dla cook.it: model danych recipe/taxonomy, ownership użytkownika oraz minimalną warstwę service. Celem jest odblokowanie S-01 bez ryzyka późniejszych kosztownych zmian w bezpieczeństwie i integralności danych.

## Starting Point

Repo ma gotowy auth stack i middleware z kontekstem usera, ale nie ma jeszcze żadnej domeny recipe/taxonomy, migracji ani kontraktów typów pod ten obszar. API i quality gates istnieją, lecz działają dziś tylko wokół auth.

## Desired End State

Po zakończeniu F-01 baza danych ma gotowe tabele i relacje recipe/taxonomy, RLS egzekwuje dostęp wyłącznie do własnych danych użytkownika, a service layer zapewnia stabilne kontrakty dla następnego kroku (S-01). Fundament jest zweryfikowany i gotowy do implementacji kolejnego slice bez dodatkowych decyzji architektonicznych.

## Key Decisions Made

| Decision          | Choice                                        | Why (1 sentence)                                                           |
| ----------------- | --------------------------------------------- | -------------------------------------------------------------------------- |
| Zakres F-01       | Model danych + minimalny service layer        | Odblokowuje S-01 bez mieszania fundamentu z pełnym feature API.            |
| Priorytet jakości | Ownership + RLS + integralność relacji        | To najwyższe ryzyko kosztownego reworku, więc musi być domknięte najpierw. |
| Model taksonomii  | Osobna encja taxonomy + tabela łącząca        | Daje trwałą bazę pod FR-003 i filtrowanie/autocomplete w S-02.             |
| Usuwanie taxonomy | Blokada usunięcia przy aktywnych powiązaniach | Chroni przed utratą spójności klasyfikacji przepisów.                      |
| Kontrakt błędów   | Ujednolicone błędy JSON/domenowe              | Stabilizuje integrację service/API i upraszcza obsługę kolejnych slice'ów. |
| Rollout migracji  | Małe, sekwencyjne migracje                    | Ułatwia rollback i bezpieczne wdrażanie po godzinach.                      |

## Scope

**In scope:**

- Schema recipe/taxonomy + relacja wiele-do-wielu
- RLS/policies dla ownership i bezpieczeństwa danych
- Minimalne indeksy pod ownership i taxonomy
- Typy domenowe i podstawowa warstwa service

**Out of scope:**

- Pełne endpointy feature i UI dla recipe
- Logika autocomplete/ranking wyszukiwania
- Integracje poza MVP (URL import, YouTube, sharing)

## Architecture / Approach

Podejście trójfazowe: najpierw baza i polityki dostępu, następnie kontrakty domenowe i service layer, na końcu walidacja gotowości handoff do S-01. Strategia minimalizuje ryzyko bezpieczeństwa i utrzymuje mały, kontrolowany zakres.

## Phases at a Glance

| Phase                                            | What it delivers                             | Key risk                                            |
| ------------------------------------------------ | -------------------------------------------- | --------------------------------------------------- |
| 1. Schema, Ownership and RLS Foundation          | Tabele, relacje, RLS, indeksy                | Błędna polityka dostępu lub niespójne constrainty   |
| 2. Domain Contracts and Service Layer            | src/types.ts + recipe service + model błędów | Niestabilny kontrakt między service i przyszłym API |
| 3. Foundation Verification and Handoff Readiness | Potwierdzona gotowość fundamentu do S-01     | Niedomknięte decyzje ukryte w implementacji         |

**Prerequisites:** działające środowisko Supabase lokalnie, uprawnienia do migracji, aktywne quality gates (lint/build).
**Estimated effort:** ~2-3 sesje pracy rozłożone na 3 fazy.

## Open Risks & Assumptions

- Założenie: RLS oparty o user ownership jest wystarczający dla flat modelu użytkownika z PRD.
- Ryzyko: brak dedykowanego test runnera może wymagać większej dyscypliny manualnej weryfikacji.

## Success Criteria (Summary)

- Fundament danych recipe/taxonomy jest wdrożony i odtwarzalny migracjami.
- Użytkownik ma dostęp wyłącznie do własnych rekordów zgodnie z Access Control.
- S-01 może startować bez dodatkowych decyzji architektonicznych dotyczących modelu domeny.
