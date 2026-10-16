import { ACCESS_PERIOD, INSTRUCTOR_ID, REFUND_POLICY } from '../policy.js';

// 엑셀 — 가상 회사의 주문 내역과 거래처 목록을 합치는 업무 상황
export const course = {
  id: 'c002',
  slug: 'xlookup-merge-tables',
  status: 'planned',
  title: 'XLOOKUP으로 흩어진 두 표 합치기',
  summary: '거래처 코드 하나로 주문 내역에 담당자 정보를 한 번에 붙입니다.',
  category: 'excel',
  price: 1000,
  instructorId: INSTRUCTOR_ID,
  outcome: '두 표를 합친 완성 파일 1개',
  learn: [
    'XLOOKUP 기본 형식 익히기',
    '찾는 값이 없을 때 표시 정하기',
    '표 전체에 한 번에 적용하기',
    '결과가 맞는지 점검하기',
  ],
  target: [
    'VLOOKUP이 헷갈려서 표를 손으로 합치고 있는 분',
    '첫 출근 전에 엑셀 업무를 하나 익혀 두고 싶은 분',
  ],
  materials: ['엑셀 2021 이상 또는 Microsoft 365, 혹은 구글 스프레드시트', '제공하는 가상 실습 파일'],
  extraCost: '엑셀이 없으면 무료 구글 스프레드시트로 같은 실습을 할 수 있어요',
  accessPeriod: ACCESS_PERIOD,
  refundPolicy: REFUND_POLICY,
  tags: ['엑셀', 'XLOOKUP', '함수', '표 합치기'],
  thumbnail: 'images/courses/c002.svg',
  lessons: [
    { id: 'l1', title: '업무 상황 보기: 왜 표를 합쳐야 할까', minutes: 3, isPreview: true },
    { id: 'l2', title: 'XLOOKUP 기본 형식', minutes: 4, isPreview: false },
    { id: 'l3', title: '못 찾을 때 표시하고 표 전체에 적용하기', minutes: 4, isPreview: false },
    { id: 'l4', title: '결과 점검하고 완성 파일 저장하기', minutes: 4, isPreview: false },
  ],
};
