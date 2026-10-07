# NODE Command HUD 리디자인 — 설계 스펙

- 날짜: 2026-10-07
- 상태: 승인됨(시안 C "Command HUD" + 노드 C-1 "Blip")
- 범위: 페이지 크롬 전면 개편 + 중앙 3D 그래프 표현/레이아웃/인터랙션 개편 + 추가 기능 4종(검색·연결 목록 탐색·인트로·OG 갱신)

## 1. 배경과 목표

현재 화면은 3분할 고정 레이아웃 안에 회색 구체 노드가 허브로 몰리는 별 모양(starburst)으로 렌더되고, 라벨이 심하게 겹쳐 가독성이 낮다. 목표는 **세련되고 화려하되 반짝이지 않는** 관제(HUD) 감성의 대시보드로 개편하는 것이다.

시안 비교 결과(A Orbit / B Aurora / C Command HUD) 사용자가 **C**를 선택했고, 노드 발광이 과하다는 피드백으로 노드 표현은 **C-1 Blip**(링+점 평면 마커, 발광 없음)으로 확정했다.

### 비목표

- 데이터 파이프라인(`data.js`·`normalize.js`) 동작 변경 없음.
- Fly-through(자동 투어) 기능 없음.
- 라이트 모드 없음.

## 2. 화면 구성(크롬)

| 영역 | 내용 |
| --- | --- |
| 그래프 | 뷰포트 전체(풀블리드). 모든 크롬은 그 위에 오버레이 |
| 헤더 | 로고 · 중앙 검색 입력(⌘K/Ctrl+K, `/` 포커스) · 출처 배지(Live/Snapshot/Error) · 노드 수 · GitHub 링크 |
| KPI 스트립 | 헤더 아래 중앙. `MEMBERS`·`CLUSTERS`·`AFFIL LINKS`·`COLLAB LINKS`·`AVG CAREER`·`LONGEST BOND` |
| 좌측 패널 | 미선택 = 네트워크 요약(멤버 수, 4개 스탯, Top organizations 막대 5개, Since 연대 히스토그램, Longest bond). 선택 = 상세(아바타 이니셜, 이름·닉네임·클러스터, Career/Since, Now/Past, Focus 칩, Connections 목록) |
| 우측 패널 | `Labels` 세그먼트 5종(Name·Org·Career·Nick·Interests) · `Relations` 토글 4종(스와치+개수 = 범례 겸용) · `Reset view` |
| 하단 상태줄 | `SRC <Google Sheet/Snapshot> · OWNER Kwang Myung Yu · SYNC <실제 로드 시각 HH:MM>` + 조작 힌트 |
| 오버레이 | 전체 화면 미세 스캔라인(pointer-events 없음) |

- 패널 스타일: 각진 HUD 프레임(2px 라운드, 프라이머리 그린 코너 브래킷, 반투명 배경 + `backdrop-filter: blur`), 드롭섀도 없음.
- 타이포: UI 크롬(eyebrow·숫자·버튼·토글·라벨 보조줄)은 **JetBrains Mono**, 한글은 **Noto Sans KR**로 폴스루. 한글 eyebrow에는 넓은 자간을 적용하지 않는다(영문 eyebrow로 통일).
- 기존 `Collaboration` 토글이 Labels 그룹에 있던 IA 오류를 해소 — Relations로 이동.

### 반응형

- ≥1024px: 위 구성 그대로.
- 640–1023px: 좌측 상세 = 슬라이드 드로어(선택 시 열림), 우측 설정 = 상단 접이식 바, KPI 스트립은 4항목으로 축약(MEMBERS·CLUSTERS·COLLAB LINKS·LONGEST BOND).
- <640px: KPI 스트립 가로 스크롤 1행, 우측 설정 = 하단 시트(핸들 peek, 기존 패턴 유지), 좌측 상세 = 전체 폭 드로어, 검색 입력은 아이콘 버튼 → 탭 시 확장.

## 3. 그래프

### 3.1 레이아웃(기울어진 원반 + 레이더)

- `forceRadial`: 허브로부터 반경 = `R(w) = R_MIN + (R_MAX - R_MIN) · (1 - ln(w)/ln(30))`, `w = max(1, BASE_YEAR - sinceYear)` (로그 스케일 — 최근 연도가 바깥 띠에 몰리지 않게 분산). 허브는 `fx=fy=fz=0` 고정 유지.
- `forceY(0)`: 원반 두께를 얇게(평면화).
- 허브 엣지는 link force에서 strength 0(배치에 관여 안 함). 소속·협업 엣지는 짧은 거리로 군집 유지.
- 초기 레이아웃은 `warmupTicks`로 미리 계산 → 인트로 애니메이션의 목적지.
- 카메라 홈: 원반을 비스듬히 내려다보는 각도(고도 약 37°)에서 전체 맞춤.
- 원반 아래 `PolarGridHelper`(12섹터) + 연차 눈금 라벨 `02Y`·`06Y`·`16Y`·`26Y`(링 반경 = 2024·2020·2010·2000년 시작).
- 레이더 스윕: 얇은 부채꼴(가산 0.07 불투명도), 18초/1회전. reduced-motion 시 정지.

### 3.2 노드

- 일반 노드 = **Blip**: 화면을 향한 Sprite(링 + 중심 점 + 옅은 내부 채움 캔버스 텍스처), 색 `--hud-blip`(차분한 민트), 크기 = 기존 `val`(√경력) 기반. 발광 없음.
- 허브 = 그린 구체(Lambert, 무발광) + 로고 오빗 모티프(궤도 링 + 위성 점, 느린 공전 — reduced-motion 시 정지) + 아주 약한 후광.
- 블룸: 허브 후광만 살짝 걸리도록 강한 threshold(사실상 꺼짐에 가깝게).

### 3.3 엣지

| type | 표현 | 기본 |
| --- | --- | --- |
| affiliation | `--color-primary` 튜브, Normal 블렌딩 0.42 | on |
| collaboration | `--graph-collaboration` 골드 튜브(가장 굵게) 0.7 | on |
| interest | `--color-primary-soft` 얇은 튜브 0.35 | off |
| hub | 옅은 점선(가이드) | on |

- flow 파티클은 **선택된 노드의 incident 엣지(소속·협업)에만** 표시.
- 선택 시 incident 엣지 강조, 나머지 0.04로 dim.

### 3.4 라벨

- CSS2D 고정 크기 라벨: 주 줄 = 이름(Noto Sans KR), 보조 줄 = 선택된 Labels 필드(Org·Career·Nick·Interests)를 ` · `로 연결(모노).
- 기본 표시: Name + Org.
- **겹침 정리(declutter)**: 6프레임마다 화면 투영 좌표로 바운딩 박스 충돌 검사, 우선순위(허브 > 선택 > 호버 > 이웃 > val > 카메라 근접) 순으로 배치하고 충돌 라벨은 숨김(opacity 0, 트랜지션).
- 호버 노드 라벨은 항상 표시.
- 3d-force-graph 기본 nav info(`Left-click: rotate…`) 숨김.

### 3.5 색관리

- 현재 `renderer.outputColorSpace = Linear` 때문에 `OutputPass`가 sRGB 인코딩을 생략 → 모든 색이 토큰보다 어둡게 렌더되는 버그. **`SRGBColorSpace`로 수정**해 OutputPass가 1회 인코딩하도록 한다.

## 4. 인터랙션

- **노드 클릭**: 선택 + 카메라 fly-to(900ms, 노드를 화면 중앙으로, 적정 거리) + 선택 레티클(CSS2D 코너 브래킷) + dim + 좌측 상세. 재클릭 = 해제.
- **배경 클릭**: 선택 해제(카메라 유지).
- **호버**: 커서 pointer, 라벨 강제 표시.
- **검색**: 헤더 입력. 이름·닉네임·현직장·과거경력 부분일치(대소문자 무시), 결과 최대 8개 드롭다운(이름 + 조직). ↑↓ 이동, Enter/클릭 선택 → fly-to + 선택. Esc 닫기. ⌘K/Ctrl+K·`/`로 포커스.
- **연결 목록 탐색**: 상세 패널 Connections 행(button) 클릭 → 해당 노드 선택 + fly-to.
- **Reset view**: 카메라 홈으로 tween(선택 유지).
- **인트로(최초 1회)**: 로딩 중 HUD 오버레이(`// LINKING SHEET…` + 진행 표시) → 렌더 준비되면 노드가 허브 위치에서 최종 위치로 1.6s ease-out 확산 + 카메라 dolly-in. 재시도(bootstrap 재호출) 시에도 동일. `prefers-reduced-motion: reduce`면 생략하고 바로 최종 상태.

## 5. 코드 구조

공개 controller API는 유지(`setLabelFields`·`setLinkTypeVisibility`·`highlightNode`·`resetView`·`onSelect`)하고 `focusNode(id)`를 추가한다.

| 파일 | 책임 |
| --- | --- |
| `js/render.js` | ForceGraph3D 생성·force 설정·엣지 스타일·선택 상태·controller 조립 |
| `js/scene.js` | 배경 텍스처, 레이더 그리드, 스윕, 연차 눈금, 라이트, 블룸/OutputPass |
| `js/nodes.js` | Blip/허브 3D 객체 팩토리, 라벨 DOM 생성/갱신 |
| `js/labels.js` | 라벨 declutter(충돌 기반 숨김) |
| `js/camera.js` | 홈 시점, fly-to, 인트로 확산 애니메이션 |
| `js/search.js` | 검색 입력·드롭다운·키보드 |
| `js/graph.js` | `findClusters(graph)` 추가(소속+협업 연결요소, 허브 제외, 대표 조직명) |
| `js/panels.js` | 요약/상세/설정 패널 + KPI + 상태줄 |
| `js/main.js` | 로딩 HUD·인트로 연결, 출처/시각 전달 |
| `css/tokens.css` | HUD 토큰 추가 |
| `css/styles.css` | 전면 재작성 |
| `index.html` | 새 마크업 |

### 추가 토큰(`css/tokens.css`)

`--hud-canvas`, `--hud-canvas-glow`, `--hud-grid`, `--hud-grid-soft`, `--hud-ink`(민트 화이트 수치), `--hud-dim`(녹회색 라벨), `--hud-faint`(힌트), `--hud-frame`(패널 보더), `--hud-panel`(패널 배경), `--hud-blip`, `--radius-hud: 2px`, `--font-hud`(JetBrains Mono → Noto Sans KR 폴스루). 그래프 레이어 색은 render 계열 모듈이 CSS 변수에서 read(하드코딩 hex 금지 원칙 유지).

### 규칙 변경(CLAUDE.md·DESIGN.md 반영)

- "본문에 그린 금지" → **액센트 그린(`--color-primary`)은 본문 금지, 저채도 녹회색 HUD 잉크(`--hud-ink`·`--hud-dim`)는 허용.**
- 일반 노드 색: `--color-body` 그레이 구체 → `--hud-blip` Blip.
- 허브 엣지: 흰색 점선 → 옅은 점선 가이드(색 `--hud-dim`).
- 엣지 flow: 소속 상시 → 선택 노드 incident만.
- 라운딩: HUD 패널·버튼은 `--radius-hud`(2px).

## 6. 오류 처리

- 데이터 로드 실패: 기존 에러 UI(재시도) 유지, HUD 스타일로 재디자인. 로딩 HUD는 에러 시 숨김.
- 검색 결과 없음: 드롭다운에 `No match` 행.
- WebGL 미지원: 3d-force-graph 예외를 잡아 에러 UI에 안내 문구 표시.

## 7. 검증

- 헤드리스 Chromium(`--use-angle=swiftshader`)으로 1440×900 / 820×1180 / 390×844 스크린샷, 콘솔 에러 0.
- 플로우: 로드(인트로) → 노드 클릭(상세·fly-to) → 연결 목록 클릭 → 검색 선택 → Labels/Relations 토글 → Reset view.
- 관계 검증 군집(지아이비타·마키나락스·PwC·포스코이엔씨·한국전력공사)이 소속 엣지로 유지되는지 확인.
- 성능: 52노드 기준 인터랙션 체감 끊김 없음, 초기 렌더 3초 이내(인트로 제외).

## 8. 후속 산출물

- `assets/og/og-image.html` → HUD 디자인으로 재작성 후 `og-image.png`(1200×630) 재생성.
- `docs/plan.md`에 Phase 8(HUD 리디자인) 추가·체크.
