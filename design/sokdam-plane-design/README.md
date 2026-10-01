# 속담 비행기 — UI 시안 (정적 HTML)

유치원~초등 저학년용 속담 학습 게임의 화면 시안입니다. 게임 로직(JS)은 포함되어 있지 않고,
화면 구조와 상태 표현(CSS 클래스)만 들어 있습니다.

## 폴더 구조

```
sokdam-plane-design/
├─ index.html              # 모든 화면으로 가는 목록 페이지 (브라우저에서 열어 확인)
├─ css/
│  └─ game.css             # 공통 스타일 (모바일 + 웹)
├─ assets/
│  ├─ bunny_happy.png      # 토끼 비행기 (웃는 얼굴, 배경 투명)
│  └─ bunny_sad.png        # 토끼 비행기 (시무룩, 배경 투명) — 다시 하기 화면
├─ mobile/                 # 390px 세로 기준
│  ├─ 01-start.html        # 시작 화면 + 스테이지 징검다리
│  ├─ 02-play.html         # 게임 플레이 (기본)
│  ├─ 02a-play-partial.html   # 빈칸 일부 채워진 상태 (◻양◻)
│  ├─ 02b-play-oneheart.html  # 하트 1개 남은 상태
│  ├─ 02c-play-catch.html     # 글자 획득 연출
│  ├─ 03-clear.html        # 클리어 카드
│  ├─ 04-retry.html        # 다시 하기
│  └─ 05-pause.html        # 일시정지 오버레이
└─ web/                    # 1440×900 PC 레이아웃
   ├─ 01-start.html
   ├─ 02-play.html
   ├─ 03-clear.html
   ├─ 04-retry.html
   └─ 05-pause.html
```

## 사용법

1. 압축을 풀어 프로젝트 저장소 안에 넣습니다. 예: `my-game/design/sokdam-plane-design/`
2. `index.html`을 브라우저에서 열면 모든 화면을 바로 볼 수 있습니다 (서버 없이 파일로 열어도 됩니다).
3. 각 HTML은 `../css/game.css`와 `../assets/` 를 상대 경로로 참조하므로 폴더 구조를 그대로 유지하세요.

## Claude Code에서 쓰기

프로젝트 루트에서 `claude`를 실행한 뒤:

```
design/sokdam-plane-design/ 의 HTML 시안을 보고 구현해줘.
- css/game.css 의 클래스와 상태(.cell.on/.hot, .heart.on/.off, .stone.done/.cur/.lock, .pop/.fly)를 그대로 유지
- 게임 로직은 내가 붙일 거라 화면 컴포넌트/템플릿만 만들어줘
- mobile/ 이 기본이고 1024px 이상에서는 web/ 레이아웃으로 전환
```

## 애니메이션 훅 (독립 요소)

| 요소 | 셀렉터 | 비고 |
|---|---|---|
| 글자 풍선 | `.balloon` + `.b-pink/.b-yellow/.b-mint/.b-lav/.b-orange/.b-blue` | 줄은 내부 `.str`, 웹은 `.balloon.big` |
| 폭탄 | `.bomb` (SVG) | `.fuse` 심지, `.spark` 불꽃 |
| 비행기 | `.plane.side` (옆모습 img) / `.plane.top` (레인용, 래퍼 div 안 img 90° 회전) | |
| 하트 | `.heart.on` / `.heart.off` | |
| 상단 빈칸 | `.cell` / `.cell.on` (채움) / `.cell.hot` (받는 순간) | |
| 획득 연출 | `.pop` (터짐 링), `.fly` (날아가는 글자) | 02c-play-catch.html 참고 |
| 스테이지 돌 | `.stone.done` / `.stone.cur` / `.stone.lock` (`data-stage` 속성) | `.num` 번호, `.lk` 자물쇠 |
| 징검다리 소품 | `.pebble`, `.tuft`, `.sign`, `.prog-pill` | |
| 풀밭 생물 | `.critter.bee/.rabbit/.flower/.mole/.dragonfly/.mushroom` | |

## 레이아웃 수치

- 모바일 레인: 390 ÷ 5 = 78px, 풍선 66px, 비행기 84px
- 웹 보드: 600px = 5레인 × 120px, 풍선 86px, 비행기 116px
- PC 와이드에서 모바일 화면은 `.scr{max-width:390px;margin:0 auto}` 로 가운데 카드형

> **참고**: 이 폴더는 참조 전용 시안 원본입니다. 진본은 저장소 `src/` (body.html·style.css·JS 모듈)이며,
> 루트 `index.html` 은 `python3 scripts/build.py` 가 생성하는 산출물입니다 (직접 편집 금지).
> PNG 교체·추가는 루트 `assets/` 기준으로 합니다.
