-- Smart Food Reminder — Database Schema
-- Jalankan script ini di Supabase Dashboard → SQL Editor → New Query → Run

create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_name text default '',
  foods jsonb default '[]'::jsonb,
  notify_h1 boolean default true,
  notify_h3 boolean default true,
  last_notified_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index untuk pencarian cepat saat sync data
create index if not exists idx_push_endpoint on push_subscriptions (endpoint);

-- Row Level Security: aktifkan tapi tanpa policy publik.
-- Semua akses HANYA lewat serverless function (pakai service_role key),
-- jadi tidak ada client yang bisa baca/tulis langsung ke tabel ini.
alter table push_subscriptions enable row level security;
