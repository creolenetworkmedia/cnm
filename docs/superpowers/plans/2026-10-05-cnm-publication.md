# CNM Public Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic landing-page presentation with the approved CNM publication, working public navigation, four-language reading, and a truthful persistent radio experience.

**Architecture:** Extract the existing monolithic application into a thin route shell plus publication, radio, account, and design modules. Preserve the existing backend and article fields; normalize optional future rich-content fields without requiring a schema change to preview this deliverable. Generate deployment-specific asset and route paths from one configuration.

**Tech Stack:** Existing React/TypeScript/Vite/Supabase client; Vitest with React Testing Library; Playwright with accessibility checks. Preserve current production dependencies unless a verified compatibility/security issue requires a separately recorded adjustment.

**Spec:** `docs/superpowers/specs/2026-10-05-cnm-editorial-redesign-design.md`, sections 1-5, 9, 11-12.

## Global Constraints

All constraints in `2026-10-05-cnm-redesign.md` apply. Exact spec requirements emphasized here:

- Preserve CNM's approved logo and the client's blue, white, and red identity.
- Provide English (`en`), French (`fr`), Haitian Creole (`ht`), and Spanish (`es`).
- Allow public radio listening and reading without signing in. Accounts remain optional for those activities.
- Keep design, feature behavior, translations, and data access separated.
- Do not invent articles, presenters, audience statistics, sponsors, rates, radio URLs, testimonials, contact numbers, or legal/business claims.

Keep `#00209f`, `#d21034`, and `#ffffff` as the inspected blue/red/white token values initially. A change requires documented contrast/visual justification. These hexadecimal values came from the existing CSS, not a new claim about client-supplied specifications.

## Review Focus

- Refreshing `/cnm/news/a-story` must request assets under `/cnm/`, never `/cnm/news/assets` (P1).
- Corrupted locale storage and unusually long French/Creole headings must not crash or overflow (P2/P4).
- Slow/offline requests must not become fake empty content or permanent player spinners (P2/P3).
- Switching article slug or language during a request must not render the preceding story as the new story (P2/P4).
- The software keyboard and persistent player must not cover focused fields or confirmation controls (P4).

## File map

- `src/App.tsx`: thin provider/router composition, retaining compatibility until extracted screens pass tests.
- `src/app/paths.ts`, `src/app/router.tsx`, `src/app/config.ts`: deployment base, real navigation links, known routes/not-found.
- `src/design/tokens.css`, `src/design/layout.css`, `src/design/Field.tsx`, `src/design/Dialog.tsx`: visual rules and accessible controls.
- `src/features/navigation/SiteHeader.tsx`, `SiteFooter.tsx`, `LanguageMenu.tsx`: masthead/footer and language interaction.
- `src/features/articles/article.model.ts`, `article.queries.ts`, `HomePage.tsx`, `NewsPage.tsx`, `ArticlePage.tsx`, `ArticleCard.tsx`: public editorial presentation.
- `src/features/radio/RadioProvider.tsx`, `radio.machine.ts`, `RadioStrip.tsx`, `ListenPage.tsx`, `MiniPlayer.tsx`: one persistent audio instance and status.
- `src/features/programs/programs.model.ts`, `ProgramsPage.tsx`: effective schedules and timezone display.
- `src/features/account/AccountPage.tsx`, `AuthProvider.tsx`: existing account behavior, isolated from page layout.
- `src/shared/contracts/article.ts`, `src/shared/i18n/*`: compatible content model and language dictionaries/helpers.
- `public/brand/cnm-logo-black.png`, `cnm-logo-white.png`: exact supplied artwork, not generated replacements.
- `scripts/finalize-static-build.mjs`, `tests/browser/static-server.mjs`: explicit-base build output and Pages-like fallback test server.
- `vite.config.ts`, `package.json`, `package-lock.json`, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/check-cnm.yml`: reproducible build and test boundary.

## P1. Make deployed navigation reproducible before changing its appearance

**Files:** Create the app path/config/router files, test configurations, static-build/test-server scripts, `tests/unit/paths.test.ts`, and `tests/browser/routes.spec.ts`. Modify the existing Vite config, package scripts, `index.html`, and shell routing. Create `.gitignore` and a lockfile.

**Interfaces:** `SiteBase = '/' | '/cnm/'`; `toSitePath(path: string, base: SiteBase): string`; `parseSitePath(pathname: string, base: SiteBase): Route`; `Route` covers existing destinations plus the approved new pages and `not-found`. `getSiteConfig(): {base: SiteBase; origin: string}` reads the validated build target, not a hostname regex. Public pages consume `SiteLink` for navigation.

- [ ] **Step 1:** In an isolated CNM worktree, record the baseline build, then add the failing routing tests and the test runner configuration. Resolve test tools from stable compatible majors (`vitest@4`, `@testing-library/react@16`, `@testing-library/jest-dom@6`, `jsdom@26`, `@playwright/test@1`, `@axe-core/playwright@4`) with `--save-exact`; record actual resolved versions and audit results. Do not install beta tags or modify global Node/Expo login. Assert `toSitePath('/news/a', '/cnm/') === '/cnm/news/a'`; root target returns `/news/a`; `/cnmother/news` is not a CNM-prefixed route; malformed percent encoding returns not-found rather than throwing. Set `test:unit`, `test:browser`, and `typecheck` scripts as specified in the master plan.
- [ ] **Step 2:** Run `npm run test:unit -- tests/unit/paths.test.ts`; observe failing assertions/missing path implementation, not a dependency-load failure.
- [ ] **Step 3:** Implement the interfaces above. `CNM_DEPLOY_TARGET=pages` maps to base `/cnm/` and the repository Pages origin; `domain` maps to `/` and the verified configured CNM origin. Vite's base, asset helpers, router, canonical links, and auth return URLs use this one choice. The finalizer retains a correctly based `404.html`; include `CNAME` only for the domain target. The test server must return 404 with the fallback HTML for unknown static paths, rather than silently rewrite everything to HTTP 200. Remove the old runtime hostname/path hacks only after replacing their consumers.
- [ ] **Step 4:** Run the unit test, `npm run typecheck`, and `CNM_DEPLOY_TARGET=pages npm run build`. Run `npm run test:browser -- tests/browser/routes.spec.ts`; assert home, account, article refresh, Back/Forward, modifier-click links, logo, CSS, and JS requests work with the Pages-like server. Repeat the build/browser test with `CNM_DEPLOY_TARGET=domain`. Record that a rendered fallback article can still have HTTP 404; do not describe that as completed server-rendered SEO.
- [ ] **Step 5:** Commit only the path/config/test deliverable and lockfile: `fix: unify CNM deployment paths and verify refreshed routes`.

## P2. Build the approved publication and language system against legacy content

**Files:** Create the design, navigation, article, contract, and shared-i18n files in the file map. Add `tests/unit/publication.test.tsx`, `tests/unit/locale.test.ts`, `tests/fixtures/articles.ts`. Extract public screens from `src/App.tsx`; keep compatibility exports from `src/data.ts` and `src/i18n.ts`. Modify `src/styles.css` to import the new design rules.

**Interfaces:** `Locale = 'en' | 'fr' | 'ht' | 'es'`; `normalizeLocale(value: unknown): Locale`; `selectArticleLocale(article: PublicArticleRecord, requested: Locale): LocalizedArticle`. `LocalizedArticle` includes `requestedLocale`, `shownLocale`, `missingTranslation`, `availableLocales`, `title`, `summary`, `body`, and `blocks`. `PublicArticleRecord` retains all baseline fields and accepts optional `author_credit`, `public_revision`, `content_blocks_i18n`, `is_sponsored`, and `sponsor_credit` added by M1. `loadPublication(signal: AbortSignal): Promise<PublicationResult>` returns articles/programs/error states without silently converting all failures to empty arrays.

- [ ] **Step 1:** Write tests asserting invalid storage values normalize to `en`; every shipped key exists in all four dictionaries; French-only content requested in `ht` is explicitly labelled `fr`; no fabricated translation appears. Assert empty editorial/program lists produce a useful station/participation layout without blank story cards, invented names or dates. Assert an aborted old article request cannot overwrite the next slug. Add keyboard-operable story links and a localized error/retry assertion.
- [ ] **Step 2:** Run `npm run test:unit -- tests/unit/publication.test.tsx tests/unit/locale.test.ts` and record the expected failures.
- [ ] **Step 3:** Implement the interfaces and white-led layout: 1440px maximum publication width, 60-75ch reading column, dominant story/program beside latest reporting, real category sections, radio strip, participation and sponsorship entry points. Keep present pages working during extraction. Import the exact PNGs supplied at `/mnt/data/cnm-website/public/cnm-logo-black.png` and `cnm-logo-white.png` into the repository asset paths; record SHA-256 and visually compare against the supplied sources before switching logo references. Do not reconstruct the mark from the existing approximate SVGs. Remove ornamental waveforms/glass/gradient hero decoration. Omit Watch until published compatible media exists. Persist language with guarded storage access; language switches preserve in-progress forms. Supply a visible account destination on mobile.
- [ ] **Step 4:** Run the P2 unit tests, `npm run typecheck`, and both target builds. Inspect screenshots at 320, 390, 768, 1440, and 1920 CSS-pixel widths using only local test fixtures for seeded stories; fixtures must never be deployed as real CNM content. Record empty and populated views and compare logo contours/aspect ratio.
- [ ] **Step 5:** Commit the publication deliverable: `feat: create CNM editorial homepage and four-language reading shell`.

## P3. Make radio and programs honest and persistent

**Files:** Create the radio/programs modules from the file map plus `tests/unit/radio.test.ts`, `tests/unit/programs.test.ts`, and `tests/browser/radio.spec.ts`. Replace existing duplicated player/schedule behavior in `src/App.tsx` only after tests cover it.

**Interfaces:** `RadioState = 'off-air' | 'idle' | 'connecting' | 'playing' | 'paused' | 'offline' | 'failed'`; `reduceRadio(state, event): RadioState`; `selectStream(config, lowData: boolean): string | null`; `resolveProgram(slots: ScheduleSlot[], instant: Date): {current: ScheduleSlot | null; ambiguous: boolean}`. `useRadio()` provides `{state, play, pause, retry, streamAvailable}` from one audio element, mounted above routes.

- [ ] **Step 1:** Write tests: null/disabled stream is off-air, has disabled play and no spinner; configured URL remains idle until a user action; `waiting` enters connecting; no progress for 15 seconds enters failed with Retry; pause/navigation cancels the old timer; `playing` rather than configuration proves playback. This 15-second timeout is an implementation choice. Assert no fallback to a different station, no synthetic lower bitrate, and no auto-play on page load. Program tests cover effective dates, an overnight slot, invalid timezone, DST transitions, and overlapping/ambiguous slots that yield no asserted current show.
- [ ] **Step 2:** Run `npm run test:unit -- tests/unit/radio.test.ts tests/unit/programs.test.ts` and confirm expected failures.
- [ ] **Step 3:** Implement one provider/controller, use native audio events and request-generation identifiers to suppress stale events, and expose translated states/retry controls. Cancel timers/subscriptions on source replacement or disposal. Use IANA timezone conversion through `Intl` with tested schedule resolution; show the schedule's timezone, not hardcoded AM/PM or the developer's timezone. Do not change Supabase stream values. Keep media-session integration optional and capability checked. Reserve mini-player space so content remains usable.
- [ ] **Step 4:** Run unit tests and `npm run test:browser -- tests/browser/radio.spec.ts` with a local audio fixture. Verify navigation preserves the player, simulated failure terminates connecting, and reduced-data selection only chooses a supplied alternate URL. Live CNM playback remains unverified until its actual stream exists; record that separately from fixture results.
- [ ] **Step 5:** Commit: `feat: add persistent radio state and timezone-aware program views`.

## P4. Verify accessible publication and protect the preview boundary

**Files:** Add `tests/browser/publication.spec.ts`, `tests/browser/accessibility.spec.ts`, `tests/browser/forms.spec.ts`, `docs/verification/cnm-publication.md`, and the check-only workflow. Update affected design/dialog/account files and route metadata.

**Interfaces:** `Dialog` accepts `{open, title, onClose, children}` and implements focus containment/Escape/focus return. `Field` exposes labelled input, per-field error ID, and native composition-safe change events. `setPageMetadata({title, description, canonical, noIndex}): void` updates client-visible metadata without claiming it changes initial server HTML.

- [ ] **Step 1:** Add failing tests for keyboard-only navigation, mobile-menu focus return, long translated labels, form-value preservation on language switch, invalid saved locale, article slug changes, account session errors, and no nested interactive controls. Assert every main interactive target is at least 44x44 CSS pixels and no horizontal overflow at 320px. Check that no video/third-party player request happens in this deliverable before explicit media activation.
- [ ] **Step 2:** Run `npm run test:browser -- tests/browser/publication.spec.ts tests/browser/accessibility.spec.ts tests/browser/forms.spec.ts` and observe the specific failing behavior.
- [ ] **Step 3:** Implement the accessible primitive fixes, error boundaries, scoped page metadata, lazy-load rules, and layout adjustments. No autofocus that unexpectedly opens the phone keyboard. Add a check-only PR workflow with reproducible installs and screenshots; do not enable main-branch deployment for unfinished tasks. Preserve public reading/listening and existing account flows. A missing privacy/legal route remains outside release completion until O3, not silently claimed as present.
- [ ] **Step 4:** Run the complete unit/browser suite and both production builds; review screenshots at the P2 widths, 200% text enlargement, reduced motion, and landscape. Test software-keyboard overlap/composition on a real iOS Safari and Android Chrome session when available; a desktop viewport emulation is not that verification. Document any unavailable real-device checks as release gaps. Scan built assets for privileged credentials and confirm only the publishable client configuration exists. Record status-code/social-preview limitations explicitly.
- [ ] **Step 5:** Commit: `test: verify CNM publication accessibility and preview readiness`. Present the actual rendered preview/screenshots before proposing a production merge.

## Completion boundary

This deliverable can run with the existing schema and honest off-air/empty-content states. It does not enable new admin media writes, send inquiry emails, collect payments, assign admins, or publish legal terms. M1-M4 and O1-O4 own those additions. All checkboxes remain unchecked until their tests and changes are actually performed.
