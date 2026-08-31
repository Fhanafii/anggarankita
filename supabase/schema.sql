-- APBD Tracker — Supabase schema (requirement §7-§12, §49)
-- Run in Supabase SQL editor.

create extension if not exists postgis;

create table if not exists regions (
  id            bigint generated always as identity primary key,
  code          text unique not null,          -- "PP.DD" (DJPK) / BPS-style official code
  name          text not null,
  type          text not null check (type in ('province','regency','city')),
  parent_code   text references regions(code), -- NULL for province
  province_code text not null,                 -- DJPK 2-digit province code
  geometry      geometry(Geometry, 4326),
  centroid_lat  double precision,
  centroid_lng  double precision,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists regions_type_idx on regions(type);
create index if not exists regions_parent_idx on regions(parent_code);
create index if not exists regions_search_idx on regions using gin (to_tsvector('simple', name));

-- Account-based structure: no hardcoded APBD columns (§8).
create table if not exists apbd_records (
  id                     bigint generated always as identity primary key,
  region_id              text not null references regions(code) on delete cascade,
  year                   int not null,
  account_code           text not null,        -- deterministic path slug (§35)
  account_name           text not null,        -- original source name preserved
  account_group          text not null check (account_group in ('revenue','expenditure','financing')),
  parent_account_code    text,
  level                  int not null default 0,
  budget                 bigint,               -- rupiah; NULL = not available (missing != zero, §38)
  realization            bigint,               -- rupiah
  realization_percentage numeric(8,2),         -- authoritative source % when available (§14)
  source_url             text not null,
  source_name            text not null default 'DJPK SIKD',
  source_updated_at      text,                 -- e.g. "29 Agustus 2026"
  source_note            text,                 -- full keterangan line (§15)
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (region_id, year, account_code)       -- duplicate handling (§35)
);

create index if not exists apbd_year_group_idx on apbd_records(year, account_group);
create index if not exists apbd_region_year_idx on apbd_records(region_id, year);

-- Row Level Security: public read-only (§49). Writes only via service role.
alter table regions enable row level security;
alter table apbd_records enable row level security;

create policy "public read regions" on regions for select using (true);
create policy "public read apbd" on apbd_records for select using (true);
-- No insert/update/delete policies => anon key cannot write.
