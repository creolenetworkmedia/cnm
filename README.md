# Creole Network Media website

Official web experience for Creole Network Media (CNM).

## Product direction

- Brand palette: blue, white, red.
- Clean editorial radio design; no template-style gradients or oversized rounded cards.
- Four languages: English, French, Haitian Creole, Spanish.
- Public live player with graceful off-air state.
- News and article pages backed by the shared CNM Supabase project.
- Programs and schedule backed by Supabase.
- Community flows: song request, dedication, story submission, support.
- Account system backed by Supabase Auth.
- Admin-only Editorial workspace for official article publishing and live-stream configuration.
- Article image uploads use the `cnm-media` Supabase Storage bucket.

## Security

The browser uses only the Supabase **publishable** key. Authorization is enforced by Supabase Row Level Security. The website never contains a secret/service-role key.

Official article create/update/delete is allowed only for accounts assigned `admin` or `super_admin` in CNM's private role table. The UI checks `current_user_is_admin()`, but RLS remains the final security boundary.

## Local development

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

The build also copies `index.html` to `404.html` so client-side article URLs work with GitHub Pages.

## Publishing

The repository includes a GitHub Pages deployment workflow and `public/CNAME` for `creolenetworkmedia.com`.

After the repository's Pages source is set to **GitHub Actions**, configure the domain DNS for GitHub Pages. The workflow publishes each push to `main`.
