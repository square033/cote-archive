-- ============================================
-- 코테 아카이브 — Supabase 테이블 설정
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run!
-- ============================================

-- 문제 테이블 (문제+풀이 전체를 jsonb로 저장)
create table if not exists public.problems (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- 내 문제만 빠르게 조회하기 위한 인덱스
create index if not exists problems_user_idx on public.problems (user_id, created_at desc);

-- ============================================
-- RLS (Row Level Security) — 핵심 보안 설정!
-- 이게 있어야 "내 데이터는 나만" 볼 수 있어요.
-- ============================================
alter table public.problems enable row level security;

-- 내 것만 조회
create policy "select own" on public.problems
  for select using (auth.uid() = user_id);

-- 내 이름으로만 추가
create policy "insert own" on public.problems
  for insert with check (auth.uid() = user_id);

-- 내 것만 수정
create policy "update own" on public.problems
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 내 것만 삭제
create policy "delete own" on public.problems
  for delete using (auth.uid() = user_id);
