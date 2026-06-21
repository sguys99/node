# NODE 지식그래프 시각화 대시보드 PRD v1.0

**AI에 관심 있는 사람들의 소셜 네트워크 NODE(Network Of Domain Experts)를, 운영자 유광명을 중심으로 한 지식그래프로 시각화하는 제로빌드 정적 웹 대시보드.**

> **개정 노트 (v1.0 이후, 2026-06):** 중앙 시각화가 여러 차례 개편되었다(초기 3D 구형 → 2D D3 방사형 → **현재 인터랙티브 3D 방사형(3d-force-graph/Three.js)**). 본 문서 §3.4·§8.4의 "구형 글로브/자동 회전/줌·블룸 강함" 서술은 **레거시**이며, 현재 구현의 SSOT는 [CLAUDE.md](../CLAUDE.md)와 `js/render.js`다. 현재 구현 요지: ① 인터랙티브 3D(허브 중앙 고정, 협업 연차=허브 거리, 드래그 회전+관성, **자동 회전 없음**) ② 씬 안 SpriteText 텍스트 라벨(우측 토글, 허브 기본 노출) ③ 노드-노드 소속/관심사 엣지(토글+선택 강조) ④ 엣지 flow 파티클(허브·소속, 느리게) ⑤ 입체 구체 노드 + 은은한 bloom ⑥ **나이 대신 경력(=max(0, 나이-25)) 표기**, 노드 크기=경력 ⑦ Noto Sans KR·우측 패널 영어화 ⑧ 그래프 레이어는 DESIGN.md 색 제약 비구속(`--graph-*`, 비녹색 딥 인디고+앰버).

---

| 항목 | 내용 |
|---|---|
| 문서 버전 | v1.0 |
| 작성일 | 2026년 06월 20일 |
| 대상 독자 | 개발자(1인), 운영자(유광명), 이해관계자 |
| 프로젝트 유형 | 빌드 없는 정적 웹 대시보드 → GitHub Pages 배포 |
| 데이터 소스 | Google Sheets 런타임 CSV fetch (백엔드/DB 없음) |

---

## 1. 프로젝트 개요

### 1.1 프로젝트 이름 및 한줄 설명

**NODE (Network Of Domain Experts)** — 운영자 유광명을 허브로 한 33명(확장 가능)의 AI 도메인 전문가 네트워크를, 경력·소속·관심사 기반 관계로 추론하여 구형 지식그래프로 탐색하는 모던 정적 대시보드.

### 1.2 해결하려는 문제

| 문제 | 현재 상황 | 결과/영향 |
|---|---|---|
| 인맥 관계가 비가시적 | 구성원 정보가 구글시트 행으로만 존재 | 누가 누구와 어떤 맥락(소속·관심사)으로 연결되는지 직관적으로 파악 불가 |
| 정적 명단의 한계 | 표 형태로는 허브·클러스터·공유 이력이 드러나지 않음 | 네트워크의 구조적 가치(공통 소속, 관심사 클러스터)를 발견하기 어려움 |
| 운영/배포 부담 | 백엔드·DB·빌드 파이프라인을 두면 1인 운영 비용이 큼 | 데이터 갱신과 배포가 무거워져 지속 운영이 어려움 |

### 1.3 핵심 가치 제안

- **구형 시각화:** 지구본을 본뜬 3D 구(sphere) 위에 force-directed 그래프를 배치해, 유광명을 중심 허브로 한 관계망을 회전·줌으로 탐색한다.
- **런타임 데이터:** 구글시트를 단일 진실 원천(SSOT)으로 두고 페이지 로드 시 CSV를 fetch·정규화한다. 시트만 고치면 대시보드가 갱신된다.
- **제로빌드 배포:** HTML/CSS/바닐라 JS + CDN 라이브러리만으로 구성해 빌드 도구 없이 GitHub Pages 루트에 배포한다.

---

## 2. 사용자 정의

### 2.1 주요 사용자

| 역할 | 설명 | 주요 니즈 |
|---|---|---|
| **운영자 (유광명)** | NODE 명단을 관리하는 중심 노드(번호 1) | 구글시트로 구성원을 추가·수정하면 즉시 반영되고, 자신을 중심으로 한 관계망이 한눈에 보이길 원함 |
| **방문자 (구성원/관심자)** | 네트워크를 둘러보는 일반 사용자 | 특정 인물을 클릭해 상세(소속·관심사·하는일)를 보고, 공통 소속·관심사로 누구와 연결되는지 발견하길 원함 |

### 2.2 사용자별 접근 방식

- **운영자:** 구글시트에서 행 추가/수정 → 대시보드 새로고침 → 새 노드·엣지가 구형 그래프에 반영됨을 확인. 별도 배포·빌드 불필요.
- **방문자:** 대시보드 접속 → 구형 그래프 회전/줌 → 노드 호버로 이름 확인, 클릭으로 좌측 상세 패널 확인 → 우측 설정 패널로 라벨/엣지 유형/회전을 조절하며 탐색.

---

## 3. 핵심 기능 (MVP 범위)

### Must Have 기능 목록 및 우선순위

| 우선순위 | 기능 | 의존성 |
|:---:|---|---|
| 1 | 데이터 로드 (구글시트 CSV fetch) + 번들 스냅샷 폴백 | - |
| 2 | 데이터 전처리 (동의어 통합/결측치 규칙) | 1 |
| 3 | 그래프 모델 생성 (노드 크기=나이, 엣지=관계/협업시점) | 2 |
| 4 | 구형 지식그래프 렌더링 및 인터랙션 (회전/줌/선택) | 3 |
| 5 | 좌측 인력 상세 패널 | 4 |
| 6 | 우측 시각화 설정 패널 | 4 |

---

### 3.1 데이터 로드 (구글시트 CSV fetch) 및 폴백

페이지 로드 시 구글시트에서 CSV를 fetch하여 클라이언트에서 파싱한다. 네트워크 실패·시트 비공개 전환 등으로 fetch가 실패하면 **저장소에 동봉한 정적 스냅샷**으로 자동 폴백하여 그래프는 항상 렌더링한다.

**입력**

- 구글시트 CSV 엔드포인트(CORS 허용):
  `https://docs.google.com/spreadsheets/d/1fychV7omFIle0GpBAF2_ccAyF0cZAtY7IFsmkIS5sic/gviz/tq?tqx=out:csv&gid=0`
- 폴백 스냅샷: `data/snapshot.csv` (또는 `data/snapshot.json`) — 동일 스키마.

**처리 흐름**

```
fetch(SHEET_CSV_URL)
  ├─ 성공 → PapaParse 파싱 → 정규화 → 그래프 렌더 (배지: "Live")
  └─ 실패(network/HTTP/timeout) → data/snapshot.csv 로드 → 동일 파이프라인 (배지: "Snapshot")
        └─ 스냅샷도 실패 → 에러 안내 UI (재시도 버튼)
```

**출력**

| 필드명 | 설명 |
|---|---|
| `rawRows` | CSV 원본 행 배열(파싱 직후, 정규화 전) |
| `dataSource` | `"live"` \| `"snapshot"` — 헤더/푸터에 출처 배지로 표시 |
| `loadError` | 폴백까지 실패한 경우의 오류 메시지(에러 UI 노출) |

> **결정사항:** CSV 파서는 **PapaParse(CDN)** 를 사용한다. gviz CSV는 셀을 따옴표로 감싸고 셀 내부에 콤마(예: 과거경력 다중 소속)가 포함되므로, escape/줄바꿈을 안정적으로 처리하기 위함이다.

---

### 3.2 데이터 전처리 (키워드 통합/정제)

`하는일`·`관심사`·`희망사항` 컬럼은 동일 개념이 서로 다른 표기로 입력되므로, 콤마 분리 → trim → 정규화 → **동의어 통합 맵**으로 표준 키워드(canonical tag)로 매핑한다. 자세한 규칙은 [7. 데이터 전처리 규칙](#7-데이터-전처리-규칙)에 정의한다.

**입력**: `rawRows`(원본 행)
**출력**: 정규화된 구성원 레코드 배열(`NormalizedMember[]`) — 표준 태그 집합 포함, 결측치 정리 완료.

---

### 3.3 그래프 모델 생성 (노드 크기=나이, 엣지=관계/협업시점)

정규화 레코드로부터 `3d-force-graph`가 소비하는 `{ nodes, links }` 모델을 만든다.

**규칙**

- **노드 크기**: `나이(경력)` 값에 비례. 가독성을 위해 제곱근 스케일 적용(`size = clamp(√age · k)`).
- **중심 허브**: 유광명(번호 1) 노드는 `fx=fy=fz=0`으로 중심 고정.
- **유광명↔타인 엣지**: 모든 구성원은 유광명과 1차 연결. 굵기 = `2026 - 협업시점`(알고 지낸 기간이 길수록 굵게). `type: "hub"`.
- **타인 간 추론 엣지**: 소속/관심사 공유로 추론(아래 결정사항 및 §7 알고리즘).

> **결정사항(엣지 밀도 제어):** **소속 공유(현직장 일치 / 과거경력 일치 / 현직장↔과거경력 교차)는 항상 엣지를 생성**한다. **관심사·하는일 기반 엣지는 표준 키워드가 2개 이상 중첩될 때만** 생성하여 헤어볼(과밀)을 방지한다.

**출력**

| 필드명 | 설명 |
|---|---|
| `nodes` | `GraphNode[]` — id·라벨·크기·중심고정 여부·원본 레코드 참조 |
| `links` | `GraphLink[]` — source/target·type(hub/affiliation/interest)·weight·공유 키 |

타입 정의는 [8. 데이터 모델](#8-데이터-모델) 참조.

---

### 3.4 구형 지식그래프 렌더링 및 인터랙션

`3d-force-graph` + `Three.js`(둘 다 CDN)로 중앙 캔버스에 구형 그래프를 렌더링한다.

- **전체 형태**: 반투명 와이어프레임 글로브를 배경으로 두고, force-directed 노드를 구 내부에 담는 연출(구형 배치).
- **인터랙션**: 마우스/터치로 회전, 줌인/아웃, 노드 드래그·호버. 호버 시 이름, 클릭 시 좌측 상세 패널 갱신 + 해당 노드/엣지 하이라이트.
- **중심 고정**: 유광명 노드를 중심에 고정해 허브로 표현.
- **라벨**: 노드에 이름 텍스트 표시(우측 패널 토글로 on/off). 엣지 유형별 색/스타일 구분(소속 vs 관심사).
- **스타일**: DESIGN.md 토큰 기반. 단일 액센트 `{colors.primary}`, 그림자 금지(글로우/하어라인만).

**출력**: 인터랙티브 3D 캔버스, 선택 노드 ID(`selectedNodeId`)를 좌측 패널과 공유.

---

### 3.5 좌측 인력 상세 패널

노드 클릭 시 해당 구성원의 상세 정보를 표시한다.

**출력 필드**

| 필드명 | 설명 |
|---|---|
| `이름` / `닉네임` | 식별 라벨(닉네임 공란 시 생략) |
| `협업시점` | 유광명과 알게 된 연도 |
| `나이(경력)` | 경력 대용값 |
| `현직장` / `과거경력` | 소속(과거경력 공란 가능) |
| `하는일` / `관심사` / `희망사항` | 표준 태그 칩으로 표시 |
| `연결` | 이 노드와 직접 연결된 엣지 요약(허브/소속/관심사 개수) |

미선택 시 안내 플레이스홀더("노드를 선택하면 상세 정보가 표시됩니다")를 노출한다.

---

### 3.6 우측 시각화 설정 패널

시각화 표시 옵션을 토글한다.

| 컨트롤 | 동작 |
|---|---|
| 라벨 표시(이름/나이/닉네임/관심사) | 체크박스로 노드 라벨 항목 on/off |
| 엣지 유형 토글 | 허브/소속/관심사 엣지 표시 여부 개별 토글 |
| 회전 on/off | 자동 회전(orbit) 토글 — **기본 on** |
| 줌 리셋 | 카메라를 초기 위치로 복귀 |

설정 상태는 메모리(런타임)만 유지(영속화는 Post-MVP).

---

## 4. 비기능 요구사항

| 항목 | 요구사항 |
|---|---|
| 성능 | 33노드/추론 엣지 기준 인터랙션 시 60fps 목표. 초기 렌더(폴백 포함) 3초 이내. |
| 가용성 | 정적 호스팅(GitHub Pages). 시트 fetch 실패 시 스냅샷 폴백으로 항상 그래프 표시. |
| 보안 | 공개 구글시트 읽기 전용(민감정보 없음 전제), 모든 리소스 HTTPS. API 키·시크릿 없음. |
| 반응형 | 데스크톱 3분할, 좁은 화면에서는 패널 접힘/스택. 모바일에서도 그래프 회전·줌 가능. |
| 접근성 | 키보드로 줌/회전 리셋 조작 가능, 텍스트 대비는 DESIGN.md 토큰(`{colors.ink}`/`{colors.body}`) 준수. |
| 유지보수 | 동의어 맵·관계 추론 규칙은 확장 가능한 객체/상수로 분리. |

---

## 5. 기술 스택

| 영역 | 기술 | 비고 |
|---|---|---|
| 마크업/스타일 | HTML5, CSS (DESIGN.md 토큰을 CSS 변수로 매핑) | 빌드 없음 |
| 로직 | 바닐라 JavaScript (ES Modules) | 프레임워크 없음 |
| 그래프 | 3d-force-graph + Three.js | CDN 로드 |
| CSV 파싱 | **PapaParse** | CDN 로드 |
| 데이터 | Google Sheets 런타임 CSV fetch | 실패 시 `data/` 스냅샷 폴백 |
| 폰트 | Inter + SF Mono | DESIGN.md 지정 |
| 배포 | **리포 루트 정적 파일** → GitHub Pages | 기존 Next.js 템플릿 미사용 |

> 본 저장소의 Next.js 보일러플레이트는 사용하지 않으며(`src/` 제거), `index.html`을 루트에 두고 GitHub Pages 루트로 서빙한다.

---

## 6. 시스템 아키텍처

### 6.1 데이터 흐름

```
[Google Sheet]
     │  gviz CSV fetch (HTTPS)
     ▼
[fetch] ──실패──▶ [data/snapshot.csv]
     │ 성공                 │
     ▼                      ▼
[PapaParse 파싱] ◀──────────┘
     │  rawRows
     ▼
[정규화 normalize()]  ── 동의어 맵 / 결측치 규칙
     │  NormalizedMember[]
     ▼
[그래프 모델 buildGraph()] ── 노드 크기·허브 고정·엣지 추론
     │  { nodes, links }
     ▼
[3d-force-graph 렌더] ◀── 우측 설정 패널(라벨/엣지/회전)
     │  selectedNodeId
     ▼
[좌측 상세 패널 갱신]
```

### 6.2 파일 구조 (리포 루트 배포)

```
/ (repo root, GitHub Pages 루트)
├── index.html              # 헤더/3분할/푸터 마크업, CDN <script>
├── css/
│   ├── tokens.css          # DESIGN.md 토큰 → CSS 변수 매핑
│   └── styles.css          # 레이아웃·패널·반응형
├── js/
│   ├── main.js             # 부트스트랩(로드→정규화→빌드→렌더 오케스트레이션)
│   ├── data.js             # fetchSheet(), 폴백, PapaParse 파싱
│   ├── normalize.js        # 동의어 맵, normalize(), 결측치 처리
│   ├── graph.js            # buildGraph(): 노드/엣지 모델 + 추론 알고리즘
│   ├── render.js           # 3d-force-graph 설정·인터랙션
│   └── panels.js           # 좌측 상세 / 우측 설정 패널 바인딩
├── data/
│   └── snapshot.csv        # fetch 실패 시 폴백 스냅샷(수동 갱신)
└── DESIGN.md               # 디자인 시스템(기존)
```

---

## 7. 데이터 전처리 규칙

### 7.1 CSV 원본 스키마 (10컬럼)

| 컬럼 | 설명 | 비고 |
|---|---|---|
| 번호 | 일련번호 | 1번 = 유광명(중심 노드) |
| 이름 | 구성원 이름 | 노드 식별 라벨 |
| 닉네임 | 별칭 | 공란 가능 |
| 협업 시점 | 유광명과 알게 된 **연도** | 허브 엣지 굵기 산정(`2026 - 협업시점`) |
| 나이(경력) | 경력 대용값 | 노드 크기 산정 |
| 현직장 | 현재 소속 | 소속 관계 키 |
| 과거 경력 | 과거 소속/이력(콤마 다중) | 소속 관계 키, 공란 가능 |
| 하는일 | 현재 업무 | 키워드 정규화 대상 |
| 관심사 | 관심 분야 | 키워드 정규화 대상 |
| 희망사항 | 기대하는 것 | 키워드 정규화 대상 |

> **모호 컬럼 주의**: `협업 시점`은 생년이 아닌 "유광명과 알게 된 연도". `나이(경력)`은 경력 대용값. `과거 경력`은 관계 유추용 비정형 텍스트(콤마로 여러 소속 나열).

### 7.2 동의어 통합 맵

표준 키워드(canonical tag)로 매핑하는 확장 가능 객체. 미정의 키워드는 원형 유지.

```js
// js/normalize.js
const SYNONYM_MAP = {
  "지식 그래프": "지식그래프", "knowledge graph": "지식그래프",
  "바이브코딩": "Vibe coding", "vibe coding": "Vibe coding",
  "ai agent": "AI Agent",
  "llm framework": "LLM Framework",
  "data platform": "데이터플랫폼", "데이터 플랫폼": "데이터플랫폼",
  "데이터 분석": "데이터분석",
  "최신 기술 트렌드": "AI 트렌드", "최신 ai 트렌드": "AI 트렌드",
  "네트워크": "네트워킹", "협업 기회": "네트워킹",
  // 확장 가능 — 키는 소문자·trim 후 비교
};

// 키워드 셀 → 표준 태그 배열
function toCanonicalTags(cell) {
  if (!cell) return [];
  return cell.split(",")
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => SYNONYM_MAP[s.toLowerCase()] ?? s); // 미정의는 원형 유지
}
```

### 7.3 결측치 규칙

- `닉네임`·`과거 경력` 공란 허용 → 라벨/관계 산정에서 제외하되 **노드는 항상 생성**.
- 숫자 컬럼(`협업 시점`, `나이(경력)`) 파싱 실패 시 안전 기본값(예: 나이=중앙값, 협업시점=2026)으로 대체하고 로그.

### 7.4 엣지 추론 알고리즘

```
buildLinks(members):
  links = []

  # (A) 허브 엣지 — 유광명(1번)과 전원 연결
  for m in members where m.번호 != 1:
      links.push({ source: 1, target: m.번호,
                   type: "hub", weight: 2026 - m.협업시점 })

  # (B) 소속 공유 엣지 — 항상 생성
  for (a, b) in pairs(members, exclude=유광명):
      sharedAff = affiliationsOf(a) ∩ affiliationsOf(b)   # 현직장 ∪ 과거경력, 교차 포함
      if sharedAff not empty:
          links.push({ source: a.번호, target: b.번호,
                       type: "affiliation", shared: sharedAff,
                       weight: size(sharedAff) })

  # (C) 관심사 공유 엣지 — 임계값(표준 태그 ≥ 2 중첩)
  for (a, b) in pairs(members, exclude=유광명):
      sharedTags = canonicalTagsOf(a) ∩ canonicalTagsOf(b)  # 하는일 ∪ 관심사
      if size(sharedTags) >= INTEREST_THRESHOLD:   # INTEREST_THRESHOLD = 2
          links.push({ source: a.번호, target: b.번호,
                       type: "interest", shared: sharedTags,
                       weight: size(sharedTags) })

  return dedupe(links)   # 동일 쌍 다중 엣지는 type별 1개로 정리
```

`affiliationsOf(m)` = `현직장` ∪ `과거경력`(콤마 분리·trim). 교차 일치(한쪽 현직장 = 다른쪽 과거경력)도 포함한다.

**검증용 공유 허브(실측)**: 지아이비타(유광명·김상균·김용희·김정록·김형록), 마키나락스(유광명·김규연·변정현·이호진), PwC(유광명·박준상·박철균·이명관), 포스코이엔씨(유광명·김행찬·조우철·한정우), 한국전력공사(유광명·노재구·이민철·최윤석). 구현 후 이 군집이 엣지로 나타나는지 확인한다.

---

## 8. 데이터 모델

### 8.1 정규화 레코드 (`NormalizedMember`)

```js
/**
 * @typedef {Object} NormalizedMember
 * @property {number} id          // 번호 (PK, 1=유광명)
 * @property {string} name        // 이름
 * @property {string=} nickname   // 닉네임 (공란 가능)
 * @property {number} sinceYear   // 협업 시점(연도)
 * @property {number} age         // 나이(경력) 대용값
 * @property {string} company     // 현직장
 * @property {string[]} pastOrgs  // 과거 경력(콤마 분리)
 * @property {string[]} doingTags // 하는일 표준 태그
 * @property {string[]} interestTags // 관심사 표준 태그
 * @property {string[]} wishTags  // 희망사항 표준 태그
 */
```

### 8.2 그래프 노드 (`GraphNode`)

```js
/**
 * @typedef {Object} GraphNode
 * @property {number} id          // = member.id
 * @property {string} name        // 라벨
 * @property {number} val         // 노드 크기 = √age · k
 * @property {boolean} isHub       // true → 유광명(중심 고정)
 * @property {number=} fx,fy,fz   // 허브일 때 0 (중심 고정)
 * @property {NormalizedMember} member // 상세 패널용 원본 참조
 */
```

### 8.3 그래프 엣지 (`GraphLink`)

```js
/**
 * @typedef {Object} GraphLink
 * @property {number} source       // 노드 id
 * @property {number} target       // 노드 id
 * @property {"hub"|"affiliation"|"interest"} type
 * @property {number} weight       // hub: 2026-sinceYear / 그 외: 공유 키 개수
 * @property {string[]=} shared    // 공유 소속 또는 공유 태그
 */
```

### 8.4 3d-force-graph 설정 예시

```js
// js/render.js
const Graph = ForceGraph3D()(document.getElementById("graph"))
  .graphData({ nodes, links })
  .nodeId("id")
  .nodeLabel(n => n.name)                    // 호버 라벨
  .nodeVal(n => n.val)                        // 크기 = √age
  .nodeColor(n => n.isHub ? CSS_VAR("--color-primary") : CSS_VAR("--color-ink"))
  .linkWidth(l => l.type === "hub" ? Math.sqrt(l.weight) : 1)
  .linkColor(l => EDGE_COLORS[l.type])        // 소속/관심사/허브 구분
  .onNodeClick(n => selectNode(n.id))         // 좌측 패널 갱신
  .enableNodeDrag(true);

// 유광명 중심 고정
const hub = nodes.find(n => n.isHub);
hub.fx = 0; hub.fy = 0; hub.fz = 0;

// 자동 회전(기본 on) — 우측 패널 토글로 제어
let rotate = true;
(function spin() {
  if (rotate) Graph.scene().rotation.y += 0.001;
  requestAnimationFrame(spin);
})();
```

### 8.5 CSV fetch + 폴백 스니펫

```js
// js/data.js
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1fychV7omFIle0GpBAF2_ccAyF0cZAtY7IFsmkIS5sic/gviz/tq?tqx=out:csv&gid=0";

async function loadData() {
  try {
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { rows: parseCsv(await res.text()), source: "live" };
  } catch (e) {
    console.warn("[NODE] live fetch 실패, 스냅샷 폴백:", e);
    const res = await fetch("data/snapshot.csv");   // 동봉 스냅샷
    return { rows: parseCsv(await res.text()), source: "snapshot" };
  }
}

function parseCsv(text) {
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}
```

---

## 9. UI/UX 요구사항

### 9.1 레이아웃 와이어프레임 (데스크톱 3분할)

```
┌──────────────────────────────────────────────────────────┐
│ HEADER  ● NODE — Network Of Domain Experts   33 nodes  [Live] │
├───────────────┬──────────────────────────┬───────────────┤
│ 좌측 상세 패널 │       중앙 구형 그래프      │ 우측 설정 패널 │
│ (노드 선택 시) │   (반투명 글로브 + 노드망)   │ 라벨 ☑ 이름   │
│  이름/닉네임   │      회전·줌·드래그        │      ☐ 나이   │
│  협업시점/나이 │                          │ 엣지 ☑ 소속   │
│  현직장/과거경력│      ◯ 유광명(중심 고정)    │      ☑ 관심사 │
│  하는일/관심사 │                          │ 회전 ☑ / 줌리셋│
│  희망사항(칩)  │                          │               │
├───────────────┴──────────────────────────┴───────────────┤
│ FOOTER  출처: Google Sheet · 운영자: 유광명 · 갱신: 2026-06   │
└──────────────────────────────────────────────────────────┘
```

- **헤더**: 브랜딩(로고 점은 `{colors.primary}`), 노드 카운트, 데이터 출처 배지(Live/Snapshot).
- **푸터**: 출처·운영자·갱신 정보.
- **중앙**: 메인 캔버스(가장 넓게). 좁은 화면에서 패널은 접힘/스택.

### 9.2 DESIGN.md 토큰 매핑

| 용도 | 토큰 | 값 |
|---|---|---|
| 페이지 배경 | `{colors.canvas}` | `#101010` |
| 패널/카드 표면 | `{colors.canvas-soft}` | `#1a1a1a` |
| 액센트(로고/라이브/허브 노드) | `{colors.primary}` | `#00d992` |
| 카드 보더(그림자 대신) | `{colors.hairline}` | `#3d3a39` |
| 기본 텍스트 | `{colors.ink}` / `{colors.body}` | `#f2f2f2` / `#bdbdbd` |
| 보조 텍스트 | `{colors.mute}` | `#8b949e` |
| 헤더 타이틀 | `{typography.display-md}` | 24/700 |
| 섹션 eyebrow(대문자) | `{typography.eyebrow-mono}` | 14/600/tracking 2.52 |
| 본문/라벨 | `{typography.body-sm}` | 14/400 |
| 버튼 라운드 | `{rounded.sm}` | 6px |
| 카드/패널 라운드 | `{rounded.md}` | 8px |
| 태그 칩 라운드 | `{rounded.pill}` | 9999px |

> **금지**: 인라인 hex/px 신규 도입 금지(토큰을 CSS 변수로 매핑해 참조), 라이트 모드 없음, 드롭섀도 없음(하어라인+글로우만), 본문에 그린 사용 금지.

### 9.3 반응형 전략

- **≥1024px**: 좌·중·우 3분할(예: `280px / 1fr / 280px`).
- **640–1023px**: 좌측 패널은 노드 클릭 시 오버레이/드로어, 우측 설정은 상단 접이식 바.
- **<640px**: 그래프 전체 폭, 패널은 하단 시트로 스택. 그래프 회전·줌은 터치로 유지.

---

## 10. 제약 사항 및 가정

- 백엔드·DB·서버 사이드 로직 없음(순수 정적). 모든 처리는 클라이언트.
- 데이터는 **공개 구글시트**에 의존. 시트가 비공개로 바뀌면 fetch 실패 → 스냅샷 폴백으로 동작(스냅샷은 그 시점 데이터).
- 폴백 스냅샷(`data/snapshot.csv`)은 **수동 갱신**(주기적으로 시트에서 내보내 커밋).
- CDN(3d-force-graph/Three.js/PapaParse) 가용성에 의존.
- 현재 33명 기준으로 성능·레이아웃을 설계하되, 수백 명 규모는 Post-MVP에서 LOD/클러스터링으로 대응.
- `협업 시점` 상한 기준 연도는 2026으로 고정(엣지 굵기 산식). 연도 가정은 상수로 분리해 갱신 가능.

---

## 11. 성공 지표 (MVP)

| 항목 | 목표 |
|---|---|
| 데이터 로드 | 구글시트에서 전 구성원(현재 33명) 노드가 렌더링됨 |
| 폴백 동작 | 시트 fetch 차단 시 `data/snapshot.csv`로 그래프가 정상 렌더(배지 "Snapshot") |
| 허브 고정 | 유광명 노드가 중심에 고정되고 전원과 1차 연결됨 |
| 관계 추론 정확도 | 검증용 공유 허브(지아이비타·마키나락스·PwC·포스코이엔씨·한국전력공사) 군집이 소속 엣지로 표시됨 |
| 헤어볼 방지 | 관심사 엣지가 임계값(태그 2개 이상)으로 제한되어 시각적으로 식별 가능한 수준 유지 |
| 인터랙션 | 회전·줌·노드 클릭→좌측 상세 갱신, 우측 토글이 즉시 반영됨 |
| 성능 | 인터랙션 시 체감 60fps, 초기 렌더 3초 이내 |
| 디자인 일관성 | 모든 UI가 DESIGN.md 토큰만 사용(인라인 hex 신규 0건) |
| 배포 | GitHub Pages 루트에서 빌드 없이 정상 동작 |

---

## 12. 향후 계획 (Post-MVP)

의도적으로 MVP에서 제외한 항목과 사유:

- [ ] **검색/필터** — 이름·소속·관심사로 노드 검색(MVP는 시각 탐색에 집중)
- [ ] **설정 영속화** — 우측 패널 상태를 localStorage에 저장(MVP는 런타임 메모리)
- [ ] **스냅샷 자동화** — GitHub Action으로 시트→`data/snapshot.csv` 주기 동기화(MVP는 수동)
- [ ] **대규모 대응** — 수백 노드 시 LOD·클러스터링·엣지 번들링(MVP는 33명 규모)
- [ ] **관계 가중 튜닝 UI** — 관심사 임계값·엣지 색을 사용자가 조정(MVP는 상수 고정)
- [ ] **노드 상세 딥링크** — URL 파라미터로 특정 노드 선택 상태 공유(MVP는 미지원)
```
