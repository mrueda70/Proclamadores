-- Postgres schema for Supabase, converted from the Mocha/Cloudflare D1 (SQLite) export.
-- Run this FIRST (in the Supabase SQL Editor), then run data.sql to load the migrated data.
--
-- Differences from the original SQLite schema:
--   * INTEGER PRIMARY KEY AUTOINCREMENT -> SERIAL PRIMARY KEY
--   * DATETIME                          -> TIMESTAMP
--   * "boolean" flag columns kept as INTEGER (0/1), matching how the app already reads/writes them
--   * auth_sessions.expires_at is BIGINT, not INTEGER — it stores Date.now() (epoch milliseconds),
--     which overflows a 32-bit Postgres INTEGER
--   * the Mocha-only tables (_mocha_migrations, user_roles) were dropped — they belonged to the
--     Google OAuth login flow that isn't used by this app (it uses the PIN-based admin/user login)

create table readers (
  id serial primary key,
  name text not null,
  email text not null,
  phone text not null,
  address text,
  birth_date date,
  is_active integer default 1,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);
create index idx_readers_email on readers(email);

create table masses (
  id serial primary key,
  mass_date date not null,
  mass_time text not null,
  mass_type text not null,
  first_reading text,
  psalm text,
  second_reading text,
  gospel text,
  has_second_reading integer default 1,
  has_notes integer default 0,
  notes text,
  has_commentator integer default 0,
  first_reader_id integer,
  second_reader_id integer,
  psalm_reader_id integer,
  commentator_reader_id integer,
  first_reader_custom text,
  second_reader_custom text,
  psalm_reader_custom text,
  commentator_reader_custom text,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);
create index idx_masses_date on masses(mass_date);

create table special_celebrations (
  id serial primary key,
  name text not null,
  celebration_date date not null,
  celebration_time text not null,
  description text,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);
create index idx_special_celebrations_date on special_celebrations(celebration_date);

create table celebration_roles (
  id serial primary key,
  celebration_id integer not null,
  role_name text not null,
  reader_id integer,
  custom_reader_name text,
  role_order integer not null default 0,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);
create index idx_celebration_roles_celebration on celebration_roles(celebration_id);

create table cached_readings (
  id serial primary key,
  reading_date date not null unique,
  mass_type text,
  liturgical_day text,
  first_reading text,
  first_reading_text text,
  psalm text,
  psalm_text text,
  second_reading text,
  second_reading_text text,
  gospel text,
  gospel_text text,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);
create index idx_cached_readings_date on cached_readings(reading_date);

create table admin_pin (
  id serial primary key,
  pin text not null,
  security_question text,
  security_answer text,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);

create table auth_sessions (
  id serial primary key,
  token text not null unique,
  role text not null,
  expires_at bigint not null,
  created_at timestamp default current_timestamp
);
create index idx_auth_sessions_token on auth_sessions(token);
create index idx_auth_sessions_expires_at on auth_sessions(expires_at);

create table reader_availability (
  id serial primary key,
  reader_id integer not null,
  day_of_week integer not null,
  mass_time text not null,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);
create index idx_reader_availability_reader on reader_availability(reader_id);
create index idx_reader_availability_day on reader_availability(day_of_week);

create table cached_ai_content (
  id serial primary key,
  content_date date not null,
  content_type text not null,
  content text not null,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);
create unique index idx_cached_ai_content_date_type on cached_ai_content(content_date, content_type);
