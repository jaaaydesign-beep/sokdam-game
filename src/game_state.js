(function (root) {
  'use strict';
  const GEO = root.GEO;
  const spawn = root.spawn;

  // 모든 전이 함수는 { state, events } 를 반환한다. state 는 새 객체(불변 갱신),
  // events 는 연출(소리·애니메이션) 전용 — 게임 룰 판단은 전부 이 파일 안에서 끝난다.

  function createGame(proverb, stage) {
    return {
      stage: stage,
      proverb: proverb,
      planeLane: 2,
      hearts: 3,
      filled: Array.from(proverb.answer, function () { return false; }),
      items: [],
      nextItemId: 0,
      spawnCooldown: 0.8,
      spawnsSinceNeeded: 0,
      status: 'playing',
    };
  }

  function moveLane(state, dir) {
    if (state.status !== 'playing') return { state: state, events: [] };
    const lane = Math.max(0, Math.min(GEO.LANES - 1, state.planeLane + dir));
    if (lane === state.planeLane) return { state: state, events: [] };
    return {
      state: Object.assign({}, state, { planeLane: lane }),
      events: [{ type: 'move', lane: lane }],
    };
  }

  // 게임 룰 전체가 여기서 완결된다 (낙하 → 판정 → 채움/하트 → 스폰).
  function tick(state, dt, rng) {
    if (state.status !== 'playing') return { state: state, events: [] };
    const d = spawn.difficultyFor(state.stage);
    const events = [];
    let hearts = state.hearts;
    let filled = state.filled;
    let status = state.status;
    let nextItemId = state.nextItemId;
    let spawnCooldown = state.spawnCooldown;
    let spawnsSinceNeeded = state.spawnsSinceNeeded;

    // 1) 낙하 + 판정선 통과 판정 (스펙 §3: 판정선 도달 시점의 레인 일치 여부)
    const kept = [];
    for (const it of state.items) {
      const y = it.y + d.fallSpeed * dt;
      const crossed = it.y < GEO.JUDGE_Y && y >= GEO.JUDGE_Y;
      if (!crossed || it.lane !== state.planeLane) {
        if (y < GEO.STAGE_H + GEO.ITEM_SIZE) kept.push(Object.assign({}, it, { y: y }));
        continue;
      }
      if (it.kind === 'bomb') {
        hearts -= 1;
        events.push({ type: 'bomb', itemId: it.id });
        if (hearts <= 0) status = 'failed';
        continue;
      }
      // 글자: 원래 위치의 "아직 빈" 첫 칸에 채움 (순서 무관 + 원위치 표시, 스펙 §2)
      const answerChars = Array.from(state.proverb.answer);
      let cellIndex = -1;
      for (let i = 0; i < answerChars.length; i++) {
        if (answerChars[i] === it.char && !filled[i]) { cellIndex = i; break; }
      }
      if (cellIndex === -1) {
        events.push({ type: 'wrong', itemId: it.id, char: it.char });
      } else {
        filled = filled.map(function (f, i) { return i === cellIndex ? true : f; });
        events.push({ type: 'catch', itemId: it.id, char: it.char, cellIndex: cellIndex });
        if (filled.every(Boolean)) {
          status = 'cleared';
          events.push({ type: 'clear' });
        }
      }
    }
    if (status === 'failed') events.push({ type: 'fail' });

    // 2) 스폰 — tick 이 소유 (스펙 §3 재등장 보장은 neededChars 재계산으로 성립)
    let items = kept;
    spawnCooldown -= dt;
    if (status === 'playing' && spawnCooldown <= 0) {
      const needed = Array.from(state.proverb.answer)
        .filter(function (_, i) { return !filled[i]; });
      const plan = spawn.planSpawn({
        stage: state.stage, neededChars: needed, activeItems: items,
        planeLane: state.planeLane, rng: rng, spawnsSinceNeeded: spawnsSinceNeeded,
      });
      if (plan) {
        items = items.concat([{
          id: nextItemId, kind: plan.kind, char: plan.char, lane: plan.lane, y: GEO.SPAWN_Y,
        }]);
        events.push({ type: 'spawn', itemId: nextItemId });
        nextItemId += 1;
        const isNeeded = plan.kind === 'letter' && !plan.isDecoy;
        spawnsSinceNeeded = isNeeded ? 0 : spawnsSinceNeeded + 1;
      }
      spawnCooldown = d.spawnInterval;
    }

    return {
      state: Object.assign({}, state, {
        items: items, hearts: hearts, filled: filled, status: status,
        nextItemId: nextItemId, spawnCooldown: spawnCooldown,
        spawnsSinceNeeded: spawnsSinceNeeded,
      }),
      events: events,
    };
  }

  // 하트 소진 후 재도전: 채운 칸 유지 + 하트 회복 + 낙하물·스폰 초기화 (스펙 §2)
  function retryStage(state) {
    return {
      state: Object.assign({}, state, {
        hearts: 3, items: [], spawnCooldown: 0.8, spawnsSinceNeeded: 0, status: 'playing',
      }),
      events: [{ type: 'retry' }],
    };
  }

  root.gameState = { createGame, moveLane, tick, retryStage };
})(globalThis.Sokdam = globalThis.Sokdam || {});
