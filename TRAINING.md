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
| Pułapki | `7a8f60c` fix(m2): linkedSignal source and resource error state |
| | `d80d4bb` fix(m4): block "Next" while async validation runs |
| | `05d3293` feat(m1): canDeactivate guard for an unsaved wizard |
| | `e3a9f3c` fix(m4): dynamic list of objects so field state follows the row |
| | `59812c5` docs(m3,m5): gotcha snippets |

Commity „Pułapki” to prawdziwe błędy, które same wyszły podczas pisania aplikacji. Ich diff
to gotowy materiał na slajd „przed / po”.

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
- Dynamiczna sekcja: lista usług (obiekty `{ name }`) + `applyEach()`; dodawanie/usuwanie = zmiana tablicy w modelu.
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

## Pułapki (do pokazania na żywo)

Każda pułapka ma komentarz w kodzie obok miejsca, którego dotyczy.

**Signals** (`ticket-list.ts`, `ticket-row.ts`, `status-filter.ts`, `ticket-store.ts`)
- `linkedSignal`: źródło = „co ma mnie resetować”. Gdy źródłem była przefiltrowana lista, klik
  „Start” na stronie 2 cofał na stronę 1 (nowa tablica = nowe źródło). Teraz źródłem są same
  filtry. Pokaż też `previous`, czyli zachowanie wyboru, jeśli nadal jest poprawny.
- `computed`: zależności są dynamiczne (gałąź `if`, która się nie wykonała, nie jest
  zależnością). Musi być czysty, a zapis sygnału w środku daje NG0600. Porównanie przez
  `Object.is`, więc zwracaj nową tablicę.
- Mutacja w miejscu (`find(...).status = 'done'`) nie powiadamia nikogo. Zawsze `update` z nową
  tablicą lub obiektem.
- `effect` nie służy do stanu pochodnego. `untracked()`, efekty są asynchroniczne,
  `afterRenderEffect` do pracy z DOM.
- `input()` jest tylko do odczytu. Jeśli potrzebujesz kopii do edycji, użyj
  `linkedSignal(() => input())`, a jeśli rodzic ma zobaczyć zmianę, użyj `model()`. Odczyt
  wymaganego inputu w konstruktorze daje NG0950 (złapaliśmy to w Angular Aria, kolejność
  bindingów na hoście). `transform: booleanAttribute`.

**Resource / RxJS** (`ticket-store.ts`, `ticket-detail.ts`, `quick-search.ts`)
- `value()` **rzuca wyjątek** w stanie błędu, także z `defaultValue`. Store sprawdza
  `hasValue()`, a test to potwierdza.
- Resource służy do odczytu. POST/PATCH to komendy przez HttpClient. `undefined` w URL daje
  stan idle. `isLoading` jest prawdą także przy `reload()`.
- `catchError` musi być wewnątrz `switchMap`. `toSignal` subskrybuje od razu, a
  `toObservable` emituje asynchronicznie tylko ostatnią wartość. switch/concat/exhaust/mergeMap
  i kiedy który.

**Signal Forms** (`ticket-form.ts`, `new-ticket.ts`)
- W trakcie async walidacji `pending()` jest prawdą, a `valid()` i `invalid()` są **oba**
  fałszem. Wcześniej „Next” nic nie robił, teraz jest wyłączony.
- Lista dynamiczna: elementy jako **obiekty**. Przy `string[]` stan pola (touched, błędy)
  zostaje przy indeksie i po usunięciu wiersza „przeskakuje” na inny. Test to pokazuje.
- `[formField]="form.x"` (pole), a nie `form.x()` (stan). Nie mieszaj z `[value]` ani
  `ngModel`.
- Model musi mieć wartość dla każdego pola. Pola `hidden/disabled/readonly` są pomijane w
  walidacji, ale **zostają w `value()`**.
- Async walidacja rusza dopiero, gdy przejdą reguły synchroniczne. `when` przełącza jedną
  regułę, a `applyWhen` cały pod-schemat. Błędy mogą wskazywać inne pole (`fieldTree`).
  `reset()`.

**Routing / @defer / szablony**
- Kolejność tras (`new` przed `:id`). Guard `canDeactivate` pyta przed porzuceniem kreatora
  (`form().dirty()`). Snippety: `canMatch`, `redirectTo` jako funkcja, `resolve` kontra
  resource, `withViewTransitions`.
- `@defer` wydziela tylko zależności używane wyłącznie w bloku. Na serwerze renderuje się
  `@placeholder`, chyba że jest `hydrate`. Przy `on viewport` placeholder musi mieć jeden
  korzeń.
- `@for`: `track` po stabilnym id, a nie `$index` ani obiekcie.
- SSR: `localStorage` w inicjalizatorze sygnału daje NG0500 (komentarz w `ticket-list.ts`).

### Nie ma w kodzie (wspomnij słownie)

Content projection z treścią domyślną w `<ng-content>` (v18), `provideAppInitializer` (v19),
HMR szablonów (v19), selektor-less i inne eksperymenty po v22, migracje do
modernizacji starszych aplikacji: `ng generate @angular/core:<nazwa>`, gdzie nazwa to
`standalone-migration`, `control-flow-migration`, `inject-migration`, `signal-input-migration`,
`signal-queries-migration`, `output-migration`, `route-lazy-loading-migration`,
`service-migration` lub zbiorcze `signals`.

## Testy

`npm test` – po jednym celowanym teście na temat:

- `tickets.routes.spec.ts` – kolejność tras,
- `ticket-list.spec.ts` – computed, linkedSignal (także: strona nie skacze po zmianie ticketu),
  optymistyczny PATCH,
- `quick-search.spec.ts` – debounce, anulowanie (`req.cancelled`), przeżycie błędu 500,
- `new-ticket/ticket-form.spec.ts` – reguły Signal Forms bez renderowania komponentu, stan pól
  tablicy podąża za obiektem,
- `ticket-store.spec.ts` – selektory, rollback po błędzie, brak wyjątku w stanie błędu.
