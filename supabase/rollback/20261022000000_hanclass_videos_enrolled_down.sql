-- 되돌리기: 수강 신청자 영상 보기 정책만 지운다 (운영자 정책·영상 파일은 그대로)
drop policy if exists "hanclass 영상: 신청한 강의만 보기" on storage.objects;
