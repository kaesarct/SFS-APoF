# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Nutella Index" (a.k.a. LGRDG) is an Angular 21 single-page app that estimates purchasing power parity (PPP) across countries using the local price of a jar of Nutella as the benchmark good, then translates the result into "minutes of local work" and light-hearted euro-equivalent items. Backend is Firebase on the free **Spark** plan (Firestore for data, Auth for the admin area, App Check with reCAPTCHA v3 to protect public writes). Cloud Storage is intentionally not used: it requires the paid Blaze plan, and the project must stay at zero cost. Photos are plain URLs in the `photo_url` field.

## Commands

- `npm start` — run the dev server (`ng serve`).
- `npm run build` — production build: `ng build` (prerender of public routes, IT at `/` and EN at `/en/`; budgets 2MB warn / 3MB error) then copies `index.csr.html` to `404.html`. Always deploy from this script, not bare `ng build`.
- `npx ng extract-i18n` — refresh `src/locale/messages.xlf`; add matching targets to `src/locale/messages.en.xlf`.
- `npm run watch` — development-configuration build in watch mode.
- `npm test` — run unit tests via `@angular/build:unit-test` (Vitest under the hood, jsdom environment).
  - Run a single test file: `ng test -- src/app/app.spec.ts` (standard Vitest CLI filtering flags also work since the builder proxies to Vitest).
- There is no configured lint script in `package.json`.

## Environment setup

Firebase/reCAPTCHA config is not committed. `src/environments/environment.ts` and `environment.prod.ts` are gitignored; copy `src/environments/environment.example.ts` to `environment.ts` and fill in real `firebase` config and `recaptcha.siteKey` before running the app locally.

## Architecture

**Standalone components, no NgModules.** Routing (`src/app/app.routes.ts`) maps flat paths to standalone components; `admin` is the only guarded route (`authGuard` in `src/app/auth-guard.ts`, backed by `@angular/fire/auth`'s `user()` observable — redirects to `/login` when unauthenticated). Firebase is wired up once in `src/app/app.config.ts` (app, App Check w/ reCAPTCHA v3, Auth, Firestore providers).

**`DataService` (`src/app/data.service.ts`) is the single data-access layer** — all components go through it rather than touching Firestore directly. It owns three Firestore collections and an in-memory cache per collection (cleared on every write):
- `measurements` — the actual price/PIL readings, exposed as `Rilevazione[]`. Reading them joins in `countries`/`areas` collections for fallback naming, computes `euro_per_100g` and `minutes_per_100g` on the fly, and has hand-coded name/area overrides for a few countries (South Sudan, Burundi, Thailand) to normalize inconsistent historic data.
- `paesi_config` — per-country currency/exchange-rate config (`PaeseConfig[]`), seedable in bulk from `src/app/countries-data.json` (admin-only "seed 197 countries" action).
- `submissions` — public user-submitted data points (`Submission`), reviewed in the admin panel and, on approval, promoted into `measurements`.
Also handles Excel import (`importRilevazioniFromExcel`, via `xlsx` 0.20.3 installed from the official SheetJS CDN tarball because npm only has the vulnerable 0.18.5; loaded with a dynamic import, tolerant of multiple historical Italian/English column-header spellings).

**Prerender and i18n.** `outputMode: "static"` in `angular.json` prerenders public routes at build time (`app.routes.server.ts`; `login`/`admin` are client-only). Code that runs during prerender must not touch browser APIs: use `isPlatformBrowser`/`afterNextRender`. App Check is registered only in the browser (`app.config.ts`) and `DataService` returns empty arrays on the server, so prerendered pages use the static JSON fallbacks. Texts are Italian source strings marked with `i18n="@@id"` / `$localize`; never use a translated string as a logic key. `app.ts` maintains title-dependent meta, canonical, `hreflang` and JSON-LD on every navigation.

**Security rules** live in `firestore.rules`: public read only for `measurements`, `paesi_config`, `countries`, `areas`; writes restricted to the admin UID allowlist in `isAdmin()`; public `create` on `submissions` is field-validated. Deploy them with `firebase deploy --only hosting,firestore:rules` (never "hosting only").

**The Nutella Index math lives in `src/app/shared/nutella-math.ts`** (covered by `nutella-math.spec.ts`): `euroPer100g`, `minutesPer100g` (2000 working hours/year), `wagePerMinute`, `valuationPct`, `latestGdp` (reads year-prefixed keys like `"2026 EUR (0.87)"` from `nutella-data.json`) and the Italian benchmark. The benchmark is never hard-coded: `findItalyReference` derives it from the latest Italian reading in `measurements` (`DataService.getItalyReference()` queries only Italy's documents; the dashboard derives it from data it already loaded), with `FALLBACK_ITALY_REFERENCE` when Firestore is unavailable. The calculators (`instant-calculator`, `ppp-index`, `equivalency`, `link-submission`), the dashboard and `DataService` all use these functions; change the formula there only. Calculators still load country/currency config from `DataService.getPaesiConfig()` with the static JSON fallbacks (`paesi-ita.json`, `currency-data.json`, `ita-to-eng.json`).

Approving a submission (`DataService.approveSubmission`) stores the Italian name in `paese_it`, maps `paese_en` via `ita-to-eng.json`, fills GDP from `nutella-data.json`, reuses the country's existing area, and suffixes the measurement id with the submission id.

**`src/app/shared/tiers.ts`** holds the euro-value → "what you could buy instead" tier table (`PRICING_TIERS`, `findMatchingTier`) used by the equivalency views.

**`src/app/dashboard/dashboard.ts`** renders the public overview: pulls all `Rilevazione`s, dedupes to the latest reading per country, maps country names to ISO codes for flag icons (`country-iso.json`, with exact-then-fuzzy matching against `ita-to-eng.json`), and draws two Chart.js bar charts (valuation % and minutes-of-work) plus a CSV export.

**`src/app/admin/admin.ts`** is the CRUD console behind the auth guard: manages `measurements`/`paesi_config`/`rilevazioni` records, Excel import, country-config bulk seeding, submission moderation (approve promotes into `measurements`, reject deletes), and account password change.

**Data files** under `src/app/*.json` are static reference/fallback data (currency rates, country name translations IT↔EN, ISO codes for flags, GDP time series). These are the fallback path when Firestore is unavailable — the Firestore collections (`paesi_config` especially) are the source of truth once seeded.
