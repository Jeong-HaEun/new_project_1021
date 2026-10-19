-- 강의 영상 저장소 (SPEC.md '강의 영상 올리기') — 20261019010100_hanclass_admin_functions.sql 다음에 적용
-- 지금은 시험 업로드 단계: 운영자만 올리고·보고·지운다. 수강생 재생은 아직 열지 않는다 (유료 콘텐츠는 결제 검증 전 공개 금지)
-- 비공개 버킷이라 주소를 알아도 못 연다. 운영자에게만 10분짜리 임시 주소(signed URL)를 준다
-- 무료 플랜 파일 1개 최대 50MB. 경로는 '강의id/차시id.확장자' (예: c002/l1.mp4)
-- 세시드와 같은 storage.objects를 쓰므로 버킷 이름과 정책 이름에 hanclass를 붙인다
-- 되돌리기: supabase/rollback/20261019020000_hanclass_videos_down.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('hanclass-videos', 'hanclass-videos', false, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

create policy "hanclass 영상: 운영자만 보기"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'hanclass-videos' and public.hanclass_admin_role() is not null);

create policy "hanclass 영상: 운영자만 올리기"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hanclass-videos'
    and public.hanclass_admin_role() is not null
    and (storage.foldername(name))[1] ~ '^c[0-9]{3}$'
  );

-- 같은 차시에 다시 올리면 덮어쓴다 (upsert는 보기·올리기·바꾸기 권한이 모두 필요)
create policy "hanclass 영상: 운영자만 바꾸기"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'hanclass-videos' and public.hanclass_admin_role() is not null)
  with check (
    bucket_id = 'hanclass-videos'
    and public.hanclass_admin_role() is not null
    and (storage.foldername(name))[1] ~ '^c[0-9]{3}$'
  );

create policy "hanclass 영상: 운영자만 지우기"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'hanclass-videos' and public.hanclass_admin_role() is not null);
