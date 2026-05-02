# TouchGrass

Mobile-first React/Supabase MVP for outside-photo posting, friend feeds, plant growth, and simple messaging.

## Local Setup

1. Install dependencies:

```sh
pnpm install
```

2. Create `.env` from `.env.example` and fill in:

```sh
VITE_SUPABASE_URL=https://akhsxfqjwqrzzgzdxhht.supabase.co
VITE_SUPABASE_ANON_KEY=<Supabase anon public key>
```

3. Apply the migration in `supabase/migrations/202605020001_touchgrass_mvp.sql` to the Supabase project.

If your network is IPv4-only, use Supabase's Session Pooler connection string instead of the direct database host.

4. Deploy the Edge Function in `supabase/functions/verify-outside-post` and set these function secrets:

```sh
OPENROUTER_API_KEY=<OpenRouter key>
OPENROUTER_MODEL=google/gemini-3-flash-preview
APP_ORIGIN=http://localhost:5173
```

5. Run the app:

```sh
pnpm run dev
```

## Verification

```sh
pnpm run lint
pnpm run build
```
