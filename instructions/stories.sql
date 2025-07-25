create table public.stories (
  id uuid not null default gen_random_uuid (),
  external_id text not null,
  title text not null,
  url text not null,
  content text null,
  summary text null,
  author text null,
  image_url text null,
  published_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  story_category text null,
  tags text[] null default '{}'::text[],
  embedding public.vector null,
  embedding_model text null default 'text-embedding-3-small'::text,
  embedding_generated_at timestamp with time zone null,
  original_metadata jsonb null default '{}'::jsonb,
  tagging_metadata jsonb null default '{}'::jsonb,
  source_id integer not null,
  source_name text null,
  constraint stories_pkey primary key (id),
  constraint stories_source_id_fkey foreign KEY (source_id) references sources (id) on delete CASCADE,
  constraint stories_story_category_check check (
    (
      (story_category is null)
      or (
        story_category = any (
          array[
            'news'::text,
            'tools'::text,
            'research'::text,
            'opinion'::text,
            'announcement'::text
          ]
        )
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_stories_embedding on public.stories using ivfflat (embedding vector_cosine_ops)
with
  (lists = '100') TABLESPACE pg_default;

create index IF not exists stories_published_at_desc_idx on public.stories using btree (published_at desc) TABLESPACE pg_default;

create index IF not exists stories_story_category_idx on public.stories using btree (story_category) TABLESPACE pg_default
where
  (story_category is not null);

create index IF not exists stories_author_idx on public.stories using btree (author) TABLESPACE pg_default
where
  (author is not null);

create index IF not exists stories_title_text_idx on public.stories using gin (to_tsvector('english'::regconfig, title)) TABLESPACE pg_default;

create index IF not exists stories_content_text_idx on public.stories using gin (to_tsvector('english'::regconfig, content)) TABLESPACE pg_default;

create index IF not exists stories_summary_text_idx on public.stories using gin (to_tsvector('english'::regconfig, summary)) TABLESPACE pg_default;

create index IF not exists stories_tags_gin_idx on public.stories using gin (tags) TABLESPACE pg_default;

create index IF not exists stories_original_metadata_gin_idx on public.stories using gin (original_metadata) TABLESPACE pg_default;

create index IF not exists stories_tagging_metadata_gin_idx on public.stories using gin (tagging_metadata) TABLESPACE pg_default;

create index IF not exists stories_embedding_cosine_idx on public.stories using ivfflat (embedding vector_cosine_ops)
with
  (lists = '100') TABLESPACE pg_default
where
  (embedding is not null);

create index IF not exists stories_category_published_idx on public.stories using btree (story_category, published_at desc) TABLESPACE pg_default
where
  (story_category is not null);

create index IF not exists idx_stories_published_at on public.stories using btree (published_at desc) TABLESPACE pg_default;

create index IF not exists idx_stories_category on public.stories using btree (story_category) TABLESPACE pg_default;

create index IF not exists idx_stories_source_name on public.stories using btree (source_name) TABLESPACE pg_default;

create trigger trigger_update_embedding_timestamp BEFORE
update on stories for EACH row
execute FUNCTION update_embedding_timestamp ();