---
project: cook.it
context_type: greenfield
product_type: web-app
target_scale:
  users: medium
  qps: low
  data_volume: small
created: 2026-05-19
updated: 2026-05-19
timeline_budget:
  mvp_weeks: 3
  hard_deadline: 2026-06-19
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: primary persona
      decision: Rodzic planujący domowe posiłki dla rodziny.
    - topic: pain category
      decision: Decision paralysis plus workflow friction from scattered recipes.
    - topic: core insight
      decision: Value comes from fast retrieval and building a sensible meal plan, not only storing recipes.
    - topic: auth strategy
      decision: OAuth login for MVP.
    - topic: role model
      decision: Flat user model with no role separation in MVP.
    - topic: MVP scope
      decision: Scope down to manual or copy-paste recipe entry plus metadata verification and search.
    - topic: timeline budget
      decision: Scoped MVP fits into 3 weeks of after-hours work.
    - topic: business logic rule
      decision: Translate user intent into taxonomy set and return best-matching recipes.
    - topic: key quality targets
      decision: Fast search response, high top-3 selection rate, and quick manual recipe entry.
    - topic: product type
      decision: Website or web app.
    - topic: target scale
      decision: Dozens to a hundred users.
    - topic: timeline framing
      decision: Hard deadline 2026-06-19, after-hours only.
    - topic: non-goals scope lock
      decision: Exclude URL import, YouTube parsing, sharing, advanced profile, image file storage, and advanced AI generation from MVP.
  frs_drafted: 5
  quality_check_status: accepted
---

## Vision & Problem Statement

Rodzic planujący domowe posiłki dla rodziny ma problem z szybkim ułożeniem różnorodnego menu na kilka dni do przodu, gdy chce oprzeć się na własnych, sprawdzonych przepisach. Dzisiaj przepisy są rozproszone po różnych miejscach, więc samo przypomnienie sobie dobrych opcji i przygotowanie zakupów kosztuje czas i zwiększa ryzyko monotonii.

Wartość produktu nie polega tylko na przechowywaniu przepisów, ale na ich szybkim odnajdywaniu i układaniu w sensowne menu na kolejne dni.

## User & Persona

### Primary persona

Rodzic planujący domowe posiłki dla rodziny. Najczęściej sięga po produkt wtedy, gdy chce zaplanować jedzenie i zakupy na kilka dni do przodu, uniknąć powtarzalności i oprzeć decyzje na wcześniej sprawdzonych przepisach.

## Access Control

Użytkownik loguje się do swojego konta przez OAuth. W MVP obowiązuje płaski model użytkownika: każdy zalogowany użytkownik ma ten sam zakres możliwości i widzi wyłącznie własne przepisy oraz własne plany posiłków.

## Success Criteria

### Primary

- Zalogowany użytkownik może dodać własne przepisy ręcznie lub metodą kopiuj-wklej, uzupełnić ich podstawowe metadane i następnie skutecznie odnaleźć interesujący przepis po taksonomii lub składniku.

### Secondary

- Dodawanie przepisu może być wspierane przez AI sugerujące odpowiednie metadane i taksonomie oraz ograniczające powstawanie bliskoznacznych duplikatów.

### Guardrails

- Dodawanie przepisu musi pozostać proste i szybkie, bez rozbudowanego procesu wypełniania formularza.
- Wyniki wyszukiwania muszą być użyteczne, a autocomplete ma pomagać w trafnym zawężaniu przepisów.

## User Stories

### US-01: Wyszukanie przepisu po taksonomii i składniku

- **Given** użytkownik jest zalogowany i ma utworzoną bazę przepisów
- **When** wpisuje lub wybiera z autocomplete zapytanie „kuchnia grecka, owoce morza”
- **Then** otrzymuje grupę kilku przepisów pochodzących z kuchni greckiej, w których występują owoce morza

#### Acceptance Criteria

- Wyniki zawierają wyłącznie przepisy spełniające oba warunki zapytania.
- Każdy wynik pokazuje co najmniej tytuł, krótki lead i opcjonalne zdjęcie.
- Użytkownik może otworzyć wynik i zobaczyć pełną treść przepisu.

## Functional Requirements

- FR-001: User can add a recipe. Priority: must-have
  > Socrates: Counter-argument considered: "No counter-argument; it stands as written."
  > Resolution: kept in MVP.
- FR-002: User can edit and delete a recipe. Priority: must-have
  > Socrates: Counter-argument considered: "No counter-argument; it stands as written."
  > Resolution: kept in MVP.
- FR-003: User can add taxonomy metadata to a recipe. Priority: must-have
  > Socrates: Counter-argument considered: "No counter-argument; it stands as written."
  > Resolution: kept in MVP.
- FR-004: User can search recipes with autocomplete. Priority: must-have
  > Socrates: Counter-argument considered: "No counter-argument; it stands as written."
  > Resolution: kept in MVP.
- FR-005: User can view search results in a sticky-note-like card list and open a full recipe details view. Priority: must-have
  > Socrates: Counter-argument considered: "No counter-argument; it stands as written."
  > Resolution: kept in MVP.

## Business Logic

System tłumaczy intencję użytkownika (np. ochotę lub składnik sezonowy) na zestaw taksonomii i zwraca przepisy najlepiej dopasowane do tej intencji.

Reguła bierze jako wejście zapytanie użytkownika wyrażone naturalnie (np. kuchnia, typ dania, składnik) i mapuje je na kryteria wyszukiwania receptur z bazy użytkownika.

Wynik działania reguły to lista przepisów spełniających intencję, którą użytkownik otrzymuje w postaci wyników możliwych do szybkiego przejrzenia i otwarcia.

Przykładowe przejścia wejście-wynik: „kuchnia włoska, pomidory” prowadzi do przepisów zgodnych z kuchnią i składnikiem; „pasta” prowadzi do wariantów makaronowych; „kurczak” prowadzi do dań, w których kurczak jest kluczowym składnikiem.

## Non-Functional Requirements

- Użytkownik widzi pierwsze wyniki wyszukiwania w <= 1.5 s dla 95% zapytań.
- Co najmniej 90% zapytań testowych kończy się kliknięciem jednego z 3 pierwszych wyników.
- Dodanie przepisu ręcznie (bez zdjęcia) zajmuje <= 90 s dla 80% prób.

## Non-Goals

- MVP nie obejmuje importu przepisów z URL-i webowych, aby utrzymać mały zakres pierwszego wydania.
- MVP nie obejmuje parsowania przepisów z YouTube, bo integracje wideo zwiększają koszt i ryzyko opóźnienia.
- MVP nie obejmuje udostępniania przepisów innym użytkownikom; zakres pozostaje single-user per account.
- MVP nie obejmuje zaawansowanego profilu użytkownika; wystarcza proste konto.
- MVP nie obejmuje hostowania plików graficznych użytkownika; dopuszczalny jest jedynie link do zdjęcia.
- MVP nie obejmuje zaawansowanego generowania przepisów przez AI ani rozbudowanego ingestu treści.

## Quality cross-check

- Access Control: present.
- Business Logic: present.
- Project artifacts: present.
- Timeline-cost ack: present.
- Non-Goals: present.
- Preserved behavior: n/a (greenfield).
