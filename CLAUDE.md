# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code를 위한 가이드입니다.

## 프로젝트 개요

**NODE (Network Of Domain Experts)** — AI 도메인 전문가 33명(확장 가능)의 소셜 네트워크를, 운영자 **유광명**을 중심 허브로 한 **구형(지구본) 지식그래프**로 시각화하는 **제로빌드 정적 웹 대시보드**.

- 운영자가 구글시트만 수정하면 런타임 CSV fetch로 대시보드에 즉시 반영된다.
- 빌드 도구·백엔드·DB 없이 `index.html`을 리포 루트에서 GitHub Pages로 서빙한다.
- 상세 요구사항은 [docs/PRD.md](docs/PRD.md), 단계별 작업 계획은 [docs/plan.md](docs/plan.md) 참조.

## 핵심 제약 (반드시 준수)

- **제로빌드**: 빌드 스텝 없음. 프레임워크 없음. HTML5 + CSS + 바닐라 JS(ES Modules) + CDN 라이브러리만 사용한다. Next.js/npm 보일러플레이트는 제거됨 — 재도입 금지.
- **백엔드/DB 없음**: 모든 처리는 클라이언트에서. API 키·시크릿 없음. 모든 리소스 HTTPS.
- **단일 진실 원천(SSOT)**: 데이터는 공개 구글시트. 폴백은 `data/snapshot.csv`(동일 스키마, 수동 갱신).
- **디자인 토큰만 사용**: 색/타이포/스페이싱은 [DESIGN.md](DESIGN.md) 토큰을 `css/tokens.css`의 CSS 변수로 매핑해 참조. **인라인 hex/px 신규 도입 금지, 라이트 모드 없음, 드롭섀도 금지(하어라인+글로우만), 본문에 그린(`--color-primary`) 사용 금지**(액센트=로고/Live 배지/허브 노드에만).

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
  render.js         # 3d-force-graph 설정·인터랙션
  panels.js         # 좌측 상세 / 우측 설정 패널 바인딩
data/
  snapshot.csv      # fetch 실패 시 폴백(수동 갱신)
DESIGN.md           # 디자인 시스템(토큰)
```

> 현재 구현 상태: Phase 0(보일러플레이트 제거·정적 골격) 완료. `js/`에는 `main.js`만 존재하며 `data.js`/`normalize.js`/`graph.js`/`render.js`/`panels.js`는 Phase 2~6에서 생성한다.

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
  3d-force-graph 렌더 ⇄ 우측 설정 패널 / 좌측 상세 패널(selectedNodeId)
```

- 시트 URL: gviz CSV 엔드포인트(PRD §8.5). 파서는 **PapaParse**(`header: true, skipEmptyLines: true`) — gviz CSV의 따옴표/콤마/줄바꿈 처리 때문에 직접 split 금지.
- 출처 배지: 성공 시 `"Live"`, 폴백 시 `"Snapshot"`, 둘 다 실패 시 에러 UI(재시도 버튼).

### CSV 스키마 (10컬럼)

`번호, 이름, 닉네임, 협업 시점, 나이(경력), 현직장, 과거 경력, 하는일, 관심사, 희망사항`

- `번호` 1 = 유광명(중심 노드). `협업 시점` = 유광명과 알게 된 **연도**(생년 아님). `나이(경력)` = 경력 대용값. `과거 경력` = 콤마로 여러 소속 나열(관계 추론용).

### 그래프 모델 규칙

- **노드 크기**: `val = clamp(√age · k)`(제곱근 스케일).
- **중심 허브**: 유광명 노드 `isHub=true`, `fx=fy=fz=0`으로 고정.
- **엣지 추론**(`js/graph.js`, PRD §7.4):
  - (A) `hub`: 유광명↔전원, `weight = 2026 - 협업시점`.
  - (B) `affiliation`: 소속 공유(현직장 ∪ 과거경력, 교차 일치 포함) — **항상 생성**.
  - (C) `interest`: 표준 태그 `INTEREST_THRESHOLD = 2` 이상 중첩 시만(헤어볼 방지).
  - `dedupe(links)`로 동일 쌍은 type별 1개로 정리.
- **확장성**: `SYNONYM_MAP`·관계 추론 임계값·기준 연도(2026)는 상수/객체로 분리해 갱신 가능하게 유지.
- **관계 검증 군집**(소속 엣지로 나타나야 함): 지아이비타 · 마키나락스 · PwC · 포스코이엔씨 · 한국전력공사.

## 작업 흐름

- 작업은 [docs/plan.md](docs/plan.md)의 Phase 0~7 순서를 따른다. 각 Phase 완료 시 plan.md 체크박스(`- [ ]` → `- [x]`)를 갱신한다.
- Phase 의존성: 0 → {1, 2} → 3 → 4 → (1+4) → 5 → 6 → 7.

## 검증 / 실행

- **로컬 실행**: 정적 서버로 루트를 서빙(예: `python3 -m http.server`) 후 브라우저로 `index.html` 확인. `file://` 직접 열기는 ES Module/fetch에서 CORS 문제가 날 수 있음.
- **수동 검증**: 콘솔 에러 없이 CDN 로드, 33노드 렌더, 허브 중심 고정, 출처 배지, 토글 반영.
- **E2E**: Playwright(MCP)로 로드 → 렌더 → 회전 → 노드 클릭 → 상세 → 토글 플로우 확인.
- **성능 목표**: 인터랙션 60fps, 초기 렌더(폴백 포함) 3초 이내.

## 배포

- GitHub Pages를 **main 브랜치 루트**로 수동 설정(빌드 없음, GitHub Actions 미사용).
- `data/snapshot.csv`는 주기적으로 시트에서 내보내 수동 커밋.

## 컨벤션

- 커밋 메시지는 이모지 + 한글 설명 스타일(예: `:recycle: Phase 0 — ...`).
- 응답·주석·문서는 한국어.
