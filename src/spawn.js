(function (root) {
  'use strict';
  const GEO = root.GEO;

  const MOVE_TIME = 0.35;     // 한 칸 이동에 허용하는 체감 시간(초)
  const SPEED_MARGIN = 1.3;   // 탈출 여유 계수

  // 10단계 구간 난이도. fallSpeed: px/초, bombChance: 스폰당 폭탄 확률,
  // spawnInterval: 스폰 간격(초). 상한 도달 후 유지 (스펙 §4)
  const BANDS = [
    { fallSpeed: 90, bombChance: 0.10, spawnInterval: 1.6 },   // 1~10
    { fallSpeed: 105, bombChance: 0.12, spawnInterval: 1.5 },  // 11~20
    { fallSpeed: 120, bombChance: 0.14, spawnInterval: 1.4 },  // 21~30
    { fallSpeed: 135, bombChance: 0.16, spawnInterval: 1.3 },  // 31~40
    { fallSpeed: 150, bombChance: 0.18, spawnInterval: 1.2 },  // 41~50
    { fallSpeed: 165, bombChance: 0.20, spawnInterval: 1.1 },  // 51~60
    { fallSpeed: 180, bombChance: 0.22, spawnInterval: 1.0 },  // 61~70
    { fallSpeed: 195, bombChance: 0.24, spawnInterval: 0.95 }, // 71~80
    { fallSpeed: 210, bombChance: 0.25, spawnInterval: 0.9 },  // 81~90
    { fallSpeed: 210, bombChance: 0.25, spawnInterval: 0.9 },  // 91~100 (상한 유지)
  ];
  // 검산: 최고속 210px/s → 통과 (596-148)/210 ≈ 2.13s ≥ 4×0.35×1.3 = 1.82s

  function difficultyFor(stage) {
    const band = Math.min(Math.floor((stage - 1) / 10), BANDS.length - 1);
    return Object.assign({ confusable: stage >= 31 }, BANDS[band]);
  }

  // 혼동 글자 사전: 필요 글자와 모양이 비슷한 오답 후보 (31단계 이후 사용)
  const CONFUSABLE = {
    '간': ['칸', '긴'], '양': ['얀', '냥'], '산': ['샨', '선'], '물': ['불', '뭍'],
    '말': ['밀', '몰'], '남': ['님', '놈'], '울': ['올', '를'], '람': ['랑', '림'],
  };
  // 일반 오답 글자 풀 (정답과 무관한 친숙 글자)
  const DECOYS = '가나다라마바사자차카타파하고노도로모보소오조호구누두루무부수우주'.split('');

  const STARVATION_LIMIT = 3; // 필요 글자 없이 허용되는 최대 연속 스폰 수

  // 다음 스폰 1건을 결정한다. 순수 함수 — 호출부(tick)가 결과를 state 에 반영.
  // args: { stage, neededChars, activeItems, planeLane, rng, spawnsSinceNeeded }
  // 반환: { kind:'letter'|'bomb', char?, lane, isDecoy? }
  function planSpawn(args) {
    const { stage, neededChars, activeItems, planeLane, rng } = args;
    const spawnsSinceNeeded = args.spawnsSinceNeeded || 0;
    const d = difficultyFor(stage);
    const bombActive = activeItems.some(function (it) { return it.kind === 'bomb'; });
    const starving = neededChars.length > 0 && spawnsSinceNeeded >= STARVATION_LIMIT;

    // 1) 폭탄: 동시 1개 제한 (스펙 §3). 기아 상태면 글자를 우선한다.
    if (!bombActive && !starving && rng() < d.bombChance) {
      // 속도 상한이 4칸 이동 시간을 보장하므로(위 검산) 어느 레인이든 도달 전 회피
      // 가능하지만, 비행기 바로 위 레인은 피해서 체감 급습을 줄인다.
      const lanes = [];
      for (let l = 0; l < GEO.LANES; l++) { if (l !== planeLane) lanes.push(l); }
      return { kind: 'bomb', lane: lanes[Math.floor(rng() * lanes.length)] };
    }

    // 2) 글자: 기아 방지 — 한도 도달 시 필요 글자 강제 (스펙 §3 재등장 보장)
    const lane = Math.floor(rng() * GEO.LANES);
    const wantNeeded = neededChars.length > 0 && (starving || rng() < 0.5);
    if (wantNeeded) {
      const char = neededChars[Math.floor(rng() * neededChars.length)];
      return { kind: 'letter', char: char, lane: lane };
    }

    // 3) 오답 글자 (31+ 는 혼동 글자 우선)
    let pool = DECOYS;
    if (d.confusable && neededChars.length > 0 && rng() < 0.4) {
      const near = [];
      for (const c of neededChars) {
        if (CONFUSABLE[c]) near.push.apply(near, CONFUSABLE[c]);
      }
      if (near.length > 0) pool = near;
    }
    let safePool = pool.filter(function (c) { return neededChars.indexOf(c) === -1; });
    if (safePool.length === 0) { // 혼동 글자가 전부 필요 글자와 겹치는 경우 일반 풀로 폴백
      safePool = DECOYS.filter(function (c) { return neededChars.indexOf(c) === -1; });
    }
    const char = safePool[Math.floor(rng() * safePool.length)];
    return { kind: 'letter', char: char, lane: lane, isDecoy: true };
  }

  root.spawn = { difficultyFor, planSpawn, MOVE_TIME, SPEED_MARGIN, STARVATION_LIMIT };
})(globalThis.Sokdam = globalThis.Sokdam || {});
