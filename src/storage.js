(function (root) {
  'use strict';
  const KEY = 'sokdam-plane-v2';

  // 진행도 스키마: { clearedProblems: n } — 클리어한 전역 문제 수(0~100).
  // 돌(단계) 완료·이어하기 판정은 progression.js 가 이 값 하나로 유도한다.
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const data = raw ? JSON.parse(raw) : null;
      const n = data && Number.isInteger(data.clearedProblems) ? data.clearedProblems : 0;
      return { clearedProblems: Math.max(0, Math.min(root.STAGE_COUNT, n)) };
    } catch (e) {
      return { clearedProblems: 0 }; // 저장 불가 환경(file:// 등)은 매번 새로 (스펙 §6 수용)
    }
  }

  // 전진만 저장한다 — 완료 돌 재플레이 중 클리어가 진행도를 되돌리지 않도록.
  function saveCleared(problems) {
    try {
      if (problems > load().clearedProblems) {
        localStorage.setItem(KEY, JSON.stringify({ clearedProblems: problems }));
      }
    } catch (e) { /* 저장 불가 환경 무시 */ }
  }

  root.storage = { load: load, saveCleared: saveCleared };
})(globalThis.Sokdam = globalThis.Sokdam || {});
