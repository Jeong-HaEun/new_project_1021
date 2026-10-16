import { ACCESS_PERIOD, INSTRUCTOR_ID, REFUND_POLICY } from '../policy.js';

// AI 실습 — AI 결과를 그대로 믿지 않고 원본과 대조하는 습관까지 연습
export const course = {
  id: 'c006',
  slug: 'ai-meeting-todo',
  status: 'planned',
  title: 'AI로 회의 메모를 할 일 표로 정리하기',
  summary: '어수선한 회의 메모를 AI로 정리하고 빠진 내용을 직접 확인합니다.',
  category: 'ai',
  price: 1500,
  instructorId: INSTRUCTOR_ID,
  outcome: '사실 확인을 마친 할 일 표 1개',
  learn: [
    '정리용 요청문(프롬프트) 쓰기',
    '담당자·기한·할 일 형식으로 받기',
    'AI 결과를 원본 메모와 대조하기',
    '틀리거나 빠진 내용 고쳐서 완성하기',
  ],
  target: ['AI를 써 보고 싶지만 결과를 믿어도 될지 불안한 분', '회의 정리를 맡게 될 신입·인턴'],
  materials: ['무료로 쓸 수 있는 생성형 AI 서비스 계정', '제공하는 가상 회의 메모'],
  extraCost: 'AI 서비스는 무료 요금제로 충분해요',
  accessPeriod: ACCESS_PERIOD,
  refundPolicy: REFUND_POLICY,
  tags: ['AI', '프롬프트', '회의록', '업무 정리'],
  thumbnail: 'images/courses/c006.svg',
  lessons: [
    { id: 'l1', title: 'AI에게 맡길 일과 내가 할 일', minutes: 4, isPreview: true },
    { id: 'l2', title: '정리용 요청문 쓰기', minutes: 5, isPreview: false },
    { id: 'l3', title: '원본과 대조해 틀린 곳 찾기', minutes: 6, isPreview: false },
    { id: 'l4', title: '할 일 표 완성하기', minutes: 4, isPreview: false },
  ],
};
