-- 강의 영상 저장소 되돌리기 — 20261019020000_hanclass_videos.sql 적용 전 상태로 돌린다
-- 정책을 지우면 브라우저에서는 아무도 영상을 올리거나 볼 수 없다
-- 버킷과 올린 파일은 SQL로 지울 수 없게 막혀 있다 → Supabase 대시보드 Storage에서 hanclass-videos를 비운 뒤 삭제

drop policy if exists "hanclass 영상: 운영자만 지우기" on storage.objects;
drop policy if exists "hanclass 영상: 운영자만 바꾸기" on storage.objects;
drop policy if exists "hanclass 영상: 운영자만 올리기" on storage.objects;
drop policy if exists "hanclass 영상: 운영자만 보기" on storage.objects;
