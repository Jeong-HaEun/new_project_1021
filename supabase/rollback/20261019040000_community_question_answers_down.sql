-- 질문 글 답변 제한 되돌리기 — 20261019040000_community_question_answers.sql 적용 전으로 (누구나 댓글)

drop trigger if exists community_comments_answer_guard on public.community_comments;
drop function if exists public.community_comments_answer_guard();
