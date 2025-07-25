create table public.sources (
  name text not null,
  type text not null,
  endpoint_url text not null,
  fetch_freq_min integer not null default 60,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  slug text null,
  adapter_name text null,
  priority integer null default 0,
  id integer not null default nextval('sources_id_seq'::regclass),
  constraint sources_pkey primary key (id),
  constraint sources_name_key unique (name),
  constraint sources_slug_key unique (slug),
  constraint sources_type_check check (
    (
      type = any (
        array['rss'::text, 'api'::text, 'web_scrape'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_sources_slug on public.sources using btree (slug) TABLESPACE pg_default;

create index IF not exists idx_sources_active_priority on public.sources using btree (is_active, priority) TABLESPACE pg_default;