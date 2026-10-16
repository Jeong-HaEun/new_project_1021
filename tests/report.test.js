// 광고 성과 보고서 페이지(report.html) — SPEC.md 3·5절 기준
import { describe, it, expect } from 'vitest';
import { getReportPageState, REPORT_APP_PATH, REPORT_FRAME_PATH } from '../src/lib/report.js';

describe('getReportPageState — 보고서 페이지 상태', () => {
  it('서버 연결 전이면 unavailable', () => {
    expect(getReportPageState({ configured: false, user: null })).toBe('unavailable');
  });

  it('로그인 확인 중이면 loading, 확인 실패면 error', () => {
    expect(getReportPageState({ configured: true, user: undefined })).toBe('loading');
    expect(getReportPageState({ configured: true, user: undefined, failed: true })).toBe('error');
  });

  it('로그아웃이면 signed-out (카카오 로그인은 한클래스가 맡는다)', () => {
    expect(getReportPageState({ configured: true, user: null })).toBe('signed-out');
  });

  it('로그인했으면 ready (보고서를 끼워 넣어 보여 준다)', () => {
    expect(getReportPageState({ configured: true, user: { id: 'u1' } })).toBe('ready');
  });
});

describe('보고서 주소 — 같은 도메인의 Adporter', () => {
  it('상대 주소라 배포(github.io)에서 같은 도메인으로 열린다 → 로그인 공유', () => {
    expect(REPORT_APP_PATH).toBe('../new_project_oct/');
    expect(REPORT_APP_PATH.startsWith('http')).toBe(false);
  });

  it('끼워 넣을 때는 embed=1 을 붙인다', () => {
    expect(REPORT_FRAME_PATH).toBe('../new_project_oct/?embed=1');
  });
});
