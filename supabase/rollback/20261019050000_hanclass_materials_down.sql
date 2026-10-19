-- 강의 자료 되돌리기 — 20261019050000_hanclass_materials.sql 적용 전으로
-- ⚠ 자료 목록 테이블을 지운다. 올린 파일은 Storage 화면에서 hanclass-materials 버킷을 먼저 비운 뒤 버킷을 지운다

drop policy if exists "hanclass 자료: 공개 범위대로 받기" on storage.objects;
drop policy if exists "hanclass 자료: 운영자만 올리기" on storage.objects;
drop policy if exists "hanclass 자료: 운영자만 지우기" on storage.objects;
drop table if exists public.hanclass_course_materials;
