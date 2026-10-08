# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code를 위한 가이드입니다.

## 프로젝트 개요

**NODE (Network Of Domain Experts)** — AI 도메인 전문가 52명(확장 가능)의 소셜 네트워크를, 운영자 **유광명**을 중심 허브로 한 **인터랙티브 3D 지식그래프(3d-force-graph/Three.js)**로 시각화하는 **제로빌드 정적 웹 대시보드**.

- 운영자가 구글시트만 수정하면 런타임 CSV fetch로 대시보드에 즉시 반영된다.
- 빌드 도구·백엔드·DB 없이 `index.html`을 리포 루트에서 GitHub Pages로 서빙한다.
- 상세 요구사항은 [docs/PRD.md](docs/PRD.md), 단계별 작업 계획은 [docs/plan.md](docs/plan.md) 참조.

## 핵심 제약 (반드시 준수)

- **제로빌드**: 빌드 스텝 없음. 프레임워크 없음. HTML5 + CSS + 바닐라 JS(ES Modules) + CDN 라이브러리만 사용한다. Next.js/npm 보일러플레이트는 제거됨 — 재도입 금지.
- **백엔드/DB 없음**: 모든 처리는 클라이언트에서. API 키·시크릿 없음. 모든 리소스 HTTPS.
- **단일 진실 원천(SSOT)**: 데이터는 공개 구글시트. 폴백은 `data/snapshot.csv`(동일 스키마, 수동 갱신).
- **디자인 토큰만 사용**: 색/타이포/스페이싱은 [DESIGN.md](DESIGN.md) 토큰(+ 하단 "Command HUD 확장" 절)을 `css/tokens.css`의 CSS 변수로 매핑해 참조. JS의 그래프 색도 CSS 변수를 read. **인라인 hex 신규 도입 금지, 라이트 모드 없음, 드롭섀도 금지(프레임 선+글로우만), 액센트 그린(`--color-primary`)은 본문 금지**(로고/Live 배지/허브 노드/활성 토글/코너 브래킷 전용). 저채도 녹회색 HUD 잉크(`--hud-ink`·`--hud-dim`)는 본문 허용.
  - **화면(Command HUD)**: 그래프가 뷰포트 전체를 채우고 헤더(검색)·KPI 스트립·좌측 요약/상세·우측 설정·하단 상태줄을 오버레이. 패널은 `--radius-hud`(2px) + 블러 + 코너 브래킷, 전체 미세 스캔라인.
  - **중앙 3D 그래프 색**: 배경 = `--hud-canvas`(+`--hud-canvas-glow`), 레이더 = `--hud-grid`/`--hud-grid-soft`. 노드: 허브 = `--color-primary` 구체(+로고 오빗), 일반 = `--hud-blip` **Blip**(링+점 평면 마커, **발광 금지** — "지나치게 반짝인다" 피드백), 선택 노드 = `--hud-ink`. 엣지: 허브 = `--hud-dim` 옅은 점선(가이드), 소속 = `--color-primary`, 관심사 = `--color-primary-soft`, 협업 = `--graph-collaboration`(골드). 가산 혼합 없음, 블룸은 허브 후광에만. (비녹색 다색 팔레트는 "촌스럽다" 피드백 이력 — 도입 금지.)
  - **폰트**: UI 크롬은 **JetBrains Mono**(`--font-hud`), 한글은 **Noto Sans KR**로 폴스루, 한글 위주 본문은 `--font-sans`. 우측 설정 패널 항목은 영어 표기.

## 파일 구조 (리포 루트 배포)

```
index.html          # 헤더 / 3분할 본문(좌측 상세·중앙 #graph·우측 설정) / 푸터, CDN <script>
css/
  tokens.css        # DESIGN.md 토큰 → CSS 변수 매핑
  styles.css        # 레이아웃·패널·반응형
js/
  main.js           # 부트스트랩: 로딩 HUD → load → normalize → buildGraph → 클러스터/통계 → render → panels → 인트로
  data.js           # fetchSheet(), 스냅샷 폴백, PapaParse 파싱
  normalize.js      # SYNONYM_MAP, normalize(), 결측치 처리
  graph.js          # buildGraph(): 노드/엣지 모델 + 추론 알고리즘, findClusters()
  layout.js         # (순수) 원반 레이아웃 — yearsKnown(), orbitRadius(), RING_YEARS
  stats.js          # (순수) KPI·요약 통계 computeStats()
  labels.js         # (순수) 라벨 문구 labelLines() + 충돌 배치 placeLabels()/createDeclutter()
  search.js         # (순수) matchMembers() + 헤더 검색 바인딩 initSearch()
  render.js         # 3d-force-graph 구성·force·엣지·선택·fly-to·controller
  scene.js          # 배경·레이더 그리드·연차 링·스윕·블룸·색공간
  nodes.js          # Blip/허브 3D 객체·CSS2D 라벨·선택 레티클
  camera.js         # 홈 시점·fly-to·인트로 확산
  panels.js         # KPI·좌측 요약/상세(연결 탐색)·우측 설정·상태줄
tests/              # node --test 단위 테스트(순수 모듈 대상, package.json 없음)
data/
  snapshot.csv      # fetch 실패 시 폴백(수동 갱신)
assets/
  logo/             # 브랜드 SVG 자산(오빗 단일노드 컨셉)
    node-mark.svg       # 아이콘 단독
    node-horizontal.svg # 가로 락업(아이콘+워드마크+태그라인)
    node-stack.svg      # 세로 스택 락업
    favicon.svg         # 파비콘(16/32px 단순화)
  og/               # 링크 공유 미리보기(Open Graph)
    og-image.png        # 공유 카드 썸네일(1200×630, 서빙용)
    og-image.html       # og-image.png 렌더 소스(chromium 캡처로 재생성, HUD 디자인)
DESIGN.md           # 디자인 시스템(토큰) + Command HUD 확장 절
docs/superpowers/   # 리디자인 설계 스펙·구현 계획
```

> 구현 상태: Phase 0~8 완료. 중앙 시각화는 **인터랙티브 3D(3d-force-graph) Command HUD**. (변천: 초기 3D 구형 → 2D D3 방사형 → 인터랙티브 3D 방사형 → 색 DESIGN.md 원복+CSS2D 고정크기 라벨 → Phase 8 레이더 원반 + Blip 노드 + HUD 크롬.)

## 데이터 파이프라인

```
fetch(SHEET_CSV_URL) ──실패──▶ fetch(data/snapshot.csv)
        │ 성공                         │
        ▼                              ▼
  PapaParse 파싱(rawRows) ◀────────────┘
        ▼
  normalize()  → NormalizedMember[]   # 동의어 통합 + 결측치 규칙
        ▼
  buildGraph() → { nodes, links }     # 노드 크기·허브 고정·엣지 추론
        ▼
  findClusters() / computeStats()     # 클러스터(소속+협업 연결요소) · KPI 통계
        ▼
  3d-force-graph 3D 렌더 ⇄ 우측 설정 / 좌측 요약·상세 / 헤더 검색 (controller)
```

- 시트 URL: gviz CSV 엔드포인트(PRD §8.5). 파서는 **PapaParse**(`header: true, skipEmptyLines: true`) — gviz CSV의 따옴표/콤마/줄바꿈 처리 때문에 직접 split 금지.
- 출처 배지: 성공 시 `"Live"`, 폴백 시 `"Snapshot"`, 둘 다 실패 시 에러 UI(재시도 버튼).

### CSV 스키마 (11컬럼)

`번호, 이름, 닉네임, 협업 시점, 나이(경력), 현직장, 과거 경력, 하는일, 관심사, 희망사항, 협업`

- `번호` 1 = 유광명(중심 노드). `협업 시점` = 유광명과 알게 된 **연도**(생년 아님). `나이(경력)` = 나이값. `과거 경력` = 콤마로 여러 소속 나열(관계 추론용). `협업` = 과거 협력한 멤버 이름(콤마, 협업 엣지용).
- **경력 파생**: `normalize.js`가 `career = max(0, 나이 - CAREER_BASE(25))`를 계산. UI(노드 크기·라벨·상세)는 **나이 대신 경력(년차)** 만 표기.

### 그래프 모델 규칙

- **노드 크기**: `val = clamp(√career · k)`(제곱근 스케일). 경력에 비례.
- **중심 허브**: 유광명 노드 `isHub=true`, `fx=fy=fz=0`으로 3D 정중앙 고정.
- **엣지 추론**(`js/graph.js`, PRD §7.4):
  - (A) `hub`: 유광명↔전원, `weight = 2026 - 협업시점`.
  - (B) `affiliation`: 소속 공유(현직장 ∪ 과거경력, 교차 일치 포함) — **항상 생성**(노드-노드 간). 자영업 등 비조직 값(`NON_ORG_KEYS`)은 매칭 제외.
  - (C) `interest`: 표준 태그 `INTEREST_THRESHOLD = 2` 이상 중첩 시만(헤어볼 방지).
  - (D) `collaboration`: `협업` 컬럼 이름 → 노드 id 매칭(무방향, 미매칭/자기참조 제외).
  - `dedupe(links)`로 동일 쌍은 type별 1개로 정리.
- **클러스터**(`findClusters`): 소속+협업 엣지 연결요소(허브 제외, 2명 이상), 이름 = 구성원 최빈 조직.
- **3D 인터랙티브 렌더**(`js/render.js` + `scene.js`/`nodes.js`/`camera.js`):
  - **레이더 원반 레이아웃**: `forceRadial` 반경 = `orbitRadius(yearsKnown(협업시점))`(로그 스케일) — **오래 알수록 중심에 가깝게**. `forceY`로 평면화, 소속/협업 링크는 짧게(군집). warmup 후 인트로에서 허브로부터 확산 → **정적 고정**(노드 드래그 없음).
  - 원반 아래 레이더 그리드 + 연차 링(2024/2020/2010/2000 → `02Y`·`06Y`·`16Y`·`26Y`) + 느린 스윕(18s).
  - 드래그 회전 + 관성(trackball damping). **자동 회전 없음**. 애니메이션은 스윕·허브 위성·인트로뿐, `prefers-reduced-motion`이면 생략.
  - **CSS2D 고정크기 라벨**(이름 + 선택 필드 보조 줄) + **충돌 정리**(우선순위: 허브 > 선택 > 호버 > 이웃 > 크기). 기본 표시 Name + Org.
  - 색관리: `renderer.outputColorSpace = SRGB`(OutputPass가 1회 인코딩). Linear로 바꾸면 전체 색이 어두워진다.
- **엣지 시각**: 허브 = 옅은 점선 가이드. 노드-노드(소속/협업/관심사) = 튜브. flow 파티클은 **선택 노드의 소속·협업 incident 엣지에만**. 선택 시 incident만 강조·나머지 dim + 선택 레티클 + fly-to. 우측 `Relations` 토글(범례 겸용)로 type별 표시(관심사 기본 off).
- **확장성**: `SYNONYM_MAP`·`NON_ORG_KEYS`·관계 추론 임계값·기준 연도(2026)는 상수/객체로 분리해 갱신 가능하게 유지.
- **관계 검증 군집**(소속 엣지로 나타나야 함): 지아이비타 · 마키나락스 · PwC · 포스코이엔씨 · 한국전력공사.

## 작업 흐름

- 작업은 [docs/plan.md](docs/plan.md)의 Phase 0~8 순서를 따른다. 각 Phase 완료 시 plan.md 체크박스(`- [ ]` → `- [x]`)를 갱신한다.
- Phase 의존성: 0 → {1, 2} → 3 → 4 → (1+4) → 5 → 6 → 7.

## 검증 / 실행

- **로컬 실행**: 정적 서버로 루트를 서빙(예: `python3 -m http.server`) 후 브라우저로 `index.html` 확인. `file://` 직접 열기는 ES Module/fetch에서 CORS 문제가 날 수 있음.
- **단위 테스트**: 리포 루트에서 `node --test`(인자 없이 — `tests/*.test.js` 자동 탐색, Node 22+). 순수 모듈(layout/graph/stats/labels/search)만 대상.
- **수동 검증**: 콘솔 에러 없이 CDN 로드, 53노드 3D 렌더, 허브 중심 고정, 출처 배지, 라벨/관계 토글 반영.
- **E2E**: Playwright로 로드(인트로) → 노드 클릭/검색(⌘K) → 상세·fly-to → Connections 클릭 이동 → 라벨/관계 토글 → Reset view 플로우 확인. (헤드리스 WebGL은 `--use-angle=swiftshader` 플래그 필요. Playwright는 리포 밖에 설치 — package.json 재도입 금지.)
- **성능 목표**: 인터랙션 60fps, 초기 렌더(폴백 포함) 3초 이내.

## 배포

- GitHub Pages를 **main 브랜치 루트**로 수동 설정(빌드 없음, GitHub Actions 미사용).
- `data/snapshot.csv`는 주기적으로 시트에서 내보내 수동 커밋.

## 컨벤션

- 커밋 메시지는 이모지 + 한글 설명 스타일(예: `:recycle: Phase 0 — ...`).
- 응답·주석·문서는 한국어.
