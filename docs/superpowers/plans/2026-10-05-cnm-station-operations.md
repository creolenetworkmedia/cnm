# CNM Station Operations and Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver useful contact/sponsorship pages, private inquiry and contribution review workflows, radio-specific policy drafts, and evidence-based release verification.

**Architecture:** Standalone public forms call narrowly scoped validated server endpoints; private inbox data is accessible only to authorized admins. Reader contributions retain the existing mobile-compatible submission fields while attaching media through the verified private intake flow. Policies are reviewed against the implemented data flows before public activation.

**Tech Stack:** Existing React/TypeScript/Vite and Supabase services; P1 unit/browser infrastructure; M1 trusted auth and M2 private media; reviewed static policy content. No email or payment provider is provisioned by assumption.

**Spec:** `docs/superpowers/specs/2026-10-05-cnm-editorial-redesign-design.md`, sections 8-12.

## Global Constraints

All constraints in `2026-10-05-cnm-redesign.md` apply. Exact spec requirements emphasized here:

- Provide English (`en`), French (`fr`), Haitian Creole (`ht`), and Spanish (`es`).
- Do not invent articles, presenters, audience statistics, sponsors, rates, radio URLs, testimonials, contact numbers, or legal/business claims.
- Account creation alone is not anti-spam protection.
- An inquiry is not a contract or a reservation.
- Do not expose account emails as author names.
- The website must not collect card data or label contributions tax-deductible without the required basis.

The supplied contact address is `creolenetworkmedia@gmail.com`; mailbox ownership/delivery and the operator named in the earlier brief require confirmation. Legal documents are drafts until approved; do not add unverified telephone/address/WhatsApp details or infer music-licensing/charitable status.

## Review Focus

- Anonymous callers must not enumerate inbox records or alter their status through an alternate endpoint (O1).
- Resubmitting after a timeout must return the existing receipt, not insert or email twice (O1/O2).
- A reader must not attach someone else's photo, forge approval, or publish a submission (O2).
- Consent must not silently authorize marketing, imply paid sponsorship, or claim delivery/payment success (O2/O3).
- A green CI run with broken public assets, a dead custom domain, or absent real stream is not a completed launch (O4).

## File map

- `src/shared/contracts/inquiries.ts`: validated contact/sponsor payloads, status/receipt types, error codes.
- `src/features/contact/ContactPage.tsx`, `contact.api.ts`: standalone categorized contact form and confirmed station contact details.
- `src/features/sponsorship/SponsorPage.tsx`: commercial inquiry content/form, distinct from donations.
- `src/features/contributions/SubmitStoryPage.tsx`, `contributions.api.ts`: private authenticated article/photo/video submission.
- `src/features/editorial/InboxPage.tsx`, `InquiryDetail.tsx`, `SubmissionReview.tsx`: authorized review, status transitions, and private notes.
- `src/features/support/SupportPage.tsx`: non-looping verified destination or truthful contact-based fallback.
- `src/policies/en.ts`, `fr.ts`, `ht.ts`, `es.ts`, `manifest.ts`, `PolicyPage.tsx`: reviewed Terms/Privacy/Editorial text and versions.
- `supabase/functions/cnm-inquiries-v1/index.ts`, `_shared/inquiries.ts`, `_shared/quotas.ts`: public validated intake and admin-only inbox actions.
- `supabase/functions/cnm-contributions-v2/index.ts`: existing-field-compatible contributions and explicit review/adoption.
- `supabase/tests/inquiries.test.sql`, `contributions.test.sql`, `compatibility.test.sql`: alternate API, role, quota and mobile checks.
- `tests/unit/inquiries.test.ts`, `policies.test.ts`, `tests/browser/inquiries.spec.ts`, `contributions.spec.ts`, `release.spec.ts`: data and browser proof.
- `docs/legal/cnm-policy-review.md`, `docs/verification/cnm-redesign-release.md`, `scripts/verify-public-site.mjs`: approval inventory, actual release evidence, and live URL checks.

## O1. Store contact and sponsorship inquiries behind a trusted boundary

**Files:** Create inquiry contracts, server handler/quota modules, local SQL/function tests. Generate `supabase/migrations/*_cnm_web_inquiries_v1.sql` using CLI-managed filenames.

**Interfaces:** `ContactInput = {name, email, category, message, relevantUrl?, locale, policyVersion, requestId}`; category is `general | technical | sponsorship | editorial | correction | copyright`. `SponsorInput` additionally requires `organization` and `interest: 'radio' | 'website' | 'community'`, with optional `budgetRange`. `submitInquiry(input): Promise<{reference: string; stored: true; emailStatus: 'not-configured' | 'accepted' | 'failed'}>`. Receipt is a random non-enumerable reference, not authority to read the record. Admin `listInquiries({cursor?, status?})` and `updateInquiry({id, expectedRevision, status, note?, requestId})` use trusted-role checks.

- [ ] **Step 1:** Write failing validation tests with exact caps: name 80, email 254, organization 160, message 5,000, URL 2,048, optional budget text 80 characters; required strings must not be whitespace. Allow only valid HTTP/HTTPS reference links and never fetch them server-side. Assert unexpected owner/status/note fields are rejected, anon cannot SELECT/UPDATE inbox rows, non-admin and legacy editor cannot use admin endpoints, repeated same request/payload yields one row, same request/different payload is 409. These limits are implementation choices, not client pricing or legal requirements.
- [ ] **Step 2:** Run `npm run test:unit -- tests/unit/inquiries.test.ts`, local function tests, and `supabase test db`; record the expected missing-contract failures.
- [ ] **Step 3:** Add private `cnm_web_inquiries`, `cnm_web_inquiry_events`, and private idempotency/quota records with revoked client grants and RLS. Use a service-only RPC `public.cnm_web_inquiry_service_v1(p_actor uuid, p_action text, p_payload jsonb, p_request_id uuid)`; derive actors through M1 authentication for admin calls and allow no arbitrary JSON actor override. Enforce length/schema validation, per-action rate limits, and atomic request-key/body-hash receipts server-side. Proposed initial quotas: authenticated actor 8 submissions per 30 minutes, guest network 5 per hour, and global inquiry intake 60 per hour; configure them in one server module. A network signal must come from a verified gateway contract, not a caller-supplied ID or User-Agent. Retain the global limit when a trusted network signal is unavailable and record that limitation. Return 429 with Retry-After. Do not expose private notes/emails in public APIs, logs, or receipts. Initially store inbox items without sending email; never return `accepted` without a configured provider acceptance result.
- [ ] **Step 4:** Re-run the tests, including concurrent duplicates and alternate REST/RPC attempts. Verify no user can self-assign an inbox role, change a status with a stale revision, or enumerate other references. Confirm malformed/spam requests do not consume unbounded payload storage. Record private data retention as an operator-review gate rather than inventing a retention promise.
- [ ] **Step 5:** Commit: `feat: add validated private CNM contact and sponsor inbox`.

## O2. Deliver the public participation pages and admin review UI

**Files:** Create the contact/sponsor/contribution/inbox/support React/API files, contribution server handler, and `tests/browser/inquiries.spec.ts`, `tests/browser/contributions.spec.ts`. Add all four-language labels/messages and shared navigation entries.

**Interfaces:** `submitContribution({title, body, locale, uploadIds, video?, consentVersion, requestId}): Promise<{reference}>` derives the authenticated user, creates a pending compatible `article_submissions` record and private attachment metadata. `reviewContribution({submissionId, expectedRevision, action: 'review' | 'accept' | 'reject', note?, requestId})` is admin-only. Accept may create an M1 private draft; it never publishes. `adoptSubmissionMedia({submissionId, draftId, uploadIds, requestId})` creates a server-checked explicit grant for that approved submission and draft, not blanket access to another user's uploads.

- [ ] **Step 1:** Add failing UI/API tests: contact and sponsorship have direct URLs, use the intended required fields, preserve input after failed requests/language change, and show a stored reference only after success. Sponsor statuses are New, In discussion, Agreed, Closed. Assert reader contributions stay pending, photos/video stay private, another user's upload IDs fail, admin notes are hidden, Accept does not create a public article, and Support never navigates to itself. Add small-screen focus/composition and denied/revoked-admin inbox tests.
- [ ] **Step 2:** Run `npm run test:browser -- tests/browser/inquiries.spec.ts tests/browser/contributions.spec.ts` and local contribution/policy tests; record the intended failures.
- [ ] **Step 3:** Implement standalone Contact and Sponsor pages with restrained text/form design. Explain radio, website/multimedia, and community partnership interests without inventing packages, rates, logos, metrics, or guarantees. Use supplied contact details accurately; do not fabricate a verified delivery claim. Implement contribution submission with the M2 private media flow, permission/version acknowledgement, and the existing text fields for app compatibility. Review/adoption requires an authorized admin, an accepted owned submission, the intended draft, and only that submission's verified tickets; M3 honors this explicit grant when validating media references. Accept still leaves publication as a separate action. Add private admin inbox/status/notes and received-time display. Support opens only a verified non-self HTTPS payment destination; otherwise it leads to Contact, with no card fields or false payment button.
- [ ] **Step 4:** Test normal, repeated, offline, oversized and denied requests in all four languages. Inspect current mobile RPC/direct insert flows before changing shared policies; enforce the same required status/ownership/quotas at the database boundary so direct INSERT cannot bypass validation, while retaining compatible authorized older-client requests. Audit existing staff review policies when new submissions are stored in the shared table: new private notes/media never become visible merely because a legacy `editor` is authenticated. Verify both owners and explicitly authorized reviewers, not arbitrary other accounts. Test each page by direct URL/refresh under both build bases.
- [ ] **Step 5:** Commit: `feat: add CNM participation pages and authorized contribution review`.

## O3. Prepare and review radio-specific legal/editorial pages

**Files:** Create the four policy dictionaries, manifest/page, `docs/legal/cnm-policy-review.md`, and `tests/unit/policies.test.ts`; wire footer links and consent-version handling in the relevant forms.

**Interfaces:** `PolicyKind = 'terms' | 'privacy' | 'editorial'`; `PolicyDocument = {kind, version, locale, status: 'draft' | 'approved', effectiveDate: string | null, sections}`. `getPublicPolicy(kind, locale): PolicyDocument | null` returns only an approved language/version. `activePolicyVersion(kind): string | null` is the version accepted by server intake; browser-supplied versions are validated, not trusted. Approval metadata must be recorded from actual operator review, never inferred from a developer save.

- [ ] **Step 1:** Write failing tests for matching policy section keys across all four locales, no unapproved policy presented as final, unknown/tampered policy versions rejected by intake, consent not preselected, no bundled marketing permission, and accurate links from all public pages. Verify no legal statement claims tax deductibility, licenses, an invented address, or an arbitrary governing-law/arbitration clause.
- [ ] **Step 2:** Run `npm run test:unit -- tests/unit/policies.test.ts` and the intake policy-version test cases; record failures.
- [ ] **Step 3:** Draft original Terms covering availability/data costs, accounts, requests/dedications with no broadcast guarantee, permission to read supplied messages/names, submitter rights and limited non-exclusive publishing permission, prohibited conduct, moderation, external media, separate sponsorship agreements, payments, complaints and proportionate limitations for legal review. Draft Privacy from the actual implemented fields/processors: account data, submissions/attachments, contacts, preferences, Supabase, GitHub hosting, optional video services, and any verified email/payment provider. Draft Editorial policy covering submissions, review, corrections, photo/video rights, author credits and paid-content disclosure. Preserve terminology/meaning across EN/FR/HT/ES. Inventory operator name, mailbox ownership, retention/deletion procedures, and effective dates as explicit approval gates in the review record. Do not invent missing details or publish draft text as final. Until policy approval, public data-collection actions needing that acknowledgement remain gated; contact information can still be shown without pretending the form is operational.
- [ ] **Step 4:** Run policy/link/translation tests and inspect the actual UI with keyboard and screen-reader semantics. Obtain documented operator/legal review and confirm actual erasure/retention workflows before activating final text or related intake. Never use these terms as evidence that music rights are licensed. Record policy versions for accepted submissions without placing private message content in audit logs.
- [ ] **Step 5:** Commit drafts as `docs: prepare CNM radio terms privacy and editorial policies`; activate separately only after the documented review gate, with `feat: activate approved CNM policy versions`.

## O4. Verify, stage, and release without repeating the failed-deployment cycle

**Files:** Add `tests/browser/release.spec.ts`, `scripts/verify-public-site.mjs`, and `docs/verification/cnm-redesign-release.md`. Update the existing deployment workflow only after the preview checks pass; retain the main-only deployment boundary and add path filters so docs-only commits do not redeploy the site.

**Interfaces:** `verify-public-site.mjs` takes an explicit expected origin/base/release SHA, requests the deployed HTML and referenced assets, checks known direct routes with a browser, and reports structured pass/fail/blocked results. It does not treat HTTP 200 HTML or a successful workflow as sufficient by itself.

- [ ] **Step 1:** Add failing release checks for missing logo/CSS/JS, stale release identifier, incorrect base path, broken direct article/account links, a server fallback that hides a runtime crash, unauthorized admin actions, missing translations, and a support-link loop. Include an old mobile article reader fixture and unapproved-policy intake gate. Record expected failures against the deliberately broken test fixtures, not against production users.
- [ ] **Step 2:** Run `npm run test:browser -- tests/browser/release.spec.ts` and observe the expected failed cases.
- [ ] **Step 3:** Implement the release probe, reviewed workflow/lockfile changes, and a recovery checklist. Preserve a known-good frontend artifact/commit; identify a real available database recovery method rather than assume a backup tier. Review migration diffs and apply additive changes first in a non-production target with the same role/grant structure. Apply to shared CNM only after compatibility tests, reviewed evidence, and authorization for that deployment step; no destructive reset, role assignment, unrelated table rewrite, Expo publish, or DNS change. Feature-gate unavailable runtime media/email/payment capabilities. Capture the private-to-public permission matrix and source/translation review results.
- [ ] **Step 4:** Run `npm ci`, the dependency audit, full unit/browser suites, local DB/function tests, both builds, and a production-equivalent preview. Resolve or clearly classify findings; do not force-upgrade dependencies or dismiss moderate warnings without review. Record viewport screenshots and available real iOS/Android keyboard tests. After the approved merge/deployment, verify the actual public homepage, route refreshes, article images/video activation, accounts, and admin authorization at the release SHA. Check domain/HTTPS and the real stream separately. Use bounded CI status checks, not repeated no-change polling. Report unavailable device/domain/stream/publisher/payment/email/legal prerequisites as explicit blocked capabilities, not completed tests.
- [ ] **Step 5:** Commit evidence and the reviewed release changes. Report exactly which commit is deployed, which URL was actually rendered, what tests passed, and what remains blocked. Do not call the full platform live based solely on a Play button, editor screenshot, or green Action.

## Completion boundary

All operations below are planned, not executed by creating this document. No production data, permissions, policy activation, admin assignment, email delivery, payment integration, or DNS change is authorized by a planning-stage test run. Legal approval and real service prerequisites are distinct from approval of the website design.
