#!/usr/bin/env python3
"""src/ 를 단일 index.html 로 인라인 병합한다. --check: 드리프트 검사."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

# 연결 순서 보장을 위한 명시 목록 (glob 금지 — AppleDouble `._*` 유입 방지 포함)
JS_FILES = [
    "src/proverbs.js",
    "src/geometry.js",
    "src/spawn.js",
    "src/game_state.js",
    "src/progression.js",
    "src/audio.js",
    "src/storage.js",
    "src/render.js",
    "src/main.js",
]
CSS_FILE = "src/style.css"
BODY_FILE = "src/body.html"

FAVICON = (
    '<link rel="icon" href="data:image/svg+xml,'
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>"
    "<text y='.9em' font-size='90'>✈️</text></svg>\" >\n"
)

FONT_LINKS = (
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
    '<link href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Jua'
    '&display=swap" rel="stylesheet">\n'
)

BANNER = (
    "<!-- 이 파일은 scripts/build.py 가 생성한 산출물이다. 직접 편집 금지 — "
    "src/ 를 고치고 python3 scripts/build.py 로 재생성할 것. "
    "bunny PNG 2개는 assets/ 외부 파일로 둔다 (base64 인라인 제외 — 사용자 확정) -->\n"
)


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def build() -> str:
    js = "\n".join(read(f) for f in JS_FILES)
    return (
        '<!doctype html>\n<html lang="ko">\n<head>\n'
        + BANNER
        + '<meta charset="utf-8">\n'
        + '<meta name="viewport" content="width=device-width, initial-scale=1, '
        'maximum-scale=1, user-scalable=no">\n'
        + "<title>속담 비행기</title>\n"
        + FAVICON
        + FONT_LINKS
        + "<style>\n" + read(CSS_FILE) + "\n</style>\n</head>\n<body>\n"
        + read(BODY_FILE)
        + "\n<script>\n" + js + "\n</script>\n</body>\n</html>\n"
    )


def main() -> int:
    out = ROOT / "index.html"
    html = build()
    if "--check" in sys.argv:
        if not out.exists() or out.read_text(encoding="utf-8") != html:
            print("DRIFT: index.html 이 src/ 빌드 결과와 다르다. python3 scripts/build.py 재실행 필요")
            return 1
        print("OK: index.html 은 최신 빌드와 일치")
        return 0
    out.write_text(html, encoding="utf-8")
    print(f"built: {out} ({len(html):,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
