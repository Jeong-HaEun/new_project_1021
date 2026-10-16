import { ACCESS_PERIOD, INSTRUCTOR_ID, REFUND_POLICY } from '../policy.js';

// 서류 가이드 — 공고 분석과 자소서 점검을 표 하나로 끝낸다 (강의 1편 = 결과물 1개)
export const course = {
  id: 'c001',
  slug: 'job-posting-match',
  status: 'planned',
  title: '채용공고로 핵심 역량 찾고 내 자소서 점검하기',
  summary: '공고 문장에서 핵심 역량 5개를 뽑아 내 자소서와 맞춰 봅니다.',
  category: 'docs',
  price: 1000,
  instructorId: INSTRUCTOR_ID,
  outcome: '공고-자소서 매칭표 1장',
  learn: [
    '공고 문장을 업무와 역량으로 나누기',
    '반복되는 표현으로 핵심 역량 5개 고르기',
    '내 자소서 문장을 역량에 연결하기',
    '비어 있는 역량을 채울 경험 찾기',
  ],
  target: [
    '지원할 공고는 있는데 무엇을 강조할지 모르겠는 분',
    '자소서를 쓰고 나서 공고와 맞는지 확인하고 싶은 분',
  ],
  materials: ['지원하려는 채용공고 1개', '작성 중인 자소서 (없으면 제공하는 가상 예시 사용)'],
  extraCost: '없음',
  accessPeriod: ACCESS_PERIOD,
  refundPolicy: REFUND_POLICY,
  tags: ['채용공고', '자소서', '직무역량', '취업'],
  thumbnail: 'images/courses/c001.svg',
  lessons: [
    { id: 'l1', title: '공고에서 업무와 역량 구분하기', minutes: 4, isPreview: true },
    { id: 'l2', title: '핵심 역량 5개 고르기', minutes: 5, isPreview: false },
    { id: 'l3', title: '자소서 문장을 역량에 연결하기', minutes: 6, isPreview: false },
    { id: 'l4', title: '빈칸 찾고 보완 방향 정리하기', minutes: 5, isPreview: false },
  ],
};
