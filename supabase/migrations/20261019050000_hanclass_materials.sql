-- 강의 자료 (SPEC.md '강의 자료') — 20261019020000_hanclass_videos.sql 다음에 적용
-- 운영자가 강의별 실습 파일을 올리고, 공개 범위를 고른다: free(결제 전, 로그인한 회원) | enrolled(결제 후, 그 강의 데모 수강 신청자)
-- ⚠ 지금 결제는 데모라 결제 후 자료도 데모 수강 신청만 하면 받는다 → 가상 실습 자료만 올린다 (실제 유료 파일 금지)
-- 비공개 버킷이라 주소를 알아도 못 연다. 받을 수 있는 사람에게만 짧은 임시 주소(signed URL)를 준다
-- 세시드와 같은 storage.objects를 쓰므로 이름에 hanclass를 붙인다. 기존 데이터는 건드리지 않는다
-- 되돌리기: supabase/rollback/20261019050000_hanclass_materials_down.sql

insert into storage.buckets (id, name, public, file_size_limit)
values ('hanclass-materials', 'hanclass-materials', false, 52428800)
on conflict (id) do nothing;

-- 자료 목록 — 이름·크기·공개 범위는 누구나 볼 수 있다 (강의 상세에 잠김 표시). 파일 자체는 아래 Storage 정책이 막는다
create table public.hanclass_course_materials (
  id bigint generated always as identity primary key,
  course_id text not null check (course_id ~ '^c[0-9]{3}$'),
  title text not null check (char_length(title) between 2 and 40),
  file_path text not null unique check (file_path like course_id || '/%'),
  size bigint not null default 0 check (size >= 0),
  access text not null default 'enrolled' check (access in ('free', 'enrolled')),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.hanclass_course_materials is '한클래스 강의 자료 — 목록은 공개, 쓰기는 운영자만, 파일 받기는 Storage 정책(공개 범위)';

alter table public.hanclass_course_materials enable row level security;
revoke all on public.hanclass_course_materials from anon, authenticated;
grant select on public.hanclass_course_materials to anon, authenticated;
grant insert (course_id, title, file_path, size, access) on public.hanclass_course_materials to authenticated;
grant update (title, access) on public.hanclass_course_materials to authenticated;
grant delete on public.hanclass_course_materials to authenticated;

create policy "강의 자료 목록은 누구나 보기"
  on public.hanclass_course_materials for select
  to anon, authenticated
  using (true);

create policy "강의 자료는 운영자만 추가"
  on public.hanclass_course_materials for insert
  to authenticated
  with check (public.hanclass_admin_role() is not null);

create policy "강의 자료는 운영자만 바꾸기"
  on public.hanclass_course_materials for update
  to authenticated
  using (public.hanclass_admin_role() is not null)
  with check (public.hanclass_admin_role() is not null);

create policy "강의 자료는 운영자만 지우기"
  on public.hanclass_course_materials for delete
  to authenticated
  using (public.hanclass_admin_role() is not null);

-- 파일 받기(임시 주소 만들기 포함): 운영자, 또는 목록에 있는 파일 중 결제 전 자료이거나 그 강의를 신청한 본인
-- demo_enrollments는 본인 행만 보이는 RLS라, 다른 사람 신청 기록으로는 통과하지 못한다
create policy "hanclass 자료: 공개 범위대로 받기"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'hanclass-materials'
    and (
      public.hanclass_admin_role() is not null
      or exists (
        select 1 from public.hanclass_course_materials m
        where m.file_path = storage.objects.name
          and (
            m.access = 'free'
            or exists (
              select 1 from public.demo_enrollments e
              where e.course_id = m.course_id and e.user_id = (select auth.uid())
            )
          )
      )
    )
  );

create policy "hanclass 자료: 운영자만 올리기"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hanclass-materials'
    and public.hanclass_admin_role() is not null
    and (storage.foldername(name))[1] ~ '^c[0-9]{3}$'
  );

create policy "hanclass 자료: 운영자만 지우기"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'hanclass-materials' and public.hanclass_admin_role() is not null);
