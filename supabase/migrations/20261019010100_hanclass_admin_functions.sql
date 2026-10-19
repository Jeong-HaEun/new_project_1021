-- 운영자 함수 (SPEC.md '운영자 페이지') — 20261019010000_hanclass_admin.sql 바로 다음에 적용
-- 회원 통계·신고 글 처리. 모두 시작할 때 운영자인지 확인하고, 관리자 키(service role)로 우회하지 않는다
-- 되돌리기: supabase/rollback/20261019010000_hanclass_admin_down.sql (두 파일을 함께 되돌린다)

-- 회원 통계 — 세시드와 회원을 함께 쓰므로 '한클래스에 기록이 있는 사람'만 센다. 이메일·이름은 돌려주지 않는다
create function public.admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if public.hanclass_admin_role() is null then
    raise exception 'hanclass_not_admin';
  end if;
  with activity as (
    select user_id, enrolled_at as at from public.demo_enrollments
    union all select user_id, completed_at from public.demo_outcomes
    union all select user_id, created_at from public.community_posts
    union all select user_id, created_at from public.community_comments
    union all select user_id, (used_on::timestamp at time zone 'Asia/Seoul') from public.doc_helper_usage
  ), members as (
    select user_id, min(at) as first_at, max(at) as last_at from activity group by user_id
  ), days as (
    select generate_series((now() at time zone 'Asia/Seoul')::date - 13, (now() at time zone 'Asia/Seoul')::date, interval '1 day')::date as day
  )
  select jsonb_build_object(
    'members', (select count(*) from members),
    'newMembers7d', (select count(*) from members where first_at > now() - interval '7 days'),
    'activeMembers7d', (select count(*) from members where last_at > now() - interval '7 days'),
    'enrollments', (select count(*) from public.demo_enrollments),
    'outcomes', (select count(*) from public.demo_outcomes),
    'posts', (select count(*) from public.community_posts),
    'comments', (select count(*) from public.community_comments),
    'hiddenPosts', (select count(*) from public.community_posts where hidden),
    'reports', (select count(*) from public.community_reports),
    'docHelperToday', (select coalesce(sum(used_count), 0) from public.doc_helper_usage where used_on = (now() at time zone 'Asia/Seoul')::date),
    'byCourse', (
      select coalesce(jsonb_agg(jsonb_build_object('courseId', course_id, 'enrollments', enrollments, 'outcomes', outcomes) order by course_id), '[]'::jsonb)
      from (
        select e.course_id, count(*) as enrollments,
          (select count(*) from public.demo_outcomes o where o.course_id = e.course_id) as outcomes
        from public.demo_enrollments e group by e.course_id
      ) as courses
    ),
    'newMembersByDay', (
      select jsonb_agg(jsonb_build_object('day', d.day, 'count',
        (select count(*) from members m where (m.first_at at time zone 'Asia/Seoul')::date = d.day)) order by d.day)
      from days d
    )
  ) into result;
  return result;
end;
$$;

-- 신고가 있거나 숨긴 글 목록 (숨긴 글은 일반 읽기 규칙으로는 운영자에게도 안 보인다)
create function public.admin_reported_posts()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.hanclass_admin_role() is null then
    raise exception 'hanclass_not_admin';
  end if;
  return (
    select coalesce(jsonb_agg(to_jsonb(t) order by t.hidden desc, t.report_count desc, t.created_at desc), '[]'::jsonb)
    from (
      select p.id, p.category, p.title, p.author_name, p.hidden, p.created_at,
        count(r.id) as report_count,
        coalesce(jsonb_agg(r.reason) filter (where r.id is not null), '[]'::jsonb) as reasons
      from public.community_posts p
      left join public.community_reports r on r.post_id = p.id
      group by p.id
      having p.hidden or count(r.id) > 0
    ) as t
  );
end;
$$;

-- 숨기기·다시 보이기. 다시 보이게 하면 쌓인 신고를 지워 검토를 끝낸다 (다음 신고 3개부터 다시 숨김)
create function public.admin_set_post_hidden(p_post bigint, p_hidden boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.hanclass_admin_role() is null then
    raise exception 'hanclass_not_admin';
  end if;
  update public.community_posts set hidden = p_hidden where id = p_post;
  if not found then
    raise exception 'hanclass_not_found';
  end if;
  if not p_hidden then
    delete from public.community_reports where post_id = p_post;
  end if;
  insert into public.hanclass_admin_log (actor, action, target_id, reason)
  values ((select auth.uid()), case when p_hidden then 'hide_post' else 'unhide_post' end, p_post::text, left(p_reason, 200));
end;
$$;

-- 규칙을 어긴 글 삭제 (댓글·신고도 함께 지워진다)
create function public.admin_delete_post(p_post bigint, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.hanclass_admin_role() is null then
    raise exception 'hanclass_not_admin';
  end if;
  delete from public.community_posts where id = p_post;
  if not found then
    raise exception 'hanclass_not_found';
  end if;
  insert into public.hanclass_admin_log (actor, action, target_id, reason)
  values ((select auth.uid()), 'delete_post', p_post::text, left(p_reason, 200));
end;
$$;

revoke all on function public.admin_overview() from public, anon;
revoke all on function public.admin_reported_posts() from public, anon;
revoke all on function public.admin_set_post_hidden(bigint, boolean, text) from public, anon;
revoke all on function public.admin_delete_post(bigint, text) from public, anon;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_reported_posts() to authenticated;
grant execute on function public.admin_set_post_hidden(bigint, boolean, text) to authenticated;
grant execute on function public.admin_delete_post(bigint, text) to authenticated;
