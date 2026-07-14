# cv-harvard

## Supabase

The repository includes a Supabase SQL migration at `/supabase/migrations/20260714003000_auth_rls.sql`
that creates the `profile`, `education`, `experience`, and `skills` tables with public read access
and authenticated owner-only write access through Row Level Security (RLS).
