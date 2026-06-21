# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code를 위한 가이드입니다.

## 프로젝트 개요

**NODE (Network Of Domain Experts)** — AI 도메인 전문가 36명(확장 가능)의 소셜 네트워크를, 운영자 **유광명**을 중심 허브로 한 **인터랙티브 3D 지식그래프(3d-force-graph/Three.js)**로 시각화하는 **제로빌드 정적 웹 대시보드**.

- 운영자가 구글시트만 수정하면 런타임 CSV fetch로 대시보드에 즉시 반영된다.
- 빌드 도구·백엔드·DB 없이 `index.html`을 리포 루트에서 GitHub Pages로 서빙한다.
- 상세 요구사항은 [docs/PRD.md](docs/PRD.md), 단계별 작업 계획은 [docs/plan.md](docs/plan.md) 참조.

## 핵심 제약 (반드시 준수)

- **제로빌드**: 빌드 스텝 없음. 프레임워크 없음. HTML5 + CSS + 바닐라 JS(ES Modules) + CDN 라이브러리만 사용한다. Next.js/npm 보일러플레이트는 제거됨 — 재도입 금지.
- **백엔드/DB 없음**: 모든 처리는 클라이언트에서. API 키·시크릿 없음. 모든 리소스 HTTPS.
- **단일 진실 원천(SSOT)**: 데이터는 공개 구글시트. 폴백은 `data/snapshot.csv`(동일 스키마, 수동 갱신).
- **디자인 토큰만 사용**: 색/타이포/스페이싱은 [DESIGN.md](DESIGN.md) 토큰을 `css/tokens.css`의 CSS 변수로 매핑해 참조. **인라인 hex/px 신규 도입 금지, 라이트 모드 없음, 드롭섀도 금지(하어라인+글로우만), 본문에 그린(`--color-primary`) 사용 금지**(액센트=로고/Live 배지/허브 노드에만).
  - **중앙 3D 그래프 색**: 그래프 내부도 DESIGN.md 토큰을 준용하되 **엣지 색 의미는 의도적으로 반전**한다 — 노드: 허브 = `--color-primary`(그린), 일반 = `--color-body`(그레이). 엣지: **허브 엣지 = `--color-ink`(밝은 흰색) 가는 점선(LineDashedMaterial, width 0, 잘 아는 관계는 은은한 가이드로 물러남)**, **소속 엣지 = `--color-primary`(진한 녹색 튜브)**, **관심사 엣지 = `--color-primary-soft`(연한 녹색 튜브)** — 잘 모르는 노드-노드 관계를 녹색으로 강조하기 위함. 배경 = `--color-canvas`. (2차의 비녹색 `--graph-*` 팔레트는 "촌스럽다" 피드백으로 원복됨.)
  - **폰트**: 한글은 **Noto Sans KR**, Latin은 Inter(`--font-sans`가 폴스루). 우측 설정 패널 항목은 영어 표기.

## 파일 구조 (리포 루트 배포)

```
index.html          # 헤더 / 3분할 본문(좌측 상세·중앙 #graph·우측 설정) / 푸터, CDN <script>
css/
  tokens.css        # DESIGN.md 토큰 → CSS 변수 매핑
  styles.css        # 레이아웃·패널·반응형
js/
  main.js           # 부트스트랩: load → normalize → buildGraph → render 오케스트레이션
  data.js           # fetchSheet(), 스냅샷 폴백, PapaParse 파싱
  normalize.js      # SYNONYM_MAP, normalize(), 결측치 처리
  graph.js          # buildGraph(): 노드/엣지 모델 + 추론 알고리즘
  render.js         # 3d-force-graph 3D 렌더·드래그 회전·CSS2D 고정크기 라벨·엣지 flow·선택
  panels.js         # 좌측 상세 / 우측 설정 패널 바인딩
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
    og-image.html       # og-image.png 렌더 소스(chromium 캡처로 재생성)
DESIGN.md           # 디자인 시스템(토큰) — 페이지 크롬 한정(그래프 레이어는 비구속)
```

> 구현 상태: Phase 0~7 완료. 중앙 시각화는 **인터랙티브 3D(3d-force-graph)**로 구현됨. (변천: 초기 3D 구형 → 2D D3 방사형 → 인터랙티브 3D 방사형 → 색 DESIGN.md 원복+CSS2D 고정크기 라벨. 드래그 회전+관성·엣지 flow.)

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
  3d-force-graph 3D 렌더 ⇄ 우측 설정 패널 / 좌측 상세 패널(selectedNodeId)
```

- 시트 URL: gviz CSV 엔드포인트(PRD §8.5). 파서는 **PapaParse**(`header: true, skipEmptyLines: true`) — gviz CSV의 따옴표/콤마/줄바꿈 처리 때문에 직접 split 금지.
- 출처 배지: 성공 시 `"Live"`, 폴백 시 `"Snapshot"`, 둘 다 실패 시 에러 UI(재시도 버튼).

### CSV 스키마 (10컬럼)

`번호, 이름, 닉네임, 협업 시점, 나이(경력), 현직장, 과거 경력, 하는일, 관심사, 희망사항`

- `번호` 1 = 유광명(중심 노드). `협업 시점` = 유광명과 알게 된 **연도**(생년 아님). `나이(경력)` = 나이값. `과거 경력` = 콤마로 여러 소속 나열(관계 추론용).
- **경력 파생**: `normalize.js`가 `career = max(0, 나이 - CAREER_BASE(25))`를 계산. UI(노드 크기·라벨·상세)는 **나이 대신 경력(년차)** 만 표기.

### 그래프 모델 규칙

- **노드 크기**: `val = clamp(√career · k)`(제곱근 스케일). 경력에 비례.
- **중심 허브**: 유광명 노드 `isHub=true`, `fx=fy=fz=0`으로 3D 정중앙 고정.
- **엣지 추론**(`js/graph.js`, PRD §7.4):
  - (A) `hub`: 유광명↔전원, `weight = 2026 - 협업시점`.
  - (B) `affiliation`: 소속 공유(현직장 ∪ 과거경력, 교차 일치 포함) — **항상 생성**(노드-노드 간).
  - (C) `interest`: 표준 태그 `INTEREST_THRESHOLD = 2` 이상 중첩 시만(헤어볼 방지).
  - `dedupe(links)`로 동일 쌍은 type별 1개로 정리.
- **3D 인터랙티브 렌더**(`js/render.js`):
  - 허브 엣지 거리 = 협업 연차 역매핑 — **오래 알수록 중심에 가깝게**(방사 구조). 소속/관심사 링크는 짧게(군집).
  - 드래그 회전 + 관성(trackball damping). **자동 회전 없음**(과한 애니메이션 회피).
  - 입체 구체 노드(라이팅 음영 + 은은한 bloom), **CSS2D HTML 고정크기 라벨**(줌 무관 일정 px, 우측 토글), 허브 이름 기본 노출.
- **엣지 시각**: 허브 = 가는 흰색 점선(굵기 일정, weight 무관 — 거슬리지 않게 물러남). 노드-노드(소속/관심사) = 녹색 튜브로 강조. flow 파티클은 **소속(녹색) 엣지에만**(허브는 제거). 노드 선택 시 노드-노드 incident만 강조·나머지 dim. 우측 `Edges` 토글로 type별 표시.
- **확장성**: `SYNONYM_MAP`·관계 추론 임계값·기준 연도(2026)는 상수/객체로 분리해 갱신 가능하게 유지.
- **관계 검증 군집**(소속 엣지로 나타나야 함): 지아이비타 · 마키나락스 · PwC · 포스코이엔씨 · 한국전력공사.

## 작업 흐름

- 작업은 [docs/plan.md](docs/plan.md)의 Phase 0~7 순서를 따른다. 각 Phase 완료 시 plan.md 체크박스(`- [ ]` → `- [x]`)를 갱신한다.
- Phase 의존성: 0 → {1, 2} → 3 → 4 → (1+4) → 5 → 6 → 7.

## 검증 / 실행

- **로컬 실행**: 정적 서버로 루트를 서빙(예: `python3 -m http.server`) 후 브라우저로 `index.html` 확인. `file://` 직접 열기는 ES Module/fetch에서 CORS 문제가 날 수 있음.
- **수동 검증**: 콘솔 에러 없이 CDN 로드, 36노드 3D 렌더, 허브 중심 고정, 출처 배지, 라벨/엣지 토글 반영.
- **E2E**: Playwright(MCP)로 로드 → 렌더 → 드래그 회전 → 노드 클릭 → 상세(경력) → 라벨/엣지 토글 → Reset view 플로우 확인. (헤드리스 WebGL은 `--use-angle=swiftshader` 플래그 필요.)
- **성능 목표**: 인터랙션 60fps, 초기 렌더(폴백 포함) 3초 이내.

## 배포

- GitHub Pages를 **main 브랜치 루트**로 수동 설정(빌드 없음, GitHub Actions 미사용).
- `data/snapshot.csv`는 주기적으로 시트에서 내보내 수동 커밋.

## 컨벤션

- 커밋 메시지는 이모지 + 한글 설명 스타일(예: `:recycle: Phase 0 — ...`).
- 응답·주석·문서는 한국어.
