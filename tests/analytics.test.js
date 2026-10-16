// GA4 방문 통계 — docs/analytics-plan.md 기준
// 측정 ID가 있을 때만, 허용한 항목만, 개인정보·검색어 없이 보낸다
import { describe, it, expect } from 'vitest';
import { cleanPageLocation, EVENT_PARAMS, pickParams, shouldLoadAnalytics } from '../src/lib/analytics.js';

describe('shouldLoadAnalytics — GA4를 불러올지', () => {
  const site = 'https://jeong-haeun.github.io/new_project_1021/index.html';

  it('측정 ID가 없으면 불러오지 않는다', () => {
    expect(shouldLoadAnalytics('', site)).toBe(false);
  });

  it('배포 주소에서 측정 ID가 있으면 불러온다', () => {
    expect(shouldLoadAnalytics('G-TEST123', site)).toBe(true);
  });

  it('내 컴퓨터(localhost)에서는 ?ga_debug=1 일 때만 (개발 중 방문이 섞이지 않게)', () => {
    expect(shouldLoadAnalytics('G-TEST123', 'http://localhost:5174/new_project_1021/')).toBe(false);
    expect(shouldLoadAnalytics('G-TEST123', 'http://127.0.0.1:5174/new_project_1021/')).toBe(false);
    expect(shouldLoadAnalytics('G-TEST123', 'http://localhost:5174/new_project_1021/?ga_debug=1')).toBe(true);
  });

  it('한클래스 배포 주소가 아니면 불러오지 않는다 (같은 github.io의 다른 사이트·다른 도메인·내부망 주소)', () => {
    expect(shouldLoadAnalytics('G-TEST123', 'https://jeong-haeun.github.io/new_project_oct/')).toBe(false);
    expect(shouldLoadAnalytics('G-TEST123', 'https://jeong-haeun.github.io/project_1021/index.html')).toBe(false);
    expect(shouldLoadAnalytics('G-TEST123', 'https://other-user.github.io/new_project_1021/')).toBe(false);
    expect(shouldLoadAnalytics('G-TEST123', 'http://192.168.0.5:5174/new_project_1021/')).toBe(false);
    expect(shouldLoadAnalytics('G-TEST123', 'https://jeong-haeun.github.io/new_project_1021-copy/')).toBe(false);
  });

  it('A/B 시연 주소(?ab_preview)이거나 시연 중인 탭이면 불러오지 않는다 (시연 데이터는 측정 제외)', () => {
    expect(shouldLoadAnalytics('G-TEST123', `${site}?ab_preview=A`)).toBe(false);
    expect(shouldLoadAnalytics('G-TEST123', 'https://jeong-haeun.github.io/new_project_1021/course.html?id=c002', { previewSession: true })).toBe(false);
    expect(shouldLoadAnalytics('G-TEST123', 'http://localhost:5174/new_project_1021/?ga_debug=1&ab_preview=B')).toBe(false);
  });

  it('G- 형식이 아니면 불러오지 않는다', () => {
    expect(shouldLoadAnalytics('UA-1234', site)).toBe(false);
  });
});

describe('cleanPageLocation — 주소에서 보내면 안 되는 값 지우기', () => {
  it('검색어(q)를 지우고 분야는 남긴다', () => {
    expect(cleanPageLocation('https://x.io/courses.html?category=excel&q=%EB%B3%B4%EA%B3%A0%EC%84%9C')).toBe(
      'https://x.io/courses.html?category=excel',
    );
  });

  it('로그인 결과 값(code·토큰·오류)과 # 뒷부분을 지운다', () => {
    expect(cleanPageLocation('https://x.io/myclass.html?code=abc&error=x#access_token=secret')).toBe('https://x.io/myclass.html');
  });

  it('강의 id·디버그 표시는 남긴다', () => {
    expect(cleanPageLocation('https://x.io/course.html?id=c002')).toBe('https://x.io/course.html?id=c002');
  });
});

describe('pickParams — 이벤트마다 허용한 항목만', () => {
  it('허용하지 않은 항목(검색어 원문·이메일 등)은 버린다', () => {
    expect(pickParams('course_search', { query_length: 3, query: '엑셀', email: 'a@b.c' })).toEqual({ query_length: 3 });
  });

  it('비어 있는 값은 보내지 않는다', () => {
    expect(pickParams('select_item', { item_id: 'c002', placement: undefined })).toEqual({ item_id: 'c002' });
  });

  it('모르는 이벤트는 null (보내지 않음)', () => {
    expect(pickParams('unknown_event', { a: 1 })).toBeNull();
  });
});

describe('데모 주문 이벤트는 실제 구매 이벤트와 분리', () => {
  it('GA4 표준 구매 이벤트(purchase·add_to_cart·begin_checkout)는 쓰지 않는다 — 가짜 매출 방지', () => {
    ['purchase', 'add_to_cart', 'begin_checkout', 'refund'].forEach((name) => expect(EVENT_PARAMS).not.toHaveProperty(name));
  });

  it('데모 이벤트는 demo_ 로 시작하고 금액(value) 항목이 없다', () => {
    ['demo_add_to_cart', 'demo_begin_checkout', 'demo_order_complete'].forEach((name) => {
      expect(EVENT_PARAMS).toHaveProperty(name);
      expect(EVENT_PARAMS[name]).not.toContain('value');
    });
  });
});

describe('메인 A/B 실험 이벤트 — 허용 항목만', () => {
  it('노출·상세 도달·강의 구역 도달 이벤트가 등록돼 있고 변형·실험 id 외 개인정보는 버린다', () => {
    expect(pickParams('experiment_home_exposure', { experiment_id: 'x', variant: 'A', mode: 'experiment', placement: 'home', email: 'a@b.c' }))
      .toEqual({ experiment_id: 'x', variant: 'A', mode: 'experiment', placement: 'home' });
    expect(pickParams('experiment_course_open', { experiment_id: 'x', variant: 'B', mode: 'experiment', placement: 'course', course_id: 'c002', source: 'home_card' }))
      .toEqual({ experiment_id: 'x', variant: 'B', mode: 'experiment', placement: 'course', course_id: 'c002', source: 'home_card' });
    expect(pickParams('experiment_classes_view', { experiment_id: 'x', variant: 'A' })).toEqual({ experiment_id: 'x', variant: 'A' });
  });
});

describe('서류 도우미 이벤트 — 어떤 길잡이인지·결과만 (입력 내용 제외)', () => {
  it('허용 항목만 남기고 입력 원문은 버린다', () => {
    expect(pickParams('helper_generate', { helper_mode: 'interview', result: 'ok', letter: '내 자소서', job: '마케터' }))
      .toEqual({ helper_mode: 'interview', result: 'ok' });
    expect(pickParams('helper_tab_select', { helper_mode: 'edit' })).toEqual({ helper_mode: 'edit' });
    expect(pickParams('helper_copy', { helper_mode: 'edit', text: '복사한 글' })).toEqual({ helper_mode: 'edit' });
    expect(pickParams('helper_open_ai', { helper_mode: 'edit' })).toEqual({ helper_mode: 'edit' });
  });
});
