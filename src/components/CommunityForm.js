// 커뮤니티 글쓰기·수정 폼과 댓글 영역
// 입력값은 value 속성·textContent로만 넣는다 (HTML로 해석하지 않음)
import { el } from '../lib/dom.js';
import { CATEGORIES, LIMITS } from '../lib/community.js';
import { formatPostDate } from '../lib/communityView.js';
import { RULES_NOTE } from './CommunityParts.js';

function Field(label, control, hint) {
  return el('label', { className: 'helper-field' }, [
    el('span', { className: 'helper-field__label', text: label }),
    control,
    hint ? el('span', { className: 'community-hint', text: hint }) : null,
  ]);
}

const input = (name, value, max, extra = {}) =>
  el('input', { name, className: 'helper-input', value: value ?? '', maxlength: String(max), required: '', ...extra });

function textarea(name, value, max, rows) {
  const node = el('textarea', { name, className: 'helper-input', maxlength: String(max), rows: String(rows), required: '' });
  node.value = value ?? '';
  return node;
}

export function ErrorText(message) {
  return message ? el('p', { className: 'helper-notice helper-notice--error', role: 'alert', text: message }) : null;
}

// 분류 라디오 — 결과물 공유를 고르면 강의 선택이 필수
function CategoryPicker(current) {
  return el('fieldset', { className: 'community-picker' }, [
    el('legend', { className: 'helper-field__label', text: '분류' }),
    ...CATEGORIES.map((item) => el('label', { className: 'community-picker__item' }, [
      el('input', { type: 'radio', name: 'category', value: item.id, ...(current === item.id && { checked: '' }) }),
      el('span', {}, [el('strong', { text: item.label }), el('span', { className: 'community-hint', text: item.hint })]),
    ])),
  ]);
}

function CoursePicker(courses, current) {
  const select = el('select', { name: 'courseId', className: 'helper-input' }, [
    el('option', { value: '', text: '고르지 않음' }),
    ...courses.map((course) => el('option', { value: course.id, text: course.title, ...(current === course.id && { selected: '' }) })),
  ]);
  return Field('관련 강의', select, '결과물 공유는 결과물을 만든 강의를 꼭 골라 주세요.');
}

// post: 수정할 글(없으면 새 글). values: 저장 실패 뒤 다시 보여 줄 입력값. onSubmit(event)
export function PostForm({ post, values, courses, authorName, error, busy, onSubmit }) {
  const v = values ?? post ?? {};
  return el('form', { className: 'helper-panel helper-form', novalidate: '', onSubmit }, [
    el('h1', { className: 'community-form__title', text: post ? '글 수정' : '글쓰기' }),
    el('p', { className: 'helper-privacy', text: RULES_NOTE }),
    CategoryPicker(v.category ?? 'outcome'),
    CoursePicker(courses, v.courseId),
    Field('제목', input('title', v.title, LIMITS.title.max)),
    Field('내용', textarea('body', v.body, LIMITS.body.max, 8), `${LIMITS.body.max}자까지. 결과물 공유는 무엇을 만들었고, 어디서 막혔고, 어떻게 풀었는지 적어 보세요.`),
    Field('닉네임', input('authorName', v.authorName ?? authorName, LIMITS.authorName.max, { autocomplete: 'nickname' }), '실명 대신 닉네임을 써 주세요. 이 브라우저에 기억해 둬요.'),
    ErrorText(error),
    el('div', { className: 'helper-actions' }, [
      el('button', { type: 'submit', className: 'button button--primary', ...(busy && { disabled: '' }), text: busy ? '저장하는 중…' : post ? '수정 저장' : '올리기' }),
      el('a', { href: post ? `community.html?post=${post.id}` : 'community.html', className: 'button button--ghost', text: '취소' }),
    ]),
  ]);
}

// 댓글 영역 — 목록(오래된 순) + 로그인했으면 쓰기 폼, 아니면 로그인 안내(loginNode)
export function CommentSection({ comments, user, authorName, draft = '', error, busy, onSubmit, onDelete, loginNode }) {
  const item = (comment) => el('li', { className: 'community-comment' }, [
    el('p', { className: 'community-meta' }, [el('strong', { text: comment.authorName }), el('span', { text: formatPostDate(comment.createdAt) })]),
    el('p', { className: 'community-comment__body', text: comment.body }),
    user?.id && comment.userId === user.id
      ? el('button', { type: 'button', className: 'community-link-button community-danger', onClick: () => onDelete(comment.id), text: '삭제' })
      : null,
  ]);

  const form = user ? el('form', { className: 'community-comment-form', novalidate: '', onSubmit }, [
    Field('댓글', textarea('body', draft, LIMITS.comment.max, 3)),
    Field('닉네임', input('authorName', authorName, LIMITS.authorName.max, { autocomplete: 'nickname' })),
    el('p', { className: 'community-hint', text: RULES_NOTE }),
    ErrorText(error),
    el('button', { type: 'submit', className: 'button button--primary', ...(busy && { disabled: '' }), text: busy ? '올리는 중…' : '댓글 올리기' }),
  ]) : loginNode;

  return el('section', { className: 'community-comments', 'aria-label': '댓글' }, [
    el('h2', { className: 'myclass-section__title', text: `댓글 ${comments.length}` }),
    comments.length > 0 ? el('ul', { className: 'community-comment-list' }, comments.map(item)) : el('p', { className: 'text-muted', text: '아직 댓글이 없어요.' }),
    form,
  ]);
}
