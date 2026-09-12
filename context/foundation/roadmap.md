---
project: cook.it
version: 1
status: draft
created: 2026-05-26
updated: 2026-05-26
prd_version: 1
main_goal: speed
top_blocker: capacity
---

# Roadmap: cook.it

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

Cook.it ma skracac droge od rozproszonych przepisow do szybkiego wyboru sensownego zestawu posilkow na kilka dni. Uzytkownik ma pracowac na swoich sprawdzonych przepisach, a kluczowa wartosc MVP to szybkie odnajdywanie i decyzja, co ugotowac, a nie samo magazynowanie tresci.

W tym roadmapie najpierw dostarczamy walidacyjny punkt produktu, czyli najmniejszy przeplyw, ktory pokazuje, ze uzytkownik potrafi realnie zbudowac baze przepisow i uzyc jej do decyzji kulinarnej.

## North star

**S-02: Uzytkownik wyszukuje przepisy po taksonomii i skladniku z autocomplete oraz otwiera szczegoly** - to jest walidacyjny kamien milowy, bo dowodzi, ze produkt przechodzi od "mam przepisy" do "umiem szybko wybrac, co ugotowac" przy celu sekwencjonowania nastawionym na szybkie dowiezienie MVP.

> Tu "north star" oznacza najmniejszy koncowy przeplyw uzytkownika, ktory potwierdza glowna hipoteze produktu i dlatego laduje najwczesniej, jak pozwalaja zaleznosci.

## At a glance

| ID   | Change ID                               | Outcome (user can ...)                                                                                       | Prerequisites | PRD refs                                                                | Status   |
| ---- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------- | ----------------------------------------------------------------------- | -------- |
| F-01 | recipe-domain-foundation                | (foundation) aplikacja ma minimalny model przepisu, taksonomii i wlasciciela danych gotowy pod przeplywy MVP | -             | Access Control, FR-001, FR-003                                          | ready    |
| S-01 | add-recipe-with-taxonomy                | user can add a recipe recznie lub copy-paste i zapisac podstawowe metadane taksonomiczne                     | F-01          | FR-001, FR-003, Success Criteria (Primary)                              | proposed |
| S-02 | search-recipes-autocomplete-and-details | user can wyszukac przepis po taksonomii i skladniku, zobaczyc karty wynikow i otworzyc pelny widok           | S-01          | US-01, FR-004, FR-005, Non-Functional Requirements (search <= 1.5s p95) | proposed |
| S-03 | edit-and-delete-recipe                  | user can edytowac i usuwac istniejace przepisy bez utraty kontroli nad wlasna baza                           | S-01          | FR-002                                                                  | proposed |

## Streams

Navigation aid - groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme                  | Chain                      | Note                                                                                         |
| ------ | ---------------------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| A      | Ingest i decyzja       | `F-01` -> `S-01` -> `S-02` | To glowny lancuch walidujacy wartosc produktu przy celu speed.                               |
| B      | Higiena bazy przepisow | `S-03`                     | Dziala rownolegle do `S-02` po domknieciu `S-01`; zmniejsza chaos i utrzymuje jakosc danych. |

## Baseline

What's already in place in the codebase as of 2026-05-26 (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present - Astro SSR, routing i komponenty UI sa gotowe jako baza interfejsu.
- **Backend / API:** partial - istnieja endpointy i middleware dla auth, brak domenowych endpointow przepisow.
- **Data:** absent - brak zdefiniowanej warstwy danych domenowych dla przepisow i taksonomii.
- **Auth:** present - Supabase SSR + middleware + przeplywy sign in/up/out dzialaja.
- **Deploy / infra:** partial - konfiguracja Cloudflare i CI istnieje, ale bez pelnego domkniecia operacyjnego pod produkcje.
- **Observability:** absent - brak telemetryki produktu i monitoringu bledow dla przeplywow MVP.

## Foundations

### F-01: Minimalny fundament domeny przepisu

- **Outcome:** (foundation) model przepisu, metadanych taksonomicznych i wlasciciela danych jest spojny i gotowy do uzycia przez kolejne przeplywy.
- **Change ID:** recipe-domain-foundation
- **PRD refs:** Access Control, FR-001, FR-003
- **Unlocks:** S-01, S-02, S-03
- **Prerequisites:** -
- **Parallel with:** -
- **Blockers:** -
- **Unknowns:** -
- **Risk:** Bez tego fundamentu latwo rozjechac zakres i wprowadzic niespojnosci, ktore spowolnia kolejne pionowe dostawy.
- **Status:** ready

## Slices

### S-01: Dodanie przepisu z metadanymi

- **Outcome:** user can dodac przepis recznie lub copy-paste i zapisac podstawowe metadane potrzebne do pozniejszego wyszukiwania.
- **Change ID:** add-recipe-with-taxonomy
- **PRD refs:** FR-001, FR-003, Success Criteria (Primary)
- **Prerequisites:** F-01
- **Parallel with:** -
- **Blockers:** -
- **Unknowns:** -
- **Risk:** Jesli ten slice bedzie zbyt rozbudowany, presja czasu przeniesie opoznienie na caly lancuch walidacji.
- **Status:** proposed

### S-02: Wyszukiwanie z autocomplete, karty wynikow i szczegoly

- **Outcome:** user can wyszukac przepisy po taksonomii i skladniku z podpowiedziami autocomplete, przegladac karty i otworzyc pelny widok przepisu.
- **Change ID:** search-recipes-autocomplete-and-details
- **PRD refs:** US-01, FR-004, FR-005, Non-Functional Requirements (search <= 1.5s p95)
- **Prerequisites:** S-01
- **Parallel with:** S-03
- **Blockers:** -
- **Unknowns:**
  - Ktora metryka ma byc glowna do oceny pierwszych 2 tygodni: dodane przepisy na uzytkownika czy skutecznosc klikniec w top-3? - Owner: user. Block: no.
- **Search contract:** taxonomy pozostaje otwarta i user-extensible; autocomplete dotyczy taxonomy, a skladnik jest wpisywany w zwyklym polu wyszukiwania. Filtr taxonomy i filtr skladnika lacza sie jako AND. Skladnik jest dopasowywany po niepustym fragmencie tekstu, case-insensitive, po trimowaniu zapytania. Brak dopasowan zwraca jawny pusty stan, nie blad.
- **Deferred:** osobny byt skladnika, normalizacja skladnikow i autocomplete skladnikow sa poza S-02 i pozostaja kandydatem do zmiany po zamknieciu obecnej roadmapy.
- **Risk:** To north star, wiec zbyt pozne dostarczenie opozni walidacje, czy produkt realnie skraca decyzje o posilku.
- **Status:** proposed

### S-03: Edycja i usuwanie przepisu

- **Outcome:** user can poprawic i usunac przepis, utrzymujac porzadek i zaufanie do swojej bazy.
- **Change ID:** edit-and-delete-recipe
- **PRD refs:** FR-002
- **Prerequisites:** S-01
- **Parallel with:** S-02
- **Blockers:** -
- **Unknowns:** -
- **Risk:** Wypchniecie tego za daleko zwieksza ryzyko balaganu danych i obniza jakosc wyszukiwania.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                               | Suggested issue title                                           | Ready for `/10x-plan` | Notes                                                         |
| ---------- | --------------------------------------- | --------------------------------------------------------------- | --------------------- | ------------------------------------------------------------- |
| F-01       | recipe-domain-foundation                | MVP foundation: spojny model przepisu, taksonomii i wlasciciela | yes                   | Foundation jest ready i odblokowuje wszystkie pionowe slices. |
| S-01       | add-recipe-with-taxonomy                | MVP slice: dodanie przepisu z metadanymi                        | no                    | Wymaga domkniecia F-01.                                       |
| S-02       | search-recipes-autocomplete-and-details | MVP north star: wyszukiwanie + autocomplete + karty + szczegoly | no                    | Wymaga S-01.                                                  |
| S-03       | edit-and-delete-recipe                  | MVP slice: edycja i usuwanie przepisu                           | no                    | Wymaga S-01.                                                  |

## Open Roadmap Questions

1. **Ktora metryka ma priorytet na starcie MVP: "dodane przepisy na uzytkownika" czy "klikniecia w top-3 wynikow"?** - Owner: user. Block: roadmap-wide.
2. **Startowa taksonomia pozostaje otwarta (user-extensible), z deduplikacja bez rozrozniania wielkosci liter.** - Decision: accepted for S-02. Block: resolved.

## Parked

- **Import przepisow z URL-i webowych** - Why parked: PRD Non-Goals; utrzymanie malego zakresu pierwszego wydania.
- **Parsowanie przepisow z YouTube** - Why parked: PRD Non-Goals; integracje wideo podnosza koszt i ryzyko opoznienia.
- **Udostepnianie przepisow innym uzytkownikom** - Why parked: PRD Non-Goals; MVP jest single-user per account.
- **Zaawansowany profil uzytkownika** - Why parked: PRD Non-Goals; wystarcza proste konto.
- **Hostowanie plikow graficznych uzytkownika** - Why parked: PRD Non-Goals; dopuszczalny jest tylko link do zdjecia.
- **Zaawansowane generowanie przepisow przez AI i rozbudowany ingest tresci** - Why parked: PRD Non-Goals; najpierw walidacja podstawowego przeplywu.

## Done

(Empty on first generation. `/10x-archive` appends an entry here - and flips that item's `Status` to `done` - when a change whose `Change ID` matches the item is archived. Do NOT pre-populate.)
