-- 질문 글 답변 제한 (SPEC.md '커뮤니티') — 20261019010100_hanclass_admin_functions.sql 다음에 적용
-- 질문 분류 글에는 운영자와 질문한 본인만 댓글을 단다 (질문자는 감사·추가 질문). 다른 회원은 DB가 거절한다
-- 결과물 공유·자유 글은 지금처럼 로그인한 누구나. 이미 달린 댓글은 지우지 않는다
-- 숨긴 글도 확인할 수 있게 운영 권한(definer)으로 글을 읽는다. 되돌리기: supabase/rollback/20261019040000_community_question_answers_down.sql

create function public.community_comments_answer_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.community_posts p
    where p.id = new.post_id and p.category = 'question' and p.user_id <> (select auth.uid())
  ) and public.hanclass_admin_role() is null then
    raise exception 'community_answer_only';
  end if;
  return new;
end;
$$;

revoke all on function public.community_comments_answer_guard() from public, anon, authenticated;

create trigger community_comments_answer_guard
  before insert on public.community_comments
  for each row execute function public.community_comments_answer_guard();
