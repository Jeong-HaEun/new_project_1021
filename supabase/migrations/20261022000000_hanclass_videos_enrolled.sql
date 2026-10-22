-- 강의 영상: 데모 수강 신청한 본인에게 그 강의 영상 보기 열기 (SPEC.md '강의 영상 올리기') — 20261021010000_demo_enrollments_cancel.sql 다음에 적용
-- ⚠ 결제가 데모라 수강 신청은 누구나 무료 → 가상 시연용 영상만 올린다 (실제 유료 강의 영상 금지)
-- 경로는 '강의id/차시id.확장자'. 첫 폴더(강의id)를 신청한 본인만 목록·임시 주소(signed URL)를 받는다
-- demo_enrollments는 본인 행만 보이는 RLS라, 다른 사람 신청 기록으로는 통과하지 못한다
-- 운영자 보기 정책은 그대로 둔다 (정책은 '또는'으로 합쳐진다). 올리기·바꾸기·지우기는 계속 운영자만
-- 기존 데이터는 건드리지 않는다. 정책 1개만 더한다
-- 되돌리기: supabase/rollback/20261022000000_hanclass_videos_enrolled_down.sql

create policy "hanclass 영상: 신청한 강의만 보기"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'hanclass-videos'
    and exists (
      select 1 from public.demo_enrollments e
      where e.course_id = (storage.foldername(name))[1] and e.user_id = (select auth.uid())
    )
  );
