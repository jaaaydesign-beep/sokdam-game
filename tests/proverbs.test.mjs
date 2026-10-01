import { test } from 'node:test';
import assert from 'node:assert/strict';
await import('../src/proverbs.js');
const proverbs = globalThis.Sokdam.proverbs;

test('속담은 정확히 100개', () => {
  assert.equal(proverbs.length, 100);
});

test('빈칸 단어는 2~3글자', () => {
  for (const p of proverbs) {
    assert.ok(p.answer.length >= 2 && p.answer.length <= 3, `${p.problem}: ${p.answer}`);
  }
});

test('빈칸 단어 안에 중복 글자 없음', () => {
  for (const p of proverbs) {
    assert.equal(new Set(p.answer).size, p.answer.length, `${p.problem}: ${p.answer}`);
  }
});

test('속담 간 정답 단어 중복 없음', () => {
  const answers = proverbs.map((p) => p.answer);
  assert.equal(new Set(answers).size, answers.length);
});

test('blankStart 위치의 부분 문자열이 answer 와 일치', () => {
  for (const p of proverbs) {
    assert.equal(
      p.problem.slice(p.blankStart, p.blankStart + p.answer.length), p.answer,
      `${p.problem} @${p.blankStart}`,
    );
  }
});

test('정답이 문장에 2회 이상 나오면 blankStart 는 첫 번째 위치', () => {
  for (const p of proverbs) {
    assert.equal(p.blankStart, p.problem.indexOf(p.answer), p.problem);
  }
});

test('meaning 은 비어있지 않은 문자열', () => {
  for (const p of proverbs) {
    assert.ok(typeof p.meaning === 'string' && p.meaning.trim().length >= 5, p.problem);
  }
});

test('활용형 정답은 31단계 이후에만 배치', () => {
  const inflected = ['맞들면', '곱다', '두들겨', '누워서', '뱉는다', '거둔다', '맵다'];
  proverbs.forEach((p, i) => {
    if (inflected.includes(p.answer)) {
      assert.ok(i + 1 >= 31, `${p.answer} 가 ${i + 1}단계에 있음`);
    }
  });
});
