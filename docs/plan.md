# NODE 지식그래프 대시보드 상세 개발 계획서

## Context

이 문서는 [docs/PRD.md](PRD.md)(v1.0)를 기반으로, **운영자 유광명을 중심 허브로 한 33명 AI 도메인 전문가 네트워크를 구형(지구본) 지식그래프로 시각화하는 제로빌드 정적 웹 대시보드**를 단계별로 구현하기 위한 작업 계획서입니다. 각 작업에는 진행 현황을 기록할 수 있는 체크박스(`- [ ]`)가 포함되어 있습니다.

**현재 구현 상태:** 사실상 백지 상태. 저장소에는 Next.js 보일러플레이트(`package.json`, `next.config.ts`, `Dockerfile` 등)만 존재하며 PRD가 미사용을 명시함. `index.html`·`css/`·`js/`·실제 데이터(`data/snapshot.csv`)는 모두 부재. [DESIGN.md](../DESIGN.md)(디자인 토큰)와 [docs/PRD.md](PRD.md)는 완성되어 구현 준비 완료.

**확정된 요구사항:**

1. **보일러플레이트 전부 제거** → 순수 정적 구조(`index.html` 루트 서빙)로 전환
2. **검증: 수동 체크리스트 + Playwright(MCP) E2E**
3. **스냅샷: 구글시트 CSV에서 직접 fetch해 `data/snapshot.csv` 커밋**
4. **배포: main 브랜치 루트를 GitHub Pages로 수동 설정**(빌드 없음, GitHub Actions 미사용)

**목표 결과:** 본 계획서만 보고 각 Phase를 순서대로 수행·체크하며 PRD MVP 범위(데이터 로드 → 전처리 → 그래프 모델 → 구형 렌더 → 좌/우 패널 → 배포)를 완성한다.

> **진행 표기:** `- [ ]` 미완료 / `- [x]` 완료. 각 Phase 헤더에 **목표/의존성**, 말미에 **검증** 방법을 명시했습니다.

---

## Phase 0: 프로젝트 정리 및 골격

**목표:** Next.js 흔적을 제거하고 PRD §6.2 정적 파일 골격 확보
**의존성:** 없음

### 0-1. 보일러플레이트 제거
- [x] Next.js 관련 파일 삭제: `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `components.json`
- [x] Docker 관련 파일 삭제: `Dockerfile`, `docker-compose.yaml`, `.dockerignore`
- [x] (선택) `configs/`, `img/` 등 미사용 디렉토리 정리 — 사용 계획 없으면 제거

### 0-2. 디렉토리 골격 생성
- [x] `css/`, `js/` 디렉토리 생성 (기존 `data/` 디렉토리 활용)
- [x] `index.html` 골격 작성 — 헤더(브랜딩·노드 카운트·출처 배지) / 3분할 본문(좌측 상세·중앙 `#graph`·우측 설정) / 푸터 마크업
- [x] CDN `<script>` 추가: `3d-force-graph`, `Three.js`, `PapaParse`
- [x] `<script type="module" src="js/main.js">` 엔트리 연결

### 0-3. 문서 정비
- [x] `README.md`를 NODE 프로젝트용으로 갱신(로컬 실행·GitHub Pages 배포·구글시트 갱신 방법)
- [x] [DESIGN.md](../DESIGN.md) 참조 경로 확정(PRD는 루트 `DESIGN.md` 가정)

**검증:** `index.html`을 브라우저로 열어 콘솔 에러 없이 CDN 라이브러리가 로드되는지 확인.

---

## Phase 1: 디자인 시스템 및 레이아웃

**목표:** DESIGN.md 토큰을 CSS 변수로 매핑하고 데스크톱 3분할 + 반응형 레이아웃 구현
**의존성:** Phase 0

### 1-1. 디자인 토큰 매핑
- [x] `css/tokens.css` — DESIGN.md의 색/타이포/스페이싱/라운딩을 CSS 변수로 매핑
- [x] **금지 규칙 준수**: 인라인 hex/px 신규 도입 금지, 라이트 모드 없음, 드롭섀도 없음(하어라인+글로우만), 본문 그린 사용 금지

### 1-2. 레이아웃 스타일
- [x] `css/styles.css` — 헤더/푸터, 3분할 그리드(`280px / 1fr / 280px`)
- [x] 좌측 상세 패널·우측 설정 패널·중앙 `#graph` 컨테이너 레이아웃
- [x] 데이터 출처 배지(Live/Snapshot) 스타일, 태그 칩(pill, `rounded.pill`) 스타일

### 1-3. 반응형 전략 (PRD §9.3)
- [x] ≥1024px: 좌·중·우 3분할
- [x] 640–1023px: 좌측 패널 오버레이/드로어, 우측 설정 상단 접이식 바
- [x] <640px: 그래프 전체 폭, 패널 하단 시트 스택(터치 회전·줌 유지)

**검증:** 빈 레이아웃을 데스크톱/태블릿/모바일 폭에서 시각 확인. 드롭섀도 0건, 그린은 액센트(로고/라이브/허브)에만 사용.

---

## Phase 2: 데이터 로드 및 폴백

**목표:** 구글시트 CSV fetch → 실패 시 스냅샷 폴백 파이프라인 구현 (PRD §3.1)
**의존성:** Phase 0

### 2-1. 스냅샷 확보
- [x] PRD §3.1 시트 URL에서 CSV를 직접 fetch해 `data/snapshot.csv` 생성·커밋(33명 실데이터, 동일 스키마)

### 2-2. 데이터 로더
- [x] `js/data.js` — `SHEET_CSV_URL` 상수 정의(PRD §8.5)
- [x] `loadData()` — `try { fetch(SHEET_CSV_URL) } catch { fetch('data/snapshot.csv') }` 폴백 구조(AbortController 타임아웃 5초 보강)
- [x] `parseCsv()` — PapaParse(`header: true, skipEmptyLines: true`)
- [x] 반환 객체 `{ rows, source }` 및 `loadError`(폴백까지 실패 시) 처리

### 2-3. 출처 표시
- [x] 헤더/푸터 배지에 `dataSource`("live" | "snapshot") 반영
- [x] 폴백까지 실패 시 에러 안내 UI(재시도 버튼) 노출

**검증:** 정상 시 "Live" 배지, DevTools offline으로 시트 차단 시 "Snapshot" 배지 + 그래프 렌더, 둘 다 실패 시 에러 UI 표시.

---

## Phase 3: 데이터 전처리

**목표:** 동의어 통합·결측치 규칙으로 `NormalizedMember[]` 생성 (PRD §7)
**의존성:** Phase 2

### 3-1. 동의어 통합
- [x] `js/normalize.js` — `SYNONYM_MAP`(PRD §7.2, 확장 가능 객체로 분리)
- [x] `toCanonicalTags(cell)` — 콤마 분리 → trim → 소문자 비교 → 표준 태그 매핑(미정의는 원형 유지)

### 3-2. 정규화 함수
- [x] `normalize(rawRows)` — 10컬럼 → `NormalizedMember`(`id`/`name`/`nickname`/`sinceYear`/`age`/`company`/`pastOrgs`/`doingTags`/`interestTags`/`wishTags`)

### 3-3. 결측치 규칙 (PRD §7.3)
- [x] 닉네임·과거경력 공란 허용 → 라벨/관계 산정에서 제외하되 **노드는 항상 생성**
- [x] 숫자 컬럼(`협업시점`, `나이`) 파싱 실패 시 안전 기본값(나이=중앙값, 협업시점=2026) 대체 + 로그

**검증:** 콘솔에서 정규화 결과 33건, 표준 태그 집합, 결측치 대체 로그 확인.

---

## Phase 4: 그래프 모델 생성

**목표:** 정규화 레코드 → `{ nodes, links }` 모델 + 엣지 추론 (PRD §3.3, §7.4)
**의존성:** Phase 3

### 4-1. 노드 생성
- [x] `js/graph.js` — `buildNodes()`: 노드 크기 `val = clamp(√age · k)`
- [x] 유광명(번호 1) 노드 `isHub=true`·`fx=fy=fz=0`으로 중심 고정

### 4-2. 엣지 추론 (PRD §7.4)
- [x] (A) 허브 엣지 — 유광명과 전원 1차 연결, `weight = 2026 - sinceYear`, `type: "hub"`
- [x] (B) 소속 공유 엣지 — `affiliationsOf` = 현직장 ∪ 과거경력(교차 일치 포함), **항상 생성**, `type: "affiliation"`
- [x] (C) 관심사 공유 엣지 — 표준 태그 `INTEREST_THRESHOLD = 2` 이상 중첩 시만(헤어볼 방지), `type: "interest"`
- [x] `dedupe(links)` — 동일 쌍 다중 엣지는 type별 1개로 정리

**검증:** PRD §7.4 검증용 공유 허브 5군집(지아이비타·마키나락스·PwC·포스코이엔씨·한국전력공사)이 소속 엣지로 나타나는지 콘솔 검사.

---

## Phase 5: 구형 지식그래프 렌더링 및 인터랙션

**목표:** 3d-force-graph로 구형 렌더 + 회전/줌/선택 인터랙션 (PRD §3.4, §8.4)
**의존성:** Phase 1 + Phase 4

### 5-1. 부트스트랩
- [ ] `js/main.js` — 오케스트레이션(load → normalize → buildGraph → render), 배지·에러 UI 연동

### 5-2. 렌더링
- [ ] `js/render.js` — `ForceGraph3D` 설정(`nodeVal`·`nodeColor`·`linkWidth`·`linkColor` `EDGE_COLORS`)
- [ ] 유광명 노드 중심 고정, 반투명 와이어프레임 글로브 배경 연출
- [ ] 자동 회전(기본 on, `Graph.scene().rotation.y += 0.001`)

### 5-3. 인터랙션
- [ ] 호버 시 이름 표시, 노드 드래그/줌
- [ ] `onNodeClick(selectNode)` — `selectedNodeId` 공유 + 해당 노드/엣지 하이라이트

**검증(Playwright MCP):** 캔버스 렌더·노드 카운트 33·회전/줌 동작·노드 클릭 시 `selectedNodeId` 변화 확인, 초기 렌더 3초 이내.

---

## Phase 6: 좌측 상세 / 우측 설정 패널

**목표:** 선택 노드 상세 표시 + 시각화 토글 (PRD §3.5, §3.6)
**의존성:** Phase 5

### 6-1. 좌측 상세 패널
- [ ] `js/panels.js` — 이름/닉네임/협업시점/나이/현직장/과거경력 표시
- [ ] 하는일·관심사·희망사항을 표준 태그 칩으로 표시, `연결`(허브/소속/관심사 개수) 요약
- [ ] 미선택 시 플레이스홀더("노드를 선택하면 상세 정보가 표시됩니다")

### 6-2. 우측 설정 패널
- [ ] 라벨 표시 토글(이름/나이/닉네임/관심사)
- [ ] 엣지 유형 토글(허브/소속/관심사 개별)
- [ ] 회전 on/off(**기본 on**), 줌 리셋(카메라 초기 위치 복귀)
- [ ] 설정 상태 런타임 메모리 유지(영속화는 Post-MVP)

**검증(Playwright MCP):** 노드 클릭 → 좌측 상세 갱신, 각 토글이 그래프에 즉시 반영, 줌 리셋 동작.

---

## Phase 7: 통합 검증 및 배포

**목표:** PRD 성공 지표 충족 확인 + GitHub Pages 배포
**의존성:** 모든 Phase 완료

### 7-1. 통합 검증
- [ ] 수동 검증 체크리스트(아래 검증 지표 표 9항목)
- [ ] Playwright E2E 시나리오: 로드 → 렌더 → 회전 → 노드 클릭 → 상세 → 토글 전체 플로우
- [ ] 접근성: 키보드로 줌/회전 리셋, 텍스트 대비 토큰 준수
- [ ] 반응형 최종 확인(데스크톱/태블릿/모바일)

### 7-2. 배포
- [ ] GitHub Pages 수동 설정: main 브랜치 루트 서빙(빌드 없음)
- [ ] 배포 URL에서 정상 동작 확인

**검증:** 배포 URL에서 빌드 없이 정상 동작, 인라인 hex 신규 0건.

---

## Phase 의존성 다이어그램

```
Phase 0 (정리·골격)
    │
    ├── Phase 1 (디자인 시스템·레이아웃)
    │
    └── Phase 2 (데이터 로드·폴백)
              │
              └── Phase 3 (전처리)
                        │
                        └── Phase 4 (그래프 모델)
                                  │
       Phase 1 + Phase 4 ──────► Phase 5 (구형 렌더·인터랙션)
                                  │
                                  └── Phase 6 (좌/우 패널)
                                            │
                                            └── Phase 7 (통합 검증·배포)
```

---

## 검증 지표 (MVP 성공 기준 — PRD §11)

| 항목 | 목표 |
|---|---|
| 데이터 로드 | 구글시트에서 전 구성원(현재 33명) 노드가 렌더링됨 |
| 폴백 동작 | 시트 fetch 차단 시 `data/snapshot.csv`로 정상 렌더(배지 "Snapshot") |
| 허브 고정 | 유광명 노드가 중심에 고정되고 전원과 1차 연결됨 |
| 관계 추론 정확도 | 검증용 공유 허브 5군집이 소속 엣지로 표시됨 |
| 헤어볼 방지 | 관심사 엣지가 임계값(태그 2개 이상)으로 제한되어 식별 가능한 수준 유지 |
| 인터랙션 | 회전·줌·노드 클릭→좌측 상세 갱신, 우측 토글 즉시 반영 |
| 성능 | 인터랙션 시 체감 60fps, 초기 렌더 3초 이내 |
| 디자인 일관성 | 모든 UI가 DESIGN.md 토큰만 사용(인라인 hex 신규 0건) |
| 배포 | GitHub Pages 루트에서 빌드 없이 정상 동작 |

---

## 주요 파일 참조

- [docs/PRD.md](PRD.md) — 요구사항 원천 문서
- [docs/task-plan-template.md](task-plan-template.md) — 계획 템플릿
- [DESIGN.md](../DESIGN.md) — 디자인 시스템(토큰)
- `index.html` — 헤더/3분할/푸터 마크업, CDN `<script>` (Phase 0)
- `css/tokens.css` · `css/styles.css` — 토큰 매핑·레이아웃 (Phase 1)
- `js/data.js` — fetch·폴백·PapaParse 파싱 (Phase 2)
- `js/normalize.js` — 동의어 맵·정규화·결측치 (Phase 3)
- `js/graph.js` — `buildGraph()`·엣지 추론 (Phase 4)
- `js/render.js` — 3d-force-graph 설정·인터랙션 (Phase 5)
- `js/panels.js` — 좌측 상세·우측 설정 패널 (Phase 6)
- `js/main.js` — 부트스트랩 오케스트레이션 (Phase 5)
- `data/snapshot.csv` — fetch 실패 시 폴백 스냅샷 (Phase 2)
