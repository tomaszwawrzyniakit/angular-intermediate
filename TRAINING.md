# OpsBoard – przewodnik trenera

Aplikacja do szkolenia **Angular Developer (Intermediate): Modern Angular** (Angular 22).
Domena: tablica zgłoszeń zespołu IT Ops (tickety ze statusem, priorytetem i osobą przypisaną).

```bash
npm install
npm start            # http://localhost:4200 – dev server z SSR i REST API (/api/tickets)
npm test             # Vitest
npm run build && npm run serve:ssr:opsboard   # build produkcyjny, http://localhost:4000
```

**Historia Gita = program szkolenia.** Każdy moduł to jeden commit; `git checkout <hash>`
daje stan po module, a `git diff <poprzedni>..<hash>` pokazuje dokładnie, co doszło.

| Moduł | Commit |
|---|---|
| Setup | `fdcd37c` chore: set up Angular 22 project with SSR, Bootstrap and tooling |
| 1 | `d6d3bec` feat(m1): app shell, lazy feature routes and route input binding |
| 2 | `a0732a6` feat(m2): ticket list built with signals |
| 3 | `c1b5e51` feat(m3): REST API, httpResource and a cancellable RxJS quick search |
| 4 | `9422905` feat(m4): new-ticket wizard with Signal Forms |
| 5 | `20d883c` feat(m5): dashboard with @defer, UX states and an Angular Aria picker |
| 6 | `c8aaae0` feat(m6): signal store, ViewModel and hybrid rendering |

Zasada UI: tylko klasy Bootstrapa (`styles.scss` jest pusty), żadnego Bootstrap JS – stan
interaktywny (zakładki kroków, dropdown wyszukiwarki) trzymają sygnały.

---

## Moduł 1 – projekt w duchu Modern Angular

Pliki: `app.ts`, `app.routes.ts`, `features/tickets/tickets.routes.ts`, `app.config.ts`

- Standalone wszędzie, brak NgModule; zoneless jest domyślny od v21 (brak `zone.js`).
- Feature-based: `features/dashboard`, `features/tickets` (+ `new-ticket/`). Feature ma własne
  trasy (`loadChildren`), a strony są ładowane leniwie (`loadComponent`, `export default`).
- **Pułapka do pokazania:** kolejność tras – `new` przed `:id` („first match wins”). Zamień
  kolejność i wejdź na `/tickets/new`: otworzy się ticket o id „new”. Test `tickets.routes.spec.ts`.
- `withComponentInputBinding()`: parametr `:id` trafia do `id = input.required<string>()`.
  Porównaj ze starym `ActivatedRoute.paramMap.pipe(...)`.

## Moduł 2 – Signals

Pliki: `ticket-list.ts`, `ticket-row.ts`, `status-filter.ts`, `ticket-status-badge.ts`

| API | Use case w aplikacji |
|---|---|
| `signal()` | tekst filtra, wybrany status |
| `computed()` | przefiltrowana lista, liczba stron, bieżąca strona |
| `linkedSignal()` | numer strony: użytkownik go zmienia, ale zmiana filtra wraca na stronę 1 |
| `effect()` | zapis filtrów w `localStorage` (efekt uboczny, nie stan pochodny) |
| `input()` / `output()` | wiersz dostaje ticket, emituje `advance` („Start” / „Resolve”) |
| `model()` | grupa przycisków statusu, `[(value)]="status"` |
| `viewChild()` | skrót klawiszowy `/` ustawia fokus na polu filtra (jak w GitHubie) |
| `inject()` | wszędzie zamiast konstruktora |

Szablony: `@for … track` + `@empty`, `@let`, `@switch` z `@default never;` (wyczerpujący switch –
dodaj priorytet `'critical'` do typu i pokaż błąd kompilacji).

Demo: przejdź na stronę 2, zmień filtr → strona 1. Odśwież → filtry wracają (effect).

## Moduł 3 – dane i backend

Pliki: `src/server/ticket-api.ts`, `ticket-api.ts`, `quick-search.ts`, `ticket-detail.ts`

- REST API działa w serwerze Express od SSR (także w `ng serve`), więc wszystko widać w
  **DevTools → Network** – w tym anulowane żądania.
- `httpResource()` – lista i szczegóły: `value()`, `isLoading()`, `error()`, `reload()`,
  `hasValue()`; reaktywny URL (`/api/tickets/${id()}`) – zmiana id anuluje poprzednie żądanie.
  `/tickets/999` → stan błędu + Retry. W komentarzu: `resource()` i `rxResource()`.
- Optymistyczna aktualizacja: `resource.value.update(...)`, PATCH, przy błędzie `reload()`.
- Wyszukiwarka w navbarze: `toObservable → debounceTime → distinctUntilChanged → switchMap →
  catchError → toSignal`. **Sygnały = stan, RxJS = czas i anulowanie.**
  Demo: pisz szybko → w Network żądania „(canceled)”. Wpisz `boom` → błąd 500, komunikat,
  a potem dalej szukaj – strumień żyje, bo `catchError` jest *wewnątrz* `switchMap`.

## Moduł 4 – Signal Forms

Pliki: `new-ticket/ticket-form.ts` (model + reguły), `new-ticket/new-ticket.ts` (widok),
`new-ticket/validators.ts`, `new-ticket/field-errors.ts`

- Model to zwykły `signal()`, `form(model, schema)` dodaje stan pól i reguły; `[formField]`.
- Reguły w jednym `schema()`: wbudowane (`required`, `minLength`, `email`, `min`), warunkowe
  (`when`), cross-field (telefon wymagany przy kontakcie telefonicznym), **własny walidator**
  `phoneNumber()`, async `validateHttp` (duplikat tytułu – spróbuj
  „Payment gateway timeouts in production”), reguła biznesowa między krokami
  (awaria > 100 użytkowników ⇒ priorytet high), sekcja warunkowa `hidden()` (obejście).
- Dynamiczna sekcja: lista usług + `applyEach()`; dodawanie/usuwanie = zmiana tablicy w modelu.
- Formularz wieloetapowy: każdy krok to pod-obiekt modelu, „Next” robi `markAsTouched()` i
  sprawdza `valid()` tylko tego kroku.
- Walidacja serwerowa: tytuł ze słowem „test” → 422 → błąd wraca na pole tytułu (`submission.action`).
- `provideSignalFormsConfig` dodaje klasy `is-invalid` / `is-valid` → walidacja Bootstrapa bez
  ani jednej linijki CSS.

## Moduł 5 – szablony i UX

Pliki: `dashboard/dashboard.ts`, `dashboard/status-chart.ts`, `tickets/assignee-picker.ts`

- `@defer (on viewport; hydrate on viewport)` z `@placeholder (minimum)`, `@loading`, `@error`;
  wykres to osobny chunk JS (Network). Inne triggery w komentarzu.
- Stany: loading = `placeholder-glow` Bootstrapa, empty = „Every high-priority ticket has an
  owner”, error = alert z Retry.
- Angular Aria: lista osób (`ngListbox`/`ngOption`) na zwykłym `list-group`. Demo tylko klawiaturą:
  Tab, strzałki, litera (typeahead), Enter → zapis. Material daje gotowy wygląd, Aria tylko
  zachowanie i dostępność – wygląd jest nasz.

## Moduł 6 – skalowanie

Pliki: `tickets/ticket-store.ts`, `dashboard/dashboard.ts`, `app.routes.server.ts`, `app.config.ts`

- **Local state first:** filtry i stronicowanie zostają w komponencie. Do store'a trafia tylko
  to, co współdzielone (kolekcja ticketów: lista, szczegóły, dashboard, kreator).
- **Store pattern:** `@Service` z prywatnym stanem, publicznymi selektorami (`asReadonly`,
  `computed`) i komendami (`update`, `added`, `reload`). Obok w komentarzu ten sam store w
  **NgRx Signal Store** – porównanie.
- **ViewModel:** dashboard ma jeden `vm = computed(...)`, szablon czyta `@let vm = this.vm()`.
- **SSR i hydracja:** `RenderMode.Server` dla danych, `RenderMode.Client` dla formularza,
  `Prerender` opisany w komentarzu. Hydracja przyrostowa na wykresie, event replay, HTTP
  transfer cache (na `/tickets` przeglądarka nie wysyła żadnego `/api/tickets` – sprawdź Network
  i `<script id="ng-state">` w źródle strony).
- **Błąd hydracji na żywo:** komentarz w `ticket-list.ts` (odczyt `localStorage` przy tworzeniu
  sygnału) → NG0500 w konsoli. Poprawka: `afterNextRender`.

### Diagnostyka i wydajność (bez kodu, na żywo)

- **Angular DevTools** → Components: inputy/sygnały komponentu; zakładka hydracji pokazuje
  komponenty uwodnione / pominięte / z błędem.
- **Angular DevTools → Profiler**: nagraj klik „Start” na liście – widać, które komponenty
  odświeżyły się (zoneless + sygnały = tylko te, które czytały zmieniony sygnał).
- **Signal graph** (DevTools): zależności `query → filtered → page → pageTickets`.
- **Build**: `ng build --stats-json`, wynik w esbuild Bundle Analyzer; budżety w `angular.json`;
  lazy chunki (`ticket-list`, `new-ticket`, `status-chart`) widoczne w wyjściu builda.
- **Chrome Performance / Lighthouse** na wersji SSR (`npm run serve:ssr:opsboard`): LCP, CLS.

## Testy

`npm test` – po jednym celowanym teście na temat:

- `tickets.routes.spec.ts` – kolejność tras,
- `ticket-list.spec.ts` – computed, linkedSignal, optymistyczny PATCH,
- `quick-search.spec.ts` – debounce, anulowanie (`req.cancelled`), przeżycie błędu 500,
- `new-ticket/ticket-form.spec.ts` – reguły Signal Forms bez renderowania komponentu,
- `ticket-store.spec.ts` – selektory i rollback po błędzie.
