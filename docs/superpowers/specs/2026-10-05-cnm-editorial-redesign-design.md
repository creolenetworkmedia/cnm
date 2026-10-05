# CNM editorial website redesign — design specification

Date: 2026-10-05  
Repository: `creolenetworkmedia/cnm`  
Baseline inspected: `c5c49c7808b6c3b0895a9d36b9150f815819232c`  
Status: **Design direction approved in conversation; written specification awaiting review.**  
Scope of this commit: documentation only. No application, deployment, database, account, permission, or DNS changes.

## 1. Intent and non-negotiables

Build a substantial Creole Network Media publication that also broadcasts radio. The approved direction is white-led, photography-first, with CNM blue and restrained red accents. It must not resemble a generic software landing page. The intended audience includes readers/listeners on phones, desktops, and expensive or unreliable mobile connections.

Requirements carried directly from the conversation:

- Preserve CNM's approved logo and the client's blue, white, and red identity.
- Make the website feel larger through useful editorial structure, not decorative empty space or giant slogans.
- Provide English (`en`), French (`fr`), Haitian Creole (`ht`), and Spanish (`es`).
- Allow public radio listening and reading without signing in. Accounts remain optional for those activities.
- Only explicitly assigned CNM admins may publish official articles.
- Support article photos, photo credits/captions, and linked video, plus private reader submissions for review.
- Add meaningful Contact, Sponsorship, Terms, Privacy, and editorial participation pages.
- Keep design, feature behavior, translations, and data access separated.
- Continue sharing CNM's existing Supabase backend with the mobile app. Do not modify Koneksyon, its credentials, its repositories, or its database.
- Do not invent articles, presenters, audience statistics, sponsors, rates, radio URLs, testimonials, contact numbers, or legal/business claims.

This is an architectural redesign, divided into three deliverables: **public publication**, **editorial/media workspace**, and **station contact/sponsorship/legal operations**. The sections below establish their interfaces and acceptance criteria. They are a design contract, not an execution plan or a statement that the features already work.

## 2. Evidence and current gaps

### Repository facts verified in this review

The baseline contains a React/TypeScript/Vite website. Most page and admin behavior is in `src/App.tsx`; Supabase operations are in `src/data.ts`; four-language strings are in `src/i18n.ts`.

The route model covers Home, Listen, News, article detail, Programs, Community, Support, About, Account, and Admin. Contact, sponsorship, and legal routes are missing. The current editor has a single hero-image reference and plain-text article bodies; it has no gallery/video model or operational inquiry inbox. The image-upload function sends the original file to storage rather than producing delivery sizes.

The repository currently contains SVG logo files. The approved transparent PNGs were supplied earlier in this conversation. Their exact approved source must be brought into the project and visually compared before replacing logo references; an approximate redraw is not an acceptable substitute.

The current workflow deploys on pushes to `main`. Work on this redesign belongs on a separate branch, with no documentation-only deployment.

### CNM backend facts verified by a read-only query

Project: `hseaymxhnrjlofaczkls`. The inspection found zero assigned admin/super-admin roles, zero published articles, and zero shows. The primary and low-data stream URLs are not configured; streaming is disabled. The donation URL still points to the site's own `/support` page, not a payment destination. The `cnm-media` bucket is public.

These are observations at inspection time, not permanent assumptions. Recheck them before implementation and launch. A public bucket must not be used for confidential submissions or draft originals: public-object retrieval bypasses the private access model described by Supabase [R1].

### User-supplied business information, not independently verified

Domain: `creolenetworkmedia.com`. Contact address supplied in the conversation: `creolenetworkmedia@gmail.com`. The prior brief names Positive Assistance, Inc. as operator. Confirm operator details and mailbox ownership/delivery before publishing legal pages or claiming those services are operational. No verified phone, postal address, WhatsApp, charitable status, or music-licensing evidence is available in this brief.

## 3. Visual and editorial design

### Masthead and navigation

Use the approved transparent logo at a legible size, simple text navigation, and a compact language selector. Desktop navigation prioritizes News, Radio, Programs, and Community. Contact, sponsorship, and legal navigation remains easy to reach through the footer and relevant page links. Account access remains visible in the mobile menu; do not hide it without an alternative. Admin navigation appears only after the current session's role is confirmed.

No oversized pills around each control, decorative gradient heroes, ornamental glass panels, generic slogan-first sections, fake waveform status, or unnecessary animated backgrounds. A circle remains appropriate for a play button. Branding should be intentional, not every surface alternating red and blue.

Proposed design targets, rather than client-supplied measurements:

- Desktop publication container around 1440 CSS pixels, with generous but practical gutters.
- Editorial lead region uses a dominant story/program with a supporting latest-stories column.
- Article text stays near 60–75 characters per line rather than stretching across the wide site.
- Phones use a deliberate single-column order; intermediate widths receive a two-column layout where content supports it.
- Use readable system typography initially. Any later brand font must have appropriate licensing and a small, deliberately loaded footprint.
- Preserve the existing blue/red token values until visual and contrast checks justify a documented adjustment. Do not describe a newly chosen shade as a color supplied by the client.

### Homepage composition

1. Masthead and useful radio strip: play/pause, actual state, current published program when determinable, schedule and request links.
2. Lead story or approved program feature alongside latest published reporting.
3. News and community reporting grouped by real categories.
4. Watch section derived only from published articles with supported video links.
5. Programs and the actual schedule.
6. Participation links: request a song, dedication, submit a story.
7. Partner with CNM introduction and inquiry link.
8. Footer: About, Contact, Sponsorship, Terms, Privacy, editorial/correction information, supplied business details after verification.

When content is absent, omit the empty editorial module and retain useful station information and participation. Do not replace empty slots with invented reporting or several large empty-state panels. When content fails to load, distinguish the error from an empty result and offer a retry. A clear text-only layout is preferable to unrelated stock images.

### Approved reference direction

The preceding research comparison informed the approved direction: Monocle for publication/radio hierarchy; KEXP for listening, watching, reading, schedule and sponsorship separation; NTS for program discovery; Le Nouvelliste for the audience context of Haitian reporting and radio. These are design references, not affiliation claims, copied layouts, licensed imagery, or evidence about CNM itself.

## 4. Public pages and navigation contract

Keep existing public destinations working and add `/watch`, `/contact`, `/sponsor`, `/submit-story`, `/terms`, `/privacy`, and `/editorial-policy`. Community remains an overview with direct access to requests and dedications. The existing support page is distinct from sponsorship.

Use real links for navigation and article titles, with visible keyboard focus and understandable link text. A site-wide radio controller survives internal navigation. Unknown paths need a genuine not-found presentation, not an unexplained redirect to Home.

Contact and sponsorship pages must be useful standalone pages, not only modal forms. Existing article URLs must not be silently broken by the redesign.

### Hosting and discoverability

Keep the present GitHub deployment approach for this redesign; do not migrate providers without a separate decision. The build must have an explicit base path for its target: `/cnm/` for the repository Pages URL or `/` for the verified custom-domain deployment [R2]. Assets, links, router parsing, auth redirects, and fallback behavior must use the same setting.

Test nested routes opened directly, reloads, Back/Forward, and both base-path configurations. Copying one relative-path index file to `404.html` is not sufficient evidence that nested links work.

Known static-host limit: client-rendered article routes and a generic fallback page do not guarantee per-article social previews or correct search-engine status codes. Deliver page-specific titles, descriptions, canonical links and published-only discovery data where supported, but do not call SEO complete without testing the initial HTML/HTTP response for article links. A publish-time prerendering or server-rendering extension is a separate follow-on if required; it must not be quietly introduced as a hosting dependency.

## 5. Radio behavior

Use the existing station configuration, not a hardcoded stream. Start playback only after user action. Support separate idle, connecting, playing, paused, off-air, offline, and failed states; do not leave a permanent spinner for an absent stream.

On an unavailable or disabled stream, display Off air and disable the play action with an explanation. After a bounded connection attempt, show a retry rather than a misleading live animation. An enabled URL is not proof that the stream is healthy or that the device is playing.

Keep the mini-player usable without covering page controls. Pause/retry behavior and any media-session integration must be tested on real target browsers. Low-data audio can use a separately supplied lower-bitrate URL; a toggle cannot manufacture a lower-bandwidth version of an existing stream. Do not silently switch to an unrelated station.

Programs must show a clearly identified timezone and honor effective dates and daylight-saving behavior. Never infer a presenter or current program when schedule data is absent or ambiguous.

## 6. Article reading and publishing

### Admin workspace

Only `admin` and `super_admin`, assigned through trusted backend administration, may create, edit, publish, unpublish, or delete official articles. An ordinary account or a legacy `editor` role is not automatically a publisher. Hiding the menu is a convenience; backend authorization remains mandatory on every write and upload.

The editor needs headline, summary, body, category, public author credit, per-language editing, cover photo, additional photo blocks, captions, credits, alternative text, supported video link, preview, and explicit publishing actions.

Separate actions:

- **Save draft:** private work; a successful save shows an actual saved state, not a timer-based claim.
- **Publish / Update published article:** explicit action with validation and a confirmed response.
- **Unpublish:** explicit confirmation and removal from public queries.
- **Delete:** explicit confirmation; distinguish permanent deletion from unpublishing.

Saving edits to an already published story must not accidentally unpublish it. First-publication time and modification time are distinct. Warn before discarding unsaved work; preserve work across a language switch and recover gracefully from network failures. Handle concurrent edits with a revision check rather than silently overwriting another admin's changes.

### Content compatibility and data ownership

Keep existing `articles` identifiers, slugs, `title_i18n`, `excerpt_i18n`, `body_i18n`, `hero_media_id`, and publication fields usable by the mobile app. Introduce richer content additively; no renaming/deleting fields the app already consumes.

Use a separate private draft/revision representation so the live article does not change while an admin is editing. Structured published blocks may reference headings, paragraphs, photos, galleries, and validated provider video IDs. Preserve an equivalent plain-text body for older app clients. Do not store or render arbitrary scripts/iframe HTML pasted into article text.

The publish operation authorizes the caller, validates a coherent draft/media snapshot, updates the published representation consistently, and records the actor and revision. If media processing fails, retain the last valid published version and the private draft. Public queries must not leak private revision data or contact details.

### Reader experience

The reader displays headline, introduction, author credit, first publication/update dates, media captions, article body, optional gallery/video, related published stories, and a correction/report link. Do not expose account emails as author names. Advertising disclosures belong on both the entry card and the article where the content is promotional [R3].

## 7. Photos, video, and low-data delivery

Use two distinct asset lifecycles: private uploads/drafts/submissions, and approved public delivery media. Existing public `cnm-media` content is not mass-deleted or made private as an incidental redesign step.

For new uploads, accept JPEG, PNG, WebP, and AVIF, subject to tested decoding support. Proposed first-release limits are 10 MB per input image, a cover plus up to 10 additional photos, and no raw video upload. Validate limits both client-side and at the trusted upload boundary. Check actual image content and decoded dimensions; file extensions and browser MIME labels alone are not sufficient. SVG/HTML uploads are not accepted as article photos.

Strip unnecessary metadata from publication derivatives, maintain aspect ratios, store dimensions, and produce several sizes for thumbnails, article widths, and large screens. A suggested size ladder is 320/640/1280/1920 pixels where the source allows it; never upscale a small original. Optimized delivery is an acceptance test, not a label. Use appropriate responsive-image candidates, reserve image space, and defer below-the-fold images. The hero image should not be deferred when it is the visible lead content.

Private storage policies must restrict readers to their own submission attachments and restrict reviewers appropriately. Approved derivatives become public through the publish process, never merely because someone chose a file. Publicly released files can be cached or copied by others; do not promise retroactive confidentiality after unpublishing.

Video support starts with validated YouTube and Vimeo URLs. Store a normalized provider and video identifier; produce the embed from a fixed provider template. Reject unsupported or malformed URLs with a translated message. Do not accept arbitrary iframe markup or make unrestricted server-side requests to pasted URLs. The YouTube implementation must follow its documented embed interface [R4]; Vimeo compatibility must be verified before enabling that provider.

Show a lightweight, accessible play affordance first. No autoplay or third-party iframe loading before the reader chooses to load the video. Use privacy-respecting provider options where available, explain third-party loading, and provide a fallback link for unavailable videos. Do not claim that an external player is tracker-free.

## 8. Reader submissions, contact, and sponsorship

### Contributions

Keep listening/reading public. A reader who submits an article can sign in, submit text, attach permitted photos, and include a supported video link. Their submission is private and cannot publish itself. Clearly disclose editorial review, the absence of a publication guarantee, ownership/permission requirements, and the limited publication permission requested.

A user must not claim another user's identifier, choose an approved status, modify reviewer notes, or read other submissions. Validation, rate limits, upload quotas, and idempotency must be enforced at the server boundary, including any alternative database write path. Account creation alone is not anti-spam protection. Inspect and preserve existing mobile submission behavior before tightening shared interfaces.

### Contact page

Show the supplied CNM contact address only with accurate status. Do not fabricate phone, address, WhatsApp, hours, or response-time promises. Route inquiries by General, Technical/radio issue, Sponsorship, Editorial idea, Correction, and Copyright concern.

Minimum fields: contact name, email, category, message; optional relevant URL. A contact form may be used without an account, through a validated and rate-limited endpoint. Do not expose an anonymous insert policy that lets callers enumerate or alter the inbox.

### Sponsorship page

Separate commercial partnerships from listener donations. Describe radio/program, website/multimedia, and community partnership inquiries. Do not publish unsupported audience numbers, fixed packages, rates, exclusivity, sponsor logos, or guaranteed outcomes.

Fields: business/organization, contact name, email, partnership interest, message, and optional budget range. An inquiry is not a contract or a reservation.

Admin inbox statuses: New, In discussion, Agreed, Closed. Restrict private inquiries and internal notes to admins. Reader-facing submission confirmations contain a non-enumerable reference and reveal no other person's information. Email notifications are only described as sent when a configured delivery provider confirms acceptance; stored-in-inbox is a different success state.

### Support

Never send the user into a loop from `/support` to `/support`. Until a verified payment destination exists, show an honest contact-based support path. The website must not collect card data or label contributions tax-deductible without the required basis.

## 9. Languages and accessibility

All public pages, admin controls, validation, empty/error states, media messages, confirmations, and approved legal copy need `en/fr/ht/es` coverage. Keep keys consistent and test for raw/untranslated keys. Reject invalid stored language codes safely. Language changes must not discard drafts or form content.

Interface language and article language are different. If a translation is unavailable, explicitly label the language being shown and offer available versions. Never claim automatic translation has occurred. Publishing in one approved language is possible; do not force the admin to pretend all four translations exist. Legal translations require meaning-preserving review.

Use semantic landmarks, keyboard-operable controls, visible focus, labelled inputs, helpful field errors, and accessible progress/success announcements. Dialogs require sensible initial focus, Escape behavior, focus containment, and focus return. Headings and long strings must wrap without clipping.

Target reflow at 320 CSS pixels, enlarged text/zoom, portrait/landscape, phone/tablet/desktop, and reduced motion. Use at least 44-by-44 CSS-pixel interactive areas as the CNM design target. Test contrast and focus, rather than assuming brand colors pass.

On mobile, forms must scroll above the software keyboard. Sticky mastheads, players, and editor controls must not obscure the focused field or submit action [R5]. Preserve safe-area space, avoid fixed-height form layouts, and test accented input and composition in all four languages. Do not claim universal-device compatibility from desktop screenshots.

## 10. Legal and editorial pages

Deliver original radio/website Terms, Privacy, and Editorial/Submission policies. They are drafts for operator review, not proof of legal compliance. The current approved direction does not authorize publishing invented legal assertions.

Terms must address: listening/availability and data costs; account responsibilities; song requests/dedications and no broadcast guarantee; permission to read submitted names/messages on air; submitter ownership and rights; a limited non-exclusive publication/editing permission; prohibited submissions; moderation/removal; third-party video/services; sponsorship inquiries versus separate written agreements; support/payment disclosures; complaints/corrections; version/effective date; and proportionate limitations subject to legal review. Avoid an arbitrary governing law, arbitration clause, sweeping copyright transfer, or unsupported business address.

Privacy must match implemented collection and processors, including accounts, submissions, photos, contact information, preferences, hosting, and optional embeds. State actual retention/deletion practices only after the operator approves the policy and the implementation can honor it. No marketing opt-in is bundled into a required inquiry consent. Record the policy version associated with relevant submissions without logging their private content unnecessarily.

Use the operator name from the brief only after confirmation. Do not claim charitable/tax-exempt status, fundraising approval, or music licenses. Terms do not grant rights to music: compositions and recordings have distinct copyright considerations [R6]. Verification of the station's broadcasting rights remains a launch responsibility outside website code.

## 11. Component and security boundaries

Keep a thin application shell/router and separate these modules:

- Design tokens and shared accessible primitives.
- Publication pages, article queries, and reader rendering.
- Persistent radio state and playback controls.
- Editorial drafts, publication actions, and admin session state.
- Media intake, normalization, private storage, and public derivatives.
- Contact/sponsorship/submission forms and private inbox operations.
- Account/settings, localization, and reviewed policy content.
- Supabase client/types and migration history.

Do not re-create a single enormous page file containing all UI, auth, storage, and forms. Reuse existing stable code where it fits and refactor only boundaries involved in this work.

Only a publishable browser key may ship. Privileged secrets stay server-side. Trusted role checks must not rely on user-editable profile metadata. Require explicit grants and RLS for every exposed resource, including new media/draft/inquiry relations; test SELECT as well as INSERT/UPDATE/DELETE. Server handlers must perform their own authorization even when a frontend route is guarded.

Do not weaken existing policies to make a failing request succeed. Do not assign an admin based only on a matching email string or make every newly registered user an admin. The first publisher needs explicit user authorization after their verified account is identified.

## 12. Release boundaries and acceptance criteria

Workstreams are separable but share the brand, auth, article, and media contracts above. No feature is represented as operational before its dependencies are verified.

### Public publication acceptance

- Approved logo, white-led design, correct CNM palette, and non-generic content hierarchy verified visually at representative mobile/tablet/desktop sizes.
- No invented content or decorative images misrepresented as reporting.
- Four-language navigation and states, durable language selection, and an explicit missing-translation experience.
- Public listening/reading without login; off-air/no-network/error states behave differently and terminate loading correctly.
- Direct and refreshed routes work at the selected deployment base, with logos and assets present.
- Keyboard, focus, zoom, contrast, and software-keyboard checks pass for the critical flows.

### Editorial/media acceptance

- Guest, ordinary account, legacy editor, admin, and revoked-admin cases are tested at both UI and backend boundaries.
- Cross-user draft/submission/attachment reads and writes fail.
- Valid image uploads produce real derivatives; oversized, malformed, and unsupported inputs fail safely.
- Draft photos and revisions remain private; published stories and approved media render correctly.
- Save, Publish, Update, Unpublish, and Delete have distinct tested outcomes, including failure and concurrent-edit handling.
- Malicious text/URLs do not execute; supported video is click-to-load with no automatic playback.
- An older mobile client can still read the article's text and cover using the existing fields.

### Operations/legal acceptance

- Contact and sponsorship requests store only validated fields and enter a private, admin-only inbox.
- Repeat submissions and rate-limit failures are handled without duplicate records or false confirmations.
- Sponsorship promotion is disclosed appropriately; inquiries do not imply booked campaigns.
- Terms/Privacy/Editorial pages are approved, correctly linked, and translated before being called final.
- Unconfigured donation/email services are honestly represented; no pretend delivery or payment success.

### Verification and rollout

Use an isolated branch and a production-equivalent preview before merging application changes. Test code, database policies, browser behavior, and direct URLs. Pin dependencies, commit the resolved lockfile, and use reproducible installs. Record screenshots and test results against the release commit; a green build is not proof that the page works.

Keep database changes additive and test compatibility before applying them to the shared CNM backend. Capture a recovery strategy without assuming any particular backup tier exists. A frontend rollback must remain compatible with the database additions. Do not publish an Expo update, run a mobile build, change Koneksyon, or modify DNS as an incidental website task.

Current launch dependencies are explicit: a real verified stream; an explicitly authorized verified publisher; actual editorial/program content; verified domain/HTTPS; a valid payment destination before online donations; a delivery provider before email alerts; approved operator/legal details. Missing dependencies lead to honest reduced functionality, not fabricated substitutes.

## 13. Review and next artifact

The user approved the visual/product direction. This document captures the proposed design in a reviewable repository artifact. The next artifact, after written-spec review, is an implementation plan organized by the three deliverables, with actual tests and release gates. No implementation completion or live-site availability is claimed by this document.

## Sources and provenance

Requirements and brand choices above come from this conversation. Numeric design/upload targets and component boundaries are proposed engineering/design decisions, not facts supplied by CNM. Repository observations are tied to the inspected baseline. Backend observations came from a read-only query on 2026-10-05; no personal user records or private submissions were retrieved for this review.

Repository references:

- `src/App.tsx`: routes, public pages, account forms, article editor, and admin navigation at the baseline.
- `src/data.ts`: article/media types, upload implementation, and publishing functions at the baseline.
- `.github/workflows/deploy-pages.yml`: main-branch deployment behavior at the baseline.
- `public/`: present logo assets; approved PNG origin remains the conversation-supplied artwork.

External references verified for the relevant boundaries:

- [R1] Supabase Storage bucket access models and access control: https://supabase.com/docs/guides/storage/buckets/fundamentals ; https://supabase.com/docs/guides/storage/security/access-control
- [R2] Vite deployment/base-path guidance: https://vite.dev/guide/static-deploy.html
- [R3] FTC Native Advertising: A Guide for Businesses: https://www.ftc.gov/business-guidance/resources/native-advertising-guide-businesses
- [R4] YouTube player/embed parameters: https://developers.google.com/youtube/player_parameters
- [R5] W3C focus-not-obscured guidance: https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- [R6] U.S. Copyright Office music educational materials: https://www.copyright.gov/music-modernization/educational-materials/

Visual references carried from the approved research direction: Monocle, KEXP, NTS, and Le Nouvelliste. No branding, images, or editorial text from those publications is authorized for copying into CNM.
