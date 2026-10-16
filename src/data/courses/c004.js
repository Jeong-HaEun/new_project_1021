import { ACCESS_PERIOD, INSTRUCTOR_ID, REFUND_POLICY } from '../policy.js';

// PPT — 글로 된 보고서를 발표용 슬라이드 3장으로 옮기는 연습
export const course = {
  id: 'c004',
  slug: 'report-to-slides',
  status: 'planned',
  title: '보고서 한 장을 발표 슬라이드 3장으로 바꾸기',
  summary: '긴 글을 핵심 메시지 3개로 줄여 슬라이드에 옮깁니다.',
  category: 'ppt',
  price: 1500,
  instructorId: INSTRUCTOR_ID,
  outcome: '발표용 슬라이드 3장',
  learn: [
    '보고서에서 핵심 메시지 3개 뽑기',
    '슬라이드 한 장에 한 메시지 배치하기',
    '제목을 결론 문장으로 쓰기',
    '글자 크기·정렬을 맞춰 읽기 쉽게 다듬기',
  ],
  target: ['슬라이드에 글을 그대로 붙여 넣게 되는 분', '발표 과제·면접 PT를 앞둔 분'],
  materials: ['파워포인트 또는 구글 프레젠테이션', '제공하는 가상 보고서 예시'],
  extraCost: '파워포인트가 없으면 무료 구글 프레젠테이션으로 가능해요',
  accessPeriod: ACCESS_PERIOD,
  refundPolicy: REFUND_POLICY,
  tags: ['PPT', '슬라이드', '발표', '보고'],
  thumbnail: 'images/courses/c004.svg',
  lessons: [
    { id: 'l1', title: '좋은 슬라이드는 한 장에 한 메시지', minutes: 4, isPreview: true },
    { id: 'l2', title: '보고서에서 핵심 메시지 3개 뽑기', minutes: 5, isPreview: false },
    { id: 'l3', title: '결론형 제목과 근거 배치하기', minutes: 6, isPreview: false },
    { id: 'l4', title: '정렬·글자 크기 다듬고 완성하기', minutes: 5, isPreview: false },
  ],
};
