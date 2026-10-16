// 추천 순서는 선택 안내일 뿐 묶음 상품이나 필수 수강 조건이 아니다.
export const LEARNING_PATH = [
  { courseId: 'c005', label: '마케팅의 뼈대', description: '누구에게 무엇을 말할지 정해요.' },
  { courseId: 'c002', label: '엑셀로 데이터 정리', description: '흩어진 표를 실무에 쓸 자료로 만들어요.' },
  { courseId: 'c003', label: '광고 성과 해석', description: '숫자에서 변화와 다음 행동을 찾아요.' },
  { courseId: 'c004', label: 'PPT로 전달', description: '한 장의 결론을 발표 자료로 옮겨요.' },
];

export const REPORT_EXAMPLE = {
  courseId: 'c003',
  url: 'https://Jeong-HaEun.github.io/new_project_oct/',
  title: '숫자를 읽고, 다음 행동을 설명하는 마케터로',
  description: '광고 데이터를 정리한 뒤에는 해석이 필요해요. 매체별 지표와 기간별 변화를 살펴보고, 내 언어로 결론을 써보는 연습을 준비하고 있어요.',
  metrics: [
    { label: '광고비', value: '150,000원' },
    { label: '매출', value: '450,000원' },
    { label: 'ROAS', value: '300%' },
  ],
};
