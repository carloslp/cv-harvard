grant usage on schema public to anon, authenticated;

create table if not exists public.profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  headline text,
  summary text,
  location text,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  institution text not null,
  degree text,
  field_of_study text,
  start_date date,
  end_date date,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.experience (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  company text not null,
  role text not null,
  start_date date,
  end_date date,
  description text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text,
  proficiency text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, name)
);

alter table public.profile enable row level security;
alter table public.education enable row level security;
alter table public.experience enable row level security;
alter table public.skills enable row level security;

grant select on public.profile to anon, authenticated;
grant select on public.education to anon, authenticated;
grant select on public.experience to anon, authenticated;
grant select on public.skills to anon, authenticated;

grant insert, update, delete on public.profile to authenticated;
grant insert, update, delete on public.education to authenticated;
grant insert, update, delete on public.experience to authenticated;
grant insert, update, delete on public.skills to authenticated;

drop policy if exists "Public read profile" on public.profile;
create policy "Public read profile"
on public.profile
for select
to anon, authenticated
using (true);

drop policy if exists "Owner insert profile" on public.profile;
create policy "Owner insert profile"
on public.profile
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Owner update profile" on public.profile;
create policy "Owner update profile"
on public.profile
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Owner delete profile" on public.profile;
create policy "Owner delete profile"
on public.profile
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Public read education" on public.education;
create policy "Public read education"
on public.education
for select
to anon, authenticated
using (true);

drop policy if exists "Owner insert education" on public.education;
create policy "Owner insert education"
on public.education
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Owner update education" on public.education;
create policy "Owner update education"
on public.education
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Owner delete education" on public.education;
create policy "Owner delete education"
on public.education
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Public read experience" on public.experience;
create policy "Public read experience"
on public.experience
for select
to anon, authenticated
using (true);

drop policy if exists "Owner insert experience" on public.experience;
create policy "Owner insert experience"
on public.experience
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Owner update experience" on public.experience;
create policy "Owner update experience"
on public.experience
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Owner delete experience" on public.experience;
create policy "Owner delete experience"
on public.experience
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Public read skills" on public.skills;
create policy "Public read skills"
on public.skills
for select
to anon, authenticated
using (true);

drop policy if exists "Owner insert skills" on public.skills;
create policy "Owner insert skills"
on public.skills
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Owner update skills" on public.skills;
create policy "Owner update skills"
on public.skills
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Owner delete skills" on public.skills;
create policy "Owner delete skills"
on public.skills
for delete
to authenticated
using (auth.uid() = user_id);
