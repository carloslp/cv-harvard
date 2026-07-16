# cv-harvard

## Supabase

The repository includes a Supabase SQL migration at `/supabase/migrations/20260714003000_auth_rls.sql`
that creates the `profile`, `education`, `experience`, and `skills` tables with public read access
and authenticated owner-only write access through Row Level Security (RLS).

## Frontend auth routes

This repository includes static frontend routes for:

- `/login` (`/login/index.html`) with a basic email/password form using Supabase Auth.
- `/admin` (`/admin/index.html`) protected with a session check that redirects unauthenticated users to `/login`.

Set `supabase-url` and `supabase-anon-key` values in the route HTML `<meta>` tags (or define
`SUPABASE_URL` / `SUPABASE_ANON_KEY` on `window` or `localStorage`) so the pages can create a Supabase client.
