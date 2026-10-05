# CNM Editorial Workspace and Media Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let authorized CNM publishers write articles with private drafts, optimized photos, galleries, and supported video links, while readers can submit media for review without publishing it.

**Architecture:** Keep public `articles` and `media_assets` as the mobile-compatible published representation. Put draft/revision/upload state in new private relations behind authenticated server handlers; promote approved delivery images and commit a validated article snapshot through a revision-checked operation. Do not expose a service key or trust user-supplied role/owner/status fields.

**Tech Stack:** Existing Supabase Auth/Postgres/Storage and Edge Functions, React editor, shared TypeScript contracts, local SQL/function tests, Vitest/Playwright. A WASM image processor must pass the hosted-runtime acceptance test before media publication is enabled.

**Spec:** `docs/superpowers/specs/2026-10-05-cnm-editorial-redesign-design.md`, sections 6-9, 11-12. Depends on P1 test infrastructure and P2 content contracts.

## Global Constraints

All constraints in `2026-10-05-cnm-redesign.md` apply. Exact spec requirements emphasized here:

- Only explicitly assigned CNM admins may publish official articles.
- Keep existing `articles` identifiers, slugs, `title_i18n`, `excerpt_i18n`, `body_i18n`, `hero_media_id`, and publication fields usable by the mobile app.
- Use a separate private draft/revision representation so the live article does not change while an admin is editing.
- Do not store or render arbitrary scripts/iframe HTML pasted into article text.
- Do not weaken existing policies to make a failing request succeed.

Limits: 10,485,760 input bytes per image; cover plus at most 10 additional photos; permitted decoded formats JPEG/PNG/WebP/AVIF only when tested; no raw video upload. Target derivatives: 320/640/1280/1920 pixels, with no upscaling. New design safety choices: reject decoded images above 24,000,000 pixels or with multiple animation frames; publish WebP delivery images and retain a JPEG/PNG fallback as decoding support requires. Explain rejected formats/dimensions with translated field errors.

## Review Focus

- A forged request body or revoked admin must fail even if the editor is already open (M1/M3/M4).
- A stale second draft must not overwrite another tab/admin's published revision (M1/M3).
- Draft image URLs must not become publicly retrievable just because an upload completed (M2/M3).
- Corrupt, disguised, oversized, decompression-heavy, or unsupported images must fail within resource bounds (M2).
- A failed copy, database commit, network retry, or language switch must not erase the prior publication or duplicate a new article (M3/M4).

## File map and shared contracts

- `src/shared/contracts/article.ts`: baseline-compatible `PublicArticleRecord`, `ContentBlock`, and `VideoRef` from P2, now completed for rich content.
- `src/shared/contracts/editorial.ts`: `DraftSnapshot`, `DraftRecord`, typed action results, revisions, and error codes.
- `src/shared/media/video.ts`: URL normalization; no network fetch to untrusted input.
- `src/features/editorial/editorial.api.ts`, `EditorPage.tsx`, `DraftList.tsx`, `MediaPanel.tsx`, `Preview.tsx`, `useDraft.ts`: private editor behavior and explicit publication actions.
- `src/features/media/media.api.ts`, `ResponsivePhoto.tsx`, `VideoEmbed.tsx`: upload lifecycle, delivery sizes, click-to-load player.
- `supabase/functions/_shared/auth.ts`, `errors.ts`, `contracts.ts`: trusted request authentication and validation.
- `supabase/functions/cnm-editorial-v2/index.ts`: user-authenticated draft/publishing endpoint.
- `supabase/functions/cnm-media-v2/index.ts`, `processor.ts`: private upload tickets, bounded verification/derivatives, status/retry.
- `supabase/tests/editorial.test.sql`, `media.test.sql`, `compatibility.test.sql`: private access and old-client contract tests.
- `tests/unit/video.test.ts`, `editorial.test.tsx`, `tests/browser/editorial.spec.ts`: safe media rendering and editor flows.
- `docs/verification/cnm-media.md`: resource measurements, format support, policy tests, and compatibility evidence.

`VideoRef = {provider: 'youtube' | 'vimeo'; videoId: string}`. Initially support public canonical videos only; unsupported private/unlisted URL forms get a translated explanation rather than silently dropping required access parameters. Verify Vimeo's published embed behavior before enabling Vimeo.

`ContentBlock` is a discriminated union of paragraph, heading (level 2 or 3), image, gallery, and video. Published photo blocks reference public `media_assets.id` with caption/credit/alternative text. `DraftSnapshot` uses the same text structure but may reference an owned private upload ticket; the public renderer must never accept a private-upload reference. All localized text remains keyed by `en/fr/ht/es`.

`DraftRecord = {id, articleId, draftRevision, basePublicRevision, basePublicUpdatedAt, snapshot, updatedAt}`. Each draft belongs to its creating admin; another admin can make a separate draft of the same article, but cannot read/write that private draft. A reviewer may access a reader submission only through the explicit review operation defined in O2.

## M1. Introduce private revision storage and enforce publisher authorization

**Files:** Create the contract/auth/editorial function files above, local Supabase baseline fixtures, `supabase/tests/editorial.test.sql`, and `supabase/tests/compatibility.test.sql`. Generate `supabase/migrations/*_cnm_web_editorial_v2.sql` with the CLI. No production migration in this task.

**Interfaces:** Browser `loadDraft(id): Promise<DraftRecord>`, `saveDraft(input: {draftId?, articleId?, expectedDraftRevision, basePublicRevision, basePublicUpdatedAt, snapshot, requestId}): Promise<DraftRecord>`. Server routes authenticate the bearer token and derive the actor independently of JSON. Service-only database entry point `public.cnm_web_editorial_service_v1(p_actor uuid, p_action text, p_payload jsonb, p_request_id uuid)` executes narrowly defined actions against private relations and rechecks the actor's current trusted role. Revoke its execution from PUBLIC, anon, and authenticated; only the backend service may invoke it. Definer functions use a fixed empty search path and schema-qualified relations.

- [ ] **Step 1:** Reconstruct the current CNM schema/migrations and relevant function contracts locally without importing production user records. Add local test identities for guest, ordinary A/B, legacy editor, admin A/B, and revoked admin. Add failing tests: only admin/super_admin may create drafts; actor/role spoofing fails; drafts are not exposed by public REST; admin B cannot read admin A's draft; stale expected revision is a conflict; repeated request ID returns the same result; a normal user cannot invoke service-only RPCs. Keep the existing role-assignment process out of this migration.
- [ ] **Step 2:** Run `supabase test db` locally and the authenticated function test harness. Record expected missing-schema/authorization-contract failures before implementing the relations/functions.
- [ ] **Step 3:** Add private `cnm_web_drafts`, `cnm_web_article_revisions`, and `cnm_web_action_receipts` with RLS, revoked client grants, indexes, actor/revision fields, and request-body hashes. Add optional public article fields `public_revision`, `author_credit`, `content_blocks_i18n`, `is_sponsored`, and `sponsor_credit` without renaming legacy fields. Draft saves write private rows only. Each draft stores the current legacy `updated_at` as well as revision so an old mobile write is detected. Keep the legacy mobile article API working; if a legacy body update leaves structured blocks stale, clear the changed locale's structured representation and fall back to the updated plain text. Audit any existing legacy-editor write path that could alter public article media; enforce the user-approved admin-only boundary without widening other access.
- [ ] **Step 4:** Run local DB/function tests and a legacy fixture query for `id,slug,title_i18n,excerpt_i18n,body_i18n,hero_media_id,status,published_at,updated_at`. Verify client grants, function execute permissions, and old text/cover rendering. Capture the migration/recovery diff for review. Do not apply it to the shared project until the full compatibility gate passes.
- [ ] **Step 5:** Commit: `feat: add private CNM editorial drafts and revision checks`.

## M2. Implement private photo intake and safe video normalization

**Files:** Create media function/client/processor files, `src/shared/media/video.ts`, `tests/unit/video.test.ts`, private-media SQL/function tests, and `docs/verification/cnm-media.md`. Generate `supabase/migrations/*_cnm_web_media_v2.sql` using the CLI.

**Interfaces:** `beginMediaUpload({purpose: 'draft' | 'submission', targetId, fileName, byteLength, mimeType, requestId}): Promise<{uploadId, uploadUrl, expiresAt}>`; `processMediaUpload(uploadId): Promise<MediaUploadState>`; `MediaUploadState = {id, status: 'allocated' | 'uploaded' | 'processing' | 'ready' | 'failed', variants, errorCode?}`. `normalizeVideoUrl(raw: string): VideoRef | null` allows only validated HTTPS YouTube/Vimeo public forms with strict provider host/ID parsing. The server validates normalized objects again.

- [ ] **Step 1:** Write failing tests for fake `.jpg` HTML, SVG, corrupt bytes, 10,485,761 bytes, oversized decoded dimensions, animated images, another user's target/ticket, ticket reuse, and modification after verification. Valid local fixtures must keep raw originals/private derivatives inaccessible to anon and other users. Video tests include valid `youtube.com/watch?v=...`, `youtu.be/...`, and public `vimeo.com/<digits>`; reject `javascript:`, iframe markup, credentials in URLs, look-alike domains, arbitrary hosts, malformed IDs, and unsupported private URL forms.
- [ ] **Step 2:** Run `npm run test:unit -- tests/unit/video.test.ts`, local media function tests, and `supabase test db`; verify the intended failures.
- [ ] **Step 3:** Create private `cnm-web-intake` and `cnm-web-staged` buckets through supported Storage operations and a private ticket/variant mapping. Readers may obtain tickets only for their own submission; admins may obtain tickets for their own draft. Server-generated unguessable paths, no overwrite, bounded ticket expiry, quotas, JWT validation, and ticket ownership are mandatory. Use a pinned WASM ImageMagick dependency following the current Supabase example, not native Sharp in Edge Functions. Inspect actual file format/dimensions, bound resources, strip unnecessary metadata, preserve orientation/aspect ratio, and produce the size ladder without upscaling. Derivatives stay private while the draft/submission is private. Processing status/retry is resumable; do not promise a background worker exists. All provider embeds come from fixed templates, never pasted HTML.
- [ ] **Step 4:** Run image fixtures for supported formats through the real target runtime, including 10 MiB and high-resolution inputs; measure memory and CPU. Supabase currently documents 256 MB memory and 2 seconds CPU per request, and warns large-image processing can exceed limits. Enable only verified formats/operations. If the four-size processing budget cannot be met, keep publishing this media path disabled and report the precise failed measurement; do not silently add a paid transformation service or external worker. Verify private URLs remain private, downloads require authorized short-lived access, stored hashes prevent post-check replacement, and duplicate ticket requests do not consume duplicate quota. Repeat the tests and commit only if the declared contract is met.
- [ ] **Step 5:** Commit: `feat: validate private CNM photos and normalized video links`; record enabled format/resource coverage and any unresolved hosting gate.

## M3. Publish coherent snapshots without damaging the previous article

**Files:** Extend `cnm-editorial-v2`, its private service actions, `editorial.api.ts`, public article/model queries, and local publication/compatibility tests. Add `supabase/functions/_shared/publish.ts` and `tests/unit/publication-actions.test.ts`.

**Interfaces:** `publishDraft({draftId, expectedDraftRevision, expectedPublicRevision, expectedPublicUpdatedAt, requestId}): Promise<{articleId, publicRevision}>`; `unpublishArticle({articleId, expectedPublicRevision, requestId})`; `deleteArticlePermanently({articleId, expectedPublicRevision, requestId})`. Draft creation allocates a stable intended article ID privately; no public draft is created merely to reserve a slug. All action responses distinguish conflict, forbidden, invalid-media, and transient failure.

- [ ] **Step 1:** Add failing tests: Save draft never changes a live article; Publish creates exactly one article; repeated same request is idempotent, changed payload with the same request ID conflicts; Update retains first publication time and advances modification time; Unpublish changes public visibility; Delete is separate; media validation/copy failure retains the old public snapshot and private draft; an intervening legacy or admin write conflicts; revocation after upload denies final publication.
- [ ] **Step 2:** Run `npm run test:unit -- tests/unit/publication-actions.test.ts`, local function integration tests, and `supabase test db`; capture failures.
- [ ] **Step 3:** Implement a publish intent bound to a draft revision and actor. Validate all locale content, ownership, media state, permissions, and slug uniqueness before promoting any derivative. Only an explicit authorized Publish/Update request may promote verified staged derivatives to public delivery paths. Finalize the database snapshot transactionally with a current role/revision recheck, legacy plain-text body and cover fields, richer blocks, public revision, and audit row. Storage and SQL are not one transaction: track promotion receipts, clean unreferenced copies after a failed finalize, retain the previous publication, and report an error rather than a partial success. Never copy draft originals into the public bucket. Use the same checked snapshot to derive both text and rich blocks. Publicly released files may have been cached and must not be promised retroactively confidential after unpublish.
- [ ] **Step 4:** Re-run all publication/policy/compatibility tests with injected failure at each promotion/finalize boundary. Verify normal users and legacy editors cannot mutate article media through an alternative API. Verify no emails appear as author credits and promotional cards/articles both carry translated disclosure text. Test all actions with a revoked session and different request IDs. Document the recovery behavior and unchanged old-client field semantics.
- [ ] **Step 5:** Commit: `feat: publish CNM article revisions with safe explicit lifecycle actions`.

## M4. Build the editor and reader media experience

**Files:** Create the React editorial/media files from the file map; add `tests/unit/editorial.test.tsx`, `tests/browser/editorial.spec.ts`, and `tests/browser/article-media.spec.ts`. Extend the P2 article reader and add `src/features/articles/WatchPage.tsx`.

**Interfaces:** `useDraft()` returns the typed draft, dirty/saving/saved/error/conflict states and explicit Save/Publish/Unpublish/Delete methods. `ResponsivePhoto({asset, alt, caption, credit, priority, lowData})` reserves dimensions and supplies actual derivative candidates. `VideoEmbed({video, label, locale})` does not create an iframe or request a remote preview before the user's click. The viewer builds YouTube/Vimeo source URLs from `VideoRef`, with an available provider-link fallback.

- [ ] **Step 1:** Write failing tests for cover plus 10 photos accepted and the 12th total photo rejected; caption/credit/alternative-text preservation; invalid-video translated errors; unsaved-work warnings; a failed save never showing Saved; dirty work surviving global/editor language changes; Save not unpublishing; conflict giving Reload/keep-copy options rather than overwriting; guest/ordinary/editor/revoked-admin gates. Browser tests assert zero third-party video requests before activation and correct provider loading after activation.
- [ ] **Step 2:** Run `npm run test:unit -- tests/unit/editorial.test.tsx` and the two browser test files; record failures.
- [ ] **Step 3:** Implement the restrained editor workspace with explicit actions, upload progress/errors, cover/gallery ordering, per-language fields, public author credit and paid-content disclosure. Allow publishing one valid language and identify missing translations. Render authorized previews from private draft data without public publication. Add responsive photos, captions, click-to-load video and related published stories to the reader. Watch lists only public articles with valid supported video; unavailable videos retain a source link. Clear private draft/media state from memory on sign-out or access revocation; avoid indefinite persistent caching of drafts. Keep typed unsaved input recoverable after transient network failure without caching another user's private data.
- [ ] **Step 4:** Run all media/editorial tests, both builds, and real-device keyboard checks. Verify photo requests choose appropriate sizes, hero priority is correct, and 320px/reduced-data mode does not download raw originals. Compare an old app-shaped article fixture against the public database response. Recheck only CNM permissions and dependency/advisor warnings; report remaining findings without describing the app as universally secure. New handlers remain gated until local/runtime and reviewed migration prerequisites pass.
- [ ] **Step 5:** Commit: `feat: deliver CNM multimedia editorial workspace and article reader`.

## Release boundary and references

Do not create an admin account, assign roles, migrate production, or publish a real article as a test. A user-authorized verified publisher is a separate launch prerequisite. Applying additive migrations is permitted only after reviewed compatibility evidence and a recoverable rollout plan; the first application should be to a non-production environment.

The inspected repository exposes original-image uploads and direct article operations; this plan replaces the new website's use of those paths while retaining tested older-client behavior. No new image processing, security guarantee, or live broadcast is claimed by this document.

Primary technical references for the runtime gate:
- https://supabase.com/docs/guides/functions/examples/image-manipulation
- https://supabase.com/docs/guides/functions/limits
- https://supabase.com/docs/guides/storage/security/access-control
- https://developers.google.com/youtube/player_parameters
- https://developer.vimeo.com/player/sdk
