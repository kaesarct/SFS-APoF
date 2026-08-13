# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Nutella Index" (a.k.a. LGRDG) is an Angular 21 single-page app that estimates purchasing power parity (PPP) across countries using the local price of a jar of Nutella as the benchmark good, then translates the result into "minutes of local work" and light-hearted euro-equivalent items. Backend is Firebase (Firestore for data, Storage for photo uploads, Auth for the admin area, App Check with reCAPTCHA v3 to protect public writes).

## Commands

- `npm start` — run the dev server (`ng serve`).
- `npm run build` — production build (`ng build`, budgets enforced: 2MB warn / 3MB error initial bundle).
- `npm run watch` — development-configuration build in watch mode.
- `npm test` — run unit tests via `@angular/build:unit-test` (Vitest under the hood, jsdom environment).
  - Run a single test file: `ng test -- src/app/app.spec.ts` (standard Vitest CLI filtering flags also work since the builder proxies to Vitest).
- There is no configured lint script in `package.json`.

## Environment setup

Firebase/reCAPTCHA config is not committed. `src/environments/environment.ts` and `environment.prod.ts` are gitignored; copy `src/environments/environment.example.ts` to `environment.ts` and fill in real `firebase` config and `recaptcha.siteKey` before running the app locally.

## Architecture

**Standalone components, no NgModules.** Routing (`src/app/app.routes.ts`) maps flat paths to standalone components; `admin` is the only guarded route (`authGuard` in `src/app/auth-guard.ts`, backed by `@angular/fire/auth`'s `user()` observable — redirects to `/login` when unauthenticated). Firebase is wired up once in `src/app/app.config.ts` (app, App Check w/ reCAPTCHA v3, Auth, Firestore, Storage providers).

**`DataService` (`src/app/data.service.ts`) is the single data-access layer** — all components go through it rather than touching Firestore/Storage directly. It owns three Firestore collections and an in-memory cache per collection (cleared on every write):
- `measurements` — the actual price/PIL readings, exposed as `Rilevazione[]`. Reading them joins in `countries`/`areas` collections for fallback naming, computes `euro_per_100g` and `minutes_per_100g` on the fly, and has hand-coded name/area overrides for a few countries (South Sudan, Burundi, Thailand) to normalize inconsistent historic data.
- `paesi_config` — per-country currency/exchange-rate config (`PaeseConfig[]`), seedable in bulk from `src/app/countries-data.json` (admin-only "seed 197 countries" action).
- `submissions` — public user-submitted data points (`Submission`), reviewed in the admin panel and, on approval, promoted into `measurements`.
Also handles Excel import (`importRilevazioniFromExcel`, via the `xlsx` package, tolerant of multiple historical Italian/English column-header spellings) and photo upload to Storage.

**The core PPP math is duplicated across three "calculator" features** rather than centralized — when changing the formula, all three need updating in lockstep:
- `src/app/instant-calculator/instant-calculator.ts` — full calculator with a "calcolo" / "equivalenza" tab toggle.
- `src/app/ppp-index/ppp-index.ts` — PPP-focused variant (over/undervaluation %).
- `src/app/link-submission/link-submission.ts` — the public submission form, which previews the same Nutella Index calculation before posting to `DataService.submitData`.
All three independently: try `DataService.getPaesiConfig()` (Firestore) first, then fall back to the static JSON files (`paesi-ita.json`, `currency-data.json`, `ita-to-eng.json`) if Firestore is empty or errors; and look up GDP-per-capita from `src/app/nutella-data.json` (`nutellaData.gdp`), preferring the most recent year in `['2026','2025',...,'2020']` order, skipping `"no data"` entries.

**`src/app/shared/tiers.ts`** holds the shared constants (`ITALY_WAGE_PER_MINUTE`, `ITALY_MINUTES_PER_100G`) and the euro-value → "what you could buy instead" tier table (`PRICING_TIERS`, `findMatchingTier`) used by the equivalency views.

**`src/app/dashboard/dashboard.ts`** renders the public overview: pulls all `Rilevazione`s, dedupes to the latest reading per country, maps country names to ISO codes for flag icons (`country-iso.json`, with exact-then-fuzzy matching against `ita-to-eng.json`), and draws two Chart.js bar charts (valuation % and minutes-of-work) plus a CSV export.

**`src/app/admin/admin.ts`** is the CRUD console behind the auth guard: manages `measurements`/`paesi_config`/`rilevazioni` records, Excel import, country-config bulk seeding, submission moderation (approve promotes into `measurements`, reject deletes), and account password change.

**Data files** under `src/app/*.json` are static reference/fallback data (currency rates, country name translations IT↔EN, ISO codes for flags, GDP time series). These are the fallback path when Firestore is unavailable — the Firestore collections (`paesi_config` especially) are the source of truth once seeded.
