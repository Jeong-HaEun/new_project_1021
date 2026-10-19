import { ACCESS_PERIOD, INSTRUCTOR_ID, REFUND_POLICY } from '../policy.js';

// 엑셀 — 가상 회사의 주문 내역과 거래처 목록을 합치는 업무 상황
// 실무에서 더 많이 쓰는 VLOOKUP으로 진행하고, 1차시에 빠른 실행 도구 모음으로 작업 속도부터 높인다
export const course = {
  id: 'c002',
  slug: 'vlookup-merge-tables',
  status: 'open', // 시연용으로 열어 둠 (실제 강의 본문은 아직 없음)
  title: 'VLOOKUP으로 흩어진 두 표 합치기',
  summary: '거래처 코드 하나로 주문 내역에 담당자 정보를 한 번에 붙입니다.',
  category: 'excel',
  price: 1000,
  // 모집 기간 예시 (YYYY-MM-DD, 한국 날짜, 양 끝 포함). 지우면 상시 모집
  enrollment: { startDate: '2026-10-01', endDate: '2026-12-31' },
  instructorId: INSTRUCTOR_ID,
  outcome: '두 표를 합친 완성 파일 1개',
  learn: [
    '빠른 실행 도구 모음에 자주 쓰는 기능 꺼내 두기',
    'VLOOKUP 기본 형식 익히기',
    '찾는 값이 없을 때 표시하고 표 전체에 적용하기',
    '결과가 맞는지 점검하기',
  ],
  target: [
    'VLOOKUP이 헷갈려서 표를 손으로 합치고 있는 분',
    '첫 출근 전에 엑셀 업무를 하나 익혀 두고 싶은 분',
  ],
  materials: ['엑셀(Microsoft 365 또는 2016 이상), 혹은 구글 스프레드시트', '제공하는 가상 실습 파일'],
  extraCost: '엑셀이 없으면 무료 구글 스프레드시트로 VLOOKUP 실습(2~5차시)을 할 수 있어요. 빠른 실행 도구 모음(1차시)은 엑셀에만 있어요',
  accessPeriod: ACCESS_PERIOD,
  refundPolicy: REFUND_POLICY,
  tags: ['엑셀', 'VLOOKUP', '빠른 실행 도구 모음', '함수', '표 합치기'],
  thumbnail: 'images/courses/c002.svg',
  // 1차시는 운영자가 정함. 2~5차시는 임시 구성(AI 초안) — 운영자가 확정하면 바꾼다
  lessons: [
    { id: 'l1', title: '엑셀 속도 높이는 빠른 실행 도구 모음', minutes: 3, isPreview: true },
    { id: 'l2', title: '업무 상황 보기: 주문 내역에 담당자 붙이기', minutes: 3, isPreview: false },
    { id: 'l3', title: 'VLOOKUP 기본 형식: 찾을 값·범위·열 번호', minutes: 4, isPreview: false },
    { id: 'l4', title: '못 찾을 때 표시하고 표 전체에 적용하기', minutes: 4, isPreview: false },
    { id: 'l5', title: '결과 점검하고 완성 파일 저장하기', minutes: 4, isPreview: false },
  ],
};
