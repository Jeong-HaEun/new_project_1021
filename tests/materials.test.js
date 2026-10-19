// 강의 자료 규칙 — 파일 검사·저장 경로·받기 권한 표시·목록 정리 (SPEC.md '강의 자료')
import { describe, it, expect } from 'vitest';
import {
  MATERIAL_ACCESS, MAX_MATERIAL_BYTES, checkMaterialFile, downloadName, filterCourses, filterMaterials, materialPath, materialProblem, materialState, normalizeMaterials, validateMaterialTitle,
} from '../src/lib/materials.js';

const file = (name, size = 1000) => ({ name, size });

describe('파일 검사', () => {
  it('엑셀·CSV·PPT·워드·PDF·ZIP만, 확장자는 소문자로', () => {
    for (const name of ['실습.xlsx', 'a.XLS', 'b.csv', 'c.pptx', 'd.docx', 'e.pdf', 'f.zip']) expect(checkMaterialFile(file(name)).ok).toBe(true);
    expect(checkMaterialFile(file('a.XLSX'))).toEqual({ ok: true, ext: 'xlsx' });
  });
  it('없거나 다른 형식·50MB 초과는 이유를 알려 준다', () => {
    expect(checkMaterialFile(null)).toEqual({ ok: false, reason: 'required' });
    expect(checkMaterialFile(file('a.exe'))).toEqual({ ok: false, reason: 'type' });
    expect(checkMaterialFile(file('noext'))).toEqual({ ok: false, reason: 'type' });
    expect(checkMaterialFile(file('a.pdf', MAX_MATERIAL_BYTES + 1))).toEqual({ ok: false, reason: 'too-big' });
  });
});

describe('자료 이름', () => {
  it('앞뒤 공백을 지우고 2~40자', () => {
    expect(validateMaterialTitle('  실습 파일 ')).toEqual({ ok: true, title: '실습 파일' });
    expect(validateMaterialTitle('a').ok).toBe(false);
    expect(validateMaterialTitle('가'.repeat(41)).ok).toBe(false);
  });
  it('받는 파일 이름은 자료 이름 + 확장자 (파일 이름에 못 쓰는 글자는 바꾼다)', () => {
    expect(downloadName({ title: '주문 내역 실습', filePath: 'c002/abc.xlsx' })).toBe('주문 내역 실습.xlsx');
    expect(downloadName({ title: 'a/b:c', filePath: 'c002/abc.pdf' })).toBe('a_b_c.pdf');
  });
});

describe('저장 경로', () => {
  it('강의 폴더 아래 무작위 이름 (원래 파일 이름은 쓰지 않는다)', () => {
    expect(materialPath('c002', 'xlsx', 'id-1')).toBe('c002/id-1.xlsx');
  });
});

describe('받기 상태', () => {
  const free = { courseId: 'c002', access: 'free' };
  const paid = { courseId: 'c002', access: 'enrolled' };
  it('결제 전 자료: 로그인하면 받기, 아니면 로그인 안내', () => {
    expect(materialState(free, { id: 'u' }, new Set())).toBe('download');
    expect(materialState(free, null, new Set())).toBe('login');
  });
  it('결제 후 자료: 그 강의를 신청했으면 받기, 아니면 잠김(로그아웃이면 로그인 안내)', () => {
    expect(materialState(paid, { id: 'u' }, new Set(['c002']))).toBe('download');
    expect(materialState(paid, { id: 'u' }, new Set(['c003']))).toBe('locked');
    expect(materialState(paid, null, new Set())).toBe('login');
  });
  it('공개 범위는 결제 전·결제 후 두 가지', () => {
    expect(Object.keys(MATERIAL_ACCESS)).toEqual(['free', 'enrolled']);
  });
});

describe('서버 목록 정리', () => {
  it('모르는 강의·형식이 틀린 행은 빼고, 강의 순·올린 순', () => {
    const rows = [
      { id: 2, course_id: 'c003', title: 'B', file_path: 'c003/b.pdf', size: 10, access: 'free', created_at: '2026-10-19T02:00:00Z' },
      { id: 1, course_id: 'c002', title: 'A', file_path: 'c002/a.xlsx', size: 20, access: 'enrolled', created_at: '2026-10-19T01:00:00Z' },
      { id: 3, course_id: 'c999', title: 'X', file_path: 'c999/x.pdf', size: 1, access: 'free', created_at: '2026-10-19T00:00:00Z' },
      { id: 4, course_id: 'c002', title: 'Y', file_path: 'c002/y.pdf', size: 1, access: 'secret', created_at: '2026-10-19T00:00:00Z' },
    ];
    const courses = [{ id: 'c002', title: 'VLOOKUP' }, { id: 'c003', title: '보고서' }];
    expect(normalizeMaterials(rows, courses)).toEqual([
      { id: 1, courseId: 'c002', courseTitle: 'VLOOKUP', title: 'A', filePath: 'c002/a.xlsx', size: 20, access: 'enrolled', createdAt: '2026-10-19T01:00:00Z' },
      { id: 2, courseId: 'c003', courseTitle: '보고서', title: 'B', filePath: 'c003/b.pdf', size: 10, access: 'free', createdAt: '2026-10-19T02:00:00Z' },
    ]);
    expect(normalizeMaterials(null, courses)).toEqual([]);
  });
});

describe('서버 오류', () => {
  it('SQL 적용 전·권한 없음·용량 초과를 구분한다', () => {
    expect(materialProblem({ code: '42P01', message: 'relation does not exist' })).toBe('not-ready');
    expect(materialProblem({ code: 'PGRST205', message: 'Could not find the table' })).toBe('not-ready');
    expect(materialProblem({ message: 'Bucket not found' })).toBe('not-ready');
    expect(materialProblem({ statusCode: '413', message: 'too large' })).toBe('too-big');
    expect(materialProblem({ code: '42501', message: 'row-level security' })).toBe('not-allowed');
    expect(materialProblem({ message: 'boom' })).toBe('unknown');
  });
});

describe('내 강의실 강의별 필터', () => {
  const courses = [{ id: 'c002' }, { id: 'c003' }, { id: 'c004' }];
  const materials = [{ id: 1, courseId: 'c002' }, { id: 2, courseId: 'c003' }, { id: 3, courseId: 'c002' }];
  it('신청한 강의가 둘 이상이면 자료가 없는 강의까지 모두 필터로', () => {
    expect(filterCourses(courses).map((c) => c.id)).toEqual(['c002', 'c003', 'c004']);
  });
  it('신청한 강의가 하나뿐이면 필터 없음', () => {
    expect(filterCourses([{ id: 'c002' }])).toEqual([]);
  });
  it('전체는 모두, 강의를 고르면 그 강의 자료만', () => {
    expect(filterMaterials(materials, 'all').length).toBe(3);
    expect(filterMaterials(materials, 'c002').map((m) => m.id)).toEqual([1, 3]);
  });
});
