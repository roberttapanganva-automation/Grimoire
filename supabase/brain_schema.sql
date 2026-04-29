create extension if not exists vector;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'doc_status') then
    create type public.doc_status as enum ('uploading', 'processing', 'ready', 'error');
  end if;
end $$;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  file_name text,
  file_path text,
  file_type text,
  file_size int,
  source_url text,
  status public.doc_status not null default 'uploading',
  error_message text,
  chunk_count int not null default 0,
  category_id uuid references public.categories(id) on delete set null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  content text not null,
  embedding vector(768),
  chunk_index int not null,
  token_count int,
  created_at timestamptz not null default now()
);

create index if not exists documents_user_id_idx on public.documents(user_id);
create index if not exists documents_created_at_idx on public.documents(created_at desc);
create index if not exists chunks_document_id_idx on public.chunks(document_id);
create unique index if not exists chunks_document_id_chunk_index_idx on public.chunks(document_id, chunk_index);

alter table public.documents
add column if not exists error_message text;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update
set public = false;

alter table public.documents enable row level security;
alter table public.chunks enable row level security;

drop policy if exists "Users can read their own documents" on public.documents;
create policy "Users can read their own documents"
on public.documents for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own documents" on public.documents;
create policy "Users can insert their own documents"
on public.documents for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own documents" on public.documents;
create policy "Users can update their own documents"
on public.documents for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own documents" on public.documents;
create policy "Users can delete their own documents"
on public.documents for delete
using (auth.uid() = user_id);

drop policy if exists "Users can read chunks for their own documents" on public.chunks;
create policy "Users can read chunks for their own documents"
on public.chunks for select
using (
  exists (
    select 1
    from public.documents
    where documents.id = chunks.document_id
      and documents.user_id = auth.uid()
  )
);

drop policy if exists "Users can insert chunks for their own documents" on public.chunks;
create policy "Users can insert chunks for their own documents"
on public.chunks for insert
with check (
  exists (
    select 1
    from public.documents
    where documents.id = chunks.document_id
      and documents.user_id = auth.uid()
  )
);

drop policy if exists "Users can update chunks for their own documents" on public.chunks;
create policy "Users can update chunks for their own documents"
on public.chunks for update
using (
  exists (
    select 1
    from public.documents
    where documents.id = chunks.document_id
      and documents.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.documents
    where documents.id = chunks.document_id
      and documents.user_id = auth.uid()
  )
);

drop policy if exists "Users can delete chunks for their own documents" on public.chunks;
create policy "Users can delete chunks for their own documents"
on public.chunks for delete
using (
  exists (
    select 1
    from public.documents
    where documents.id = chunks.document_id
      and documents.user_id = auth.uid()
  )
);

drop policy if exists "Users can upload documents into their folder" on storage.objects;
create policy "Users can upload documents into their folder"
on storage.objects for insert
with check (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can read documents from their folder" on storage.objects;
create policy "Users can read documents from their folder"
on storage.objects for select
using (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update documents in their folder" on storage.objects;
create policy "Users can update documents in their folder"
on storage.objects for update
using (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete documents from their folder" on storage.objects;
create policy "Users can delete documents from their folder"
on storage.objects for delete
using (
  bucket_id = 'documents'
  and auth.uid()::text = (storage.foldername(name))[1]
);
