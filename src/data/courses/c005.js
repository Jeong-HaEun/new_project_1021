import { ACCESS_PERIOD, INSTRUCTOR_ID, REFUND_POLICY } from '../policy.js';

// 마케팅 기초 — 가상 브랜드로 타깃·메시지·채널을 한 장에 정리
export const course = {
  id: 'c005',
  slug: 'one-page-marketing-plan',
  status: 'planned',
  title: '타깃·메시지·채널 한 장 기획표 만들기',
  summary: '가상 브랜드 하나로 누구에게, 무엇을, 어디서 말할지 정리합니다.',
  category: 'marketing-basic',
  price: 1000,
  instructorId: INSTRUCTOR_ID,
  outcome: '한 장 마케팅 기획표 1개',
  learn: [
    '타깃을 한 문장으로 좁히기',
    '타깃이 얻는 이점을 메시지로 바꾸기',
    '메시지에 맞는 채널 고르기',
    '한 장 기획표로 정리하기',
  ],
  target: [
    '마케팅 용어는 들어 봤지만 기획으로 이어 본 적 없는 분',
    '마케팅 직무 면접에서 기획 경험을 설명해야 하는 분',
  ],
  materials: ['제공하는 한 장 기획표 양식', '문서 도구 (한글·워드·구글 문서 중 아무거나)'],
  extraCost: '없음',
  accessPeriod: ACCESS_PERIOD,
  refundPolicy: REFUND_POLICY,
  tags: ['마케팅', '기획', '타깃', '메시지', '채널'],
  thumbnail: 'images/courses/c005.svg',
  lessons: [
    { id: 'l1', title: '기획표 한 장이 필요한 이유', minutes: 3, isPreview: true },
    { id: 'l2', title: '타깃을 한 문장으로 좁히기', minutes: 5, isPreview: false },
    { id: 'l3', title: '이점을 메시지로 바꾸기', minutes: 5, isPreview: false },
    { id: 'l4', title: '채널 고르고 기획표 완성하기', minutes: 6, isPreview: false },
  ],
};
