(function (root) {
  'use strict';
  // 게임 룰 좌표계는 모바일 시안 390×844 1벌로 고정한다 (goodtree 와 동일 수치).
  // 스폰 공정성 검산·속도 상한 테스트가 전부 이 좌표계 위에서 성립한다.
  root.GEO = {
    STAGE_W: 390, STAGE_H: 844,
    LANES: 5, LANE_W: 78,                  // 레인 중심 x = lane*78 + 39
    FALL_TOP: 172, FALL_HEIGHT: 440,       // 낙하 영역 (시안 .lanes top:172, height:440)
    JUDGE_Y: 596,                          // 판정선 y (비행기 상단, 시안 plane top:596)
    SPAWN_Y: 148,                          // 낙하물 출발 y (영역 위 바깥)
    PLANE_SIZE: 84, ITEM_SIZE: 78,
  };
  root.GEO.laneCenterX = function (lane) { return lane * root.GEO.LANE_W + root.GEO.LANE_W / 2; };

  // 뷰별 렌더 좌표 (시안 실측). y 는 .lanes 로컬 좌표 — 룰 y 를 스폰~판정선 구간의
  // 선형(affine) 매핑으로 변환한다 (viewY). 룰·테스트는 뷰 좌표를 모른다.
  root.VIEWS = {
    m: { // 모바일 390 아트보드
      laneW: 78, itemW: 66, bombW: 64, bombH: 80,
      planeW: 84, planeH: 93, planeTop: 596,
      spawnLocal: -24, judgeLocal: 424,    // = SPAWN_Y/JUDGE_Y - FALL_TOP
    },
    w: { // 웹 1440 아트보드의 600px 보드 (시안 .board .lanes height:720, plane top:730)
      laneW: 120, itemW: 86, bombW: 84, bombH: 105,
      planeW: 116, planeH: 128, planeTop: 730,
      spawnLocal: -41, judgeLocal: 730,    // 모바일 비율(-24:424)을 보드 축척으로 환산
    },
  };

  root.viewLaneCenterX = function (view, lane) { return lane * view.laneW + view.laneW / 2; };
  root.viewY = function (view, y) {
    const t = (y - root.GEO.SPAWN_Y) / (root.GEO.JUDGE_Y - root.GEO.SPAWN_Y);
    return view.spawnLocal + t * (view.judgeLocal - view.spawnLocal);
  };
})(globalThis.Sokdam = globalThis.Sokdam || {});
