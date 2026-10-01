(function (root) {
  'use strict';
  // 진행 구조 (사용자 확정): 돌(단계) 1개 = 속담 10개 묶음. 돌 10개 × 10문제 = 100문제.
  // "전역 문제 번호" n(1~100)은 게임 룰의 stage 와 동일 — 난이도 밴드 floor((n-1)/10)이
  // 돌 경계와 일치하고, 혼동 글자(31+) 기준도 그대로 성립한다.
  const PROBLEMS_PER_STONE = 10;
  const TOTAL_PROBLEMS = root.STAGE_COUNT; // proverbs.js 가 단일 소스 (= 100)
  const STONE_COUNT = Math.ceil(TOTAL_PROBLEMS / PROBLEMS_PER_STONE);

  function stoneOf(n) { return Math.ceil(n / PROBLEMS_PER_STONE); }
  function problemInStone(n) { return ((n - 1) % PROBLEMS_PER_STONE) + 1; }

  // cleared: 클리어한 문제 수(0~100). 문제는 전역 번호 순서대로만 클리어된다.
  function stoneStatus(cleared, stone) {
    if (cleared >= stone * PROBLEMS_PER_STONE) return 'done';
    if (cleared >= (stone - 1) * PROBLEMS_PER_STONE) return 'cur';
    return 'lock';
  }

  function stoneProgress(cleared, stone) {
    const inStone = cleared - (stone - 1) * PROBLEMS_PER_STONE;
    return Math.max(0, Math.min(PROBLEMS_PER_STONE, inStone));
  }

  // 돌 클릭 시 시작할 전역 문제 번호. 도전 중 돌은 이어하기, 완료 돌은 처음부터 재플레이.
  function startProblem(cleared, stone) {
    const status = stoneStatus(cleared, stone);
    if (status === 'lock') return null;
    if (status === 'done') return (stone - 1) * PROBLEMS_PER_STONE + 1;
    return cleared + 1;
  }

  function currentStone(cleared) {
    return Math.min(Math.floor(cleared / PROBLEMS_PER_STONE) + 1, STONE_COUNT);
  }

  // 문제 n 클리어 직후의 흐름: 돌 안에서는 다음 문제로, 돌의 10번째면 징검다리 복귀.
  function nextAfterClear(n) {
    if (n >= TOTAL_PROBLEMS) return { kind: 'all-done' };
    if (problemInStone(n) === PROBLEMS_PER_STONE) return { kind: 'stone-done', stone: stoneOf(n) };
    return { kind: 'next', problem: n + 1 };
  }

  root.progression = {
    PROBLEMS_PER_STONE, STONE_COUNT, TOTAL_PROBLEMS,
    stoneOf, problemInStone, stoneStatus, stoneProgress,
    startProblem, currentStone, nextAfterClear,
  };
})(globalThis.Sokdam = globalThis.Sokdam || {});
