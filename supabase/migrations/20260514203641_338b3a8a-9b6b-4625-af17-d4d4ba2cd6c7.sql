
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  bio text,
  phone text,
  location text,
  plan text default 'Free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles read all auth" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- updated_at trigger fn
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end; $$;
create trigger on_auth_user_created
after insert on auth.users for each row execute function public.handle_new_user();

-- courses
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  tag text,
  cover_url text,
  created_at timestamptz not null default now()
);
alter table public.courses enable row level security;
create policy "courses read auth" on public.courses for select to authenticated using (true);

-- lessons
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position int not null default 0,
  duration_min int default 10,
  created_at timestamptz not null default now()
);
create index lessons_course_idx on public.lessons(course_id, position);
alter table public.lessons enable row level security;
create policy "lessons read auth" on public.lessons for select to authenticated using (true);

-- lesson_progress
create table public.lesson_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.lesson_progress enable row level security;
create policy "progress read own" on public.lesson_progress for select to authenticated using (auth.uid() = user_id);
create policy "progress insert own" on public.lesson_progress for insert to authenticated with check (auth.uid() = user_id);
create policy "progress delete own" on public.lesson_progress for delete to authenticated using (auth.uid() = user_id);

-- posts
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index posts_created_idx on public.posts(created_at desc);
alter table public.posts enable row level security;
create policy "posts read auth" on public.posts for select to authenticated using (true);
create policy "posts insert own" on public.posts for insert to authenticated with check (auth.uid() = user_id);
create policy "posts update own" on public.posts for update to authenticated using (auth.uid() = user_id);
create policy "posts delete own" on public.posts for delete to authenticated using (auth.uid() = user_id);

-- comments
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments(post_id, created_at);
alter table public.comments enable row level security;
create policy "comments read auth" on public.comments for select to authenticated using (true);
create policy "comments insert own" on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "comments delete own" on public.comments for delete to authenticated using (auth.uid() = user_id);

-- post_likes
create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
create policy "likes read auth" on public.post_likes for select to authenticated using (true);
create policy "likes insert own" on public.post_likes for insert to authenticated with check (auth.uid() = user_id);
create policy "likes delete own" on public.post_likes for delete to authenticated using (auth.uid() = user_id);
