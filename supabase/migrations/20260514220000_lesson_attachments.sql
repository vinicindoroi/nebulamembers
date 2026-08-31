-- Tabela de anexos por aula
create table if not exists public.lesson_attachments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint not null default 0,
  mime_type text,
  created_at timestamptz not null default now()
);

-- Índice para busca por aula
create index idx_lesson_attachments_lesson on public.lesson_attachments(lesson_id);

-- RLS
alter table public.lesson_attachments enable row level security;

-- Qualquer usuário autenticado pode ler (download)
create policy "Authenticated users can read attachments"
  on public.lesson_attachments for select
  to authenticated
  using (true);

-- Apenas admins podem inserir/atualizar/deletar
create policy "Admins can manage attachments"
  on public.lesson_attachments for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Bucket separado para attachments
insert into storage.buckets (id, name, public, file_size_limit)
values ('lesson-attachments', 'lesson-attachments', false, 52428800) -- 50MB
on conflict (id) do nothing;

-- Storage policies
create policy "Authenticated users can download attachments"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'lesson-attachments');

create policy "Admins can upload attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lesson-attachments'
    and public.has_role(auth.uid(), 'admin')
  );

create policy "Admins can delete attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lesson-attachments'
    and public.has_role(auth.uid(), 'admin')
  );
