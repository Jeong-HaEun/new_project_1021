import { ACCESS_PERIOD, INSTRUCTOR_ID, REFUND_POLICY } from '../policy.js';

// 마케팅 실습 — 가상 광고 데이터 2주치로 주간 보고서 한 장 완성
export const course = {
  id: 'c003',
  slug: 'weekly-ad-report',
  status: 'planned',
  title: '광고 데이터로 주간 성과 보고서 1장 만들기',
  summary: '노출·클릭·전환 숫자를 지표와 한 줄 결론으로 정리합니다.',
  category: 'marketing-practice',
  price: 2000,
  instructorId: INSTRUCTOR_ID,
  outcome: '주간 광고 성과 보고서 1장',
  learn: [
    '보고서에 꼭 넣을 지표 고르기',
    'CTR·CPC·CPA 계산하기',
    '지난주 대비 증감 표시하기',
    '숫자를 한 줄 결론 문장으로 바꾸기',
  ],
  target: [
    '광고 지표 이름은 아는데 보고서로 묶어 본 적 없는 분',
    '마케팅 직무 포트폴리오에 넣을 결과물이 필요한 분',
  ],
  materials: ['엑셀 또는 구글 스프레드시트', '제공하는 가상 광고 데이터(CSV)'],
  extraCost: '없음',
  accessPeriod: ACCESS_PERIOD,
  refundPolicy: REFUND_POLICY,
  tags: ['광고', '보고서', 'CTR', 'CPA', '데이터'],
  thumbnail: 'images/courses/c003.svg',
  lessons: [
    { id: 'l1', title: '보고서를 받는 사람이 궁금한 것', minutes: 4, isPreview: true },
    { id: 'l2', title: 'CTR·CPC·CPA 계산하기', minutes: 7, isPreview: false },
    { id: 'l3', title: '지난주 대비 증감 표시하기', minutes: 6, isPreview: false },
    { id: 'l4', title: '한 장 요약과 결론 문장 쓰기', minutes: 8, isPreview: false },
  ],
};
