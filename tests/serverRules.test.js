// 서버 연결 규칙 검사 — 비밀키 비공개, 데모 수강 기록은 본인만 (CLAUDE.md·SPEC.md 5절)
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');

function listFiles(dir) {
  return readdirSync(join(ROOT, dir)).flatMap((name) => {
    const path = join(dir, name);
    return statSync(join(ROOT, path)).isDirectory() ? listFiles(path) : [path];
  });
}

describe('비밀키를 저장소에 넣지 않는다', () => {
  const files = [...listFiles('src'), ...listFiles('supabase'), '.env.example', ...readdirSync(ROOT).filter((name) => name.endsWith('.html'))];

  it('secret 키·JWT 형태의 키 값이 없다', () => {
    const offenders = files.filter((path) => /sb_secret_[A-Za-z0-9]|eyJ[A-Za-z0-9_-]{20,}/.test(read(path)));
    expect(offenders).toEqual([]);
  });

  it('.env.example에는 이름만 있고 값은 비어 있다', () => {
    const values = read('.env.example').split('\n').filter((line) => /^[A-Z_]+=/.test(line)).map((line) => line.split('=')[1].trim());
    expect(values.length).toBeGreaterThan(0);
    values.forEach((value) => expect(value).toBe(''));
  });

  it('브라우저 코드는 공개용(publishable) 키 이름만 읽는다', () => {
    const server = read('src/lib/server.js');
    expect(server).toContain('VITE_SUPABASE_PUBLISHABLE_KEY');
    expect(server).not.toMatch(/import\.meta\.env\.\w*(SECRET|SERVICE)/);
  });
});

describe('demo_enrollments — 본인 기록만, 중복 신청 불가', () => {
  const sql = read('supabase/migrations/20261016000000_demo_enrollments.sql').toLowerCase();

  it('RLS를 켜고 비로그인(anon) 권한을 뺀다', () => {
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('revoke all on public.demo_enrollments from anon');
  });

  it('조회·추가 정책 모두 로그인한 본인(auth.uid())만', () => {
    expect(sql).toMatch(/for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(sql).toMatch(/for insert\s+to authenticated\s+with check \(\(select auth\.uid\(\)\) = user_id\)/);
  });

  it('수정·삭제 정책은 없다', () => {
    expect(sql).not.toMatch(/for (update|delete|all)/);
  });

  it('같은 사용자·강의는 한 번만 (unique)', () => {
    expect(sql).toMatch(/unique \(user_id, course_id\)/);
  });
});

describe('demo_outcomes — 본인이 신청한 강의만 완성 체크', () => {
  const sql = read('supabase/migrations/20261016000100_demo_outcomes.sql').toLowerCase();

  it('RLS를 켜고 비로그인(anon) 권한을 뺀다', () => {
    expect(sql).toContain('enable row level security');
    expect(sql).toContain('revoke all on public.demo_outcomes from anon');
  });

  it('조회·취소는 본인만', () => {
    expect(sql).toMatch(/for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
    expect(sql).toMatch(/for delete\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = user_id\)/);
  });

  it('추가는 본인 + 본인의 데모 수강 신청이 있을 때만', () => {
    expect(sql).toMatch(/for insert\s+to authenticated\s+with check \(\s*\(select auth\.uid\(\)\) = user_id\s+and exists \(/);
    expect(sql).toContain('from public.demo_enrollments e');
  });

  it('수정 정책은 없고, 같은 강의는 한 번만', () => {
    expect(sql).not.toMatch(/for (update|all)/);
    expect(sql).toMatch(/unique \(user_id, course_id\)/);
  });
});

describe('doc_helper_usage — 서류 도우미 하루 사용 횟수 (입력 내용은 저장하지 않음)', () => {
  const sql = read('supabase/migrations/20261016000200_doc_helper_usage.sql').toLowerCase();

  it('횟수만 저장하고 입력 내용 칸이 없다', () => {
    expect(sql).toMatch(/create table public\.doc_helper_usage/);
    expect(sql).not.toMatch(/letter|question|prompt|content/);
  });

  it('RLS를 켜고 브라우저(anon·authenticated)는 직접 읽거나 쓰지 못한다', () => {
    expect(sql).toContain('alter table public.doc_helper_usage enable row level security');
    expect(sql).toContain('revoke all on public.doc_helper_usage from anon, authenticated');
    expect(sql).not.toMatch(/create policy/);
  });

  it('횟수 차감·환불 함수는 서버 함수(service_role)만 부를 수 있다', () => {
    expect(sql).toMatch(/revoke all on function public\.consume_doc_helper_quota\(uuid, integer, integer\) from public, anon, authenticated/);
    expect(sql).toMatch(/grant execute on function public\.consume_doc_helper_quota\(uuid, integer, integer\) to service_role/);
    expect(sql).toMatch(/revoke all on function public\.refund_doc_helper_quota\(uuid\) from public, anon, authenticated/);
  });

  it('사이트 전체 하루 상한을 넘으면 -2 (동시에 와도 넘지 않게 잠근다)', () => {
    expect(sql).toContain('p_total_limit');
    expect(sql).toContain('pg_advisory_xact_lock');
    expect(sql).toContain('return -2');
  });

  it('하루 기준은 한국 날짜', () => {
    expect(sql).toContain("asia/seoul");
  });
});

describe('서류 도우미 서버 함수 — 비밀키는 서버 환경변수로만', () => {
  const fn = read('supabase/functions/doc-helper/index.ts');

  it('Gemini 키를 코드에 쓰지 않고 환경변수에서 읽는다 (주소가 아닌 헤더로 보낸다)', () => {
    expect(fn).toContain("Deno.env.get('GEMINI_API_KEY')");
    expect(fn).toContain('x-goog-api-key');
    expect(fn).not.toMatch(/AIza[0-9A-Za-z_-]{10,}/);
    expect(fn).not.toMatch(/[?&]key=/);
    expect(fn).not.toMatch(/openai/i);
  });

  it('사이트 전체 하루 상한을 함께 넘긴다', () => {
    expect(fn).toContain('p_total_limit: DAILY_TOTAL_LIMIT');
  });

  it('로그인 확인 뒤에만 AI를 부른다 (getUser가 Gemini 호출보다 먼저)', () => {
    expect(fn.indexOf('auth.getUser')).toBeGreaterThan(-1);
    // 요청 처리(Deno.serve) 안에서 로그인 확인 → 횟수 차감 → AI 호출 순서
    const handler = fn.slice(fn.indexOf('Deno.serve('));
    expect(handler.indexOf('auth.getUser')).toBeLessThan(handler.indexOf('consume_doc_helper_quota'));
    expect(handler.indexOf('consume_doc_helper_quota')).toBeLessThan(handler.indexOf('await askAi('));
  });

  it('입력 내용을 로그로 남기지 않는다', () => {
    expect(fn).not.toMatch(/console\.log\([^)]*(fields|body|letter|question)/);
  });
});
