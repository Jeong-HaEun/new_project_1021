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
