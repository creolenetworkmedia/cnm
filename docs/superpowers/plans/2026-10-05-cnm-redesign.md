# CNM Website Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement these plans task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved photography-first CNM publication, private media publishing workspace, and station inquiry/legal pages without disrupting the existing mobile application.

**Architecture:** Three independently testable deliverables share one design system, localization contract, and existing CNM Supabase project. Preserve the React/Vite application and GitHub Pages deployment; introduce private drafts and trusted media/inquiry services additively. Do not replace the application or change hosting providers merely to implement the redesign.

**Tech Stack:** Existing React 19.1.1, TypeScript 5.9.3, Vite 7.1.7, Supabase JS 2.75.0; proposed Vitest unit/component tests, Playwright browser tests, and local Supabase policy/function tests. Existing versions are the inspected repository baseline, not a claim that they are the latest or free of advisories.

**Spec:** `docs/superpowers/specs/2026-10-05-cnm-editorial-redesign-design.md`

## Approval and execution state

The user approved the written specification and requested execution in this conversation. This commit records the execution plan for review; it does not represent implemented application changes. Direct implementation in this conversation is the intended execution method. No subagent capability is assumed.

The working documentation branch is `docs/cnm-editorial-redesign-2026-10-05`. The inspected application baseline is `c5c49c7808b6c3b0895a9d36b9150f815819232c`; its only difference from the documentation branch before this plan was the specification. Start implementation in an isolated worktree/branch based on the approved documentation head. Check for intervening repository changes before starting.

## Global Constraints

The following requirements are copied from the approved specification and apply to every linked plan:

- Preserve CNM's approved logo and the client's blue, white, and red identity.
- Provide English (`en`), French (`fr`), Haitian Creole (`ht`), and Spanish (`es`).
- Allow public radio listening and reading without signing in. Accounts remain optional for those activities.
- Only explicitly assigned CNM admins may publish official articles.
- Keep design, feature behavior, translations, and data access separated.
- Continue sharing CNM's existing Supabase backend with the mobile app. Do not modify Koneksyon, its credentials, its repositories, or its database.
- Do not invent articles, presenters, audience statistics, sponsors, rates, radio URLs, testimonials, contact numbers, or legal/business claims.
- Keep existing `articles` identifiers, slugs, `title_i18n`, `excerpt_i18n`, `body_i18n`, `hero_media_id`, and publication fields usable by the mobile app.
- Only a publishable browser key may ship. Privileged secrets stay server-side.
- No implementation completion or live-site availability is claimed by this document.

Additional exact spec targets: publication container around 1440 CSS pixels; article text near 60-75 characters per line; reflow at 320 CSS pixels; interactive areas at least 44 by 44 CSS pixels; JPEG/PNG/WebP/AVIF subject to verified decoding; 10 MB input-image ceiling; cover plus up to 10 additional photos; 320/640/1280/1920-pixel derivative ladder without upscaling; YouTube/Vimeo links, not raw video uploads.

For implementation, interpret the image ceiling as 10 MiB = 10,485,760 bytes, matching the inspected storage configuration. Numeric choices not fixed by the spec must be identified as implementation choices in the owning task, not attributed to the client.

## Review Focus

1. Pages paths that work after a click but fail on refresh: Public Task P1 tests both `/cnm/` and `/`, nested article URLs, asset requests, and malformed paths.
2. Revoked access or another tab changing an article during upload: Media Tasks M1/M3/M4 check server authorization, ownership, expected revisions, and retention of the last published snapshot.
3. Accented/long text, invalid stored locale, and keyboard overlap: Public Tasks P2/P4 and Operations Task O2 test language preservation, reflow, focus, composition, and mobile viewport changes.
4. Large, corrupt, disguised, or metadata-bearing uploads: Media Task M2 validates actual bytes, bounded decoding, private storage, and real derivatives before enabling media publication.
5. Duplicate inquiry/publish retries and apparently successful failures: Media Task M3 and Operations Tasks O1/O3 require idempotency, revision checks, and truthful persisted/delivered states.

## Separate implementation plans

1. [Public publication and radio](2026-10-05-cnm-publication.md) - Tasks P1-P4. Produces a functioning redesigned site against the current article schema; richer media is optional until the second deliverable is enabled.
2. [Private editorial workspace and media](2026-10-05-cnm-editorial-media.md) - Tasks M1-M4. Produces validated private uploads, revision-safe publishing, galleries/video, and legacy article-field compatibility.
3. [Contact, sponsorship, contribution review, and legal pages](2026-10-05-cnm-station-operations.md) - Tasks O1-O4. Produces operational private inboxes and reviewed policies, followed by release verification.

Execute in that order. A task may not skip an unresolved dependency by enabling a decorative placeholder. Each plan defines file ownership, interfaces, failing tests, implementation steps, verification, and commits. Public implementation can be previewed before backend work; that is not approval to merge unfinished operational features.

## Repository and verification conventions

- Existing application files: `src/App.tsx`, `src/data.ts`, `src/i18n.ts`, `src/styles.css`, `src/supabase.ts`, `src/main.tsx`, `vite.config.ts`, `index.html`, `.github/workflows/deploy-pages.yml`.
- New folders: `src/app`, `src/design`, `src/shared`, `src/features`, `src/policies`, `tests/unit`, `tests/browser`, `tests/fixtures`, `supabase/functions`, `supabase/tests`, `docs/verification`.
- Split only the page, service, and state boundaries touched by these deliverables. Keep compatibility exports in `src/data.ts` and `src/i18n.ts` while existing consumers are migrated.
- P1 creates `test:unit` = `vitest run`, `test:browser` = `playwright test`, and `typecheck` = `tsc --noEmit`. The existing build still includes typechecking.
- P1 pins resolved test dependencies with `--save-exact`, commits `package-lock.json`, and switches CI to `npm ci`. Do not run a forced audit upgrade. Review advisories before retaining or changing production dependencies.
- M1 creates local schema/policy fixtures from the actual CNM migrations and grants, without copying real user data. Before using Supabase CLI commands, inspect the installed CLI help. Generate migration filenames using `supabase migration new`; do not fabricate timestamps.
- Every task follows failing test -> observed expected failure -> minimal implementation -> passing test -> commit. Record the command and exit result, not a predicted checkmark.
- Tests run against local fixtures or an explicitly authorized non-production target. Never use the shared CNM production database as a test fixture.
- This documentation branch does not run the current main-only deployment workflow. Do not change the deployed branch, DNS, Expo/EAS configuration, roles, or production schema during plan preparation.

## Release evidence and dependency gates

Final evidence belongs in `docs/verification/cnm-redesign-release.md`: release SHA, dependency audit result, unit/browser/policy test output, viewport screenshots, asset requests, direct-link/refresh checks, and unresolved limitations. A GitHub Actions success is not proof of a functioning public page.

Recheck these separately before calling the platform fully operational: a verified stream URL; a verified account explicitly authorized as publisher; actual editorial/program content; custom-domain DNS and HTTPS; a verified payment destination; a configured delivery provider for email alerts; confirmed operator/contact details and approved policies. Missing items retain honest off-air, inbox-only, contact-based, or unpublished-policy states.

The public-site launch and live radio broadcast are separate statuses. Do not claim that the radio works because a Play button exists. Do not claim that a contribution emailed successfully because it was inserted into a database.

## Planning-stage verification

The specification, repository package manifest, branch comparison, and selected Supabase columns/policies were read for this plan. The read-only backend check confirms that private draft/revision and inquiry structures described here are new work, and that the radio URLs remain unconfigured. No personal account records or private submissions were requested.

External technical references checked for this plan: Vite's static deployment/base-path guidance; Supabase's Image Manipulation example and hosted Edge Function limits. The media plan explicitly treats its image-processing resource budget as a runtime gate, not an assumed capability.

- https://vite.dev/guide/static-deploy.html
- https://supabase.com/docs/guides/functions/examples/image-manipulation
- https://supabase.com/docs/guides/functions/limits

## Handoff

Written specification: approved by the user. These implementation plans: awaiting review. After plan review, implement directly in this conversation, starting with P1 in an isolated worktree. Do not create another design-direction brainstorming round. Do not claim implementation has started before product files are actually changed.
