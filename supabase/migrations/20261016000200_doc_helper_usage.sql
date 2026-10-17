-- 서류 도우미 하루 사용 횟수 (SPEC.md '서류 도우미')
-- 입력한 자소서·서류 내용은 저장하지 않는다. 사람별·날짜별 횟수만 남긴다
-- 브라우저는 이 표를 직접 읽거나 쓰지 못한다. 서버 함수(doc-helper)가 secret 키로 아래 함수만 부른다

create table public.doc_helper_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  used_on date not null,
  used_count integer not null default 0 check (used_count >= 0),
  primary key (user_id, used_on)
);

alter table public.doc_helper_usage enable row level security;
revoke all on public.doc_helper_usage from anon, authenticated;

-- 한 번 차감. 남은 횟수를 돌려준다. 이 사람이 다 썼으면 -1, 사이트 전체 하루 상한에 닿았으면 -2 (둘 다 차감하지 않음)
-- 전체 상한은 무료 AI 한도를 넘지 않게 하는 안전장치. 동시에 여러 요청이 와도 넘지 않도록 하루 단위로 잠근다. 하루 기준은 한국 날짜
create or replace function public.consume_doc_helper_quota(p_user uuid, p_limit integer, p_total_limit integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  total integer;
  new_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('doc_helper_usage'), (today - date '2000-01-01'));
  select coalesce(sum(used_count), 0) into total from public.doc_helper_usage where used_on = today;
  if total >= p_total_limit then
    return -2;
  end if;
  insert into public.doc_helper_usage (user_id, used_on, used_count)
  values (p_user, today, 1)
  on conflict (user_id, used_on) do update
    set used_count = public.doc_helper_usage.used_count + 1
    where public.doc_helper_usage.used_count < p_limit
  returning used_count into new_count;
  if new_count is null then
    return -1;
  end if;
  return p_limit - new_count;
end;
$$;

-- AI 호출이 실패했을 때 한 번 되돌린다
create or replace function public.refund_doc_helper_quota(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.doc_helper_usage
    set used_count = greatest(used_count - 1, 0)
    where user_id = p_user and used_on = (now() at time zone 'Asia/Seoul')::date;
end;
$$;

-- 오늘 쓴 횟수 (남은 횟수 표시용)
create or replace function public.get_doc_helper_usage(p_user uuid)
returns integer language sql security definer set search_path = '' as $$
  select coalesce(
    (select used_count from public.doc_helper_usage
      where user_id = p_user and used_on = (now() at time zone 'Asia/Seoul')::date),
    0);
$$;

revoke all on function public.consume_doc_helper_quota(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.refund_doc_helper_quota(uuid) from public, anon, authenticated;
revoke all on function public.get_doc_helper_usage(uuid) from public, anon, authenticated;
grant execute on function public.consume_doc_helper_quota(uuid, integer, integer) to service_role;
grant execute on function public.refund_doc_helper_quota(uuid) to service_role;
grant execute on function public.get_doc_helper_usage(uuid) to service_role;
