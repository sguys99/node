# NODE Command HUD 리디자인 Implementation Plan

> **For agentic workers:** 이 계획은 동일 세션에서 인라인으로 실행한다(superpowers 실행 스킬 미설치). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [스펙](../specs/2026-10-07-hud-redesign-design.md)대로 NODE 대시보드를 Command HUD(풀블리드 그래프 + HUD 패널 + 레이더 원반 레이아웃 + Blip 노드)로 개편하고 검색·연결 탐색·인트로·OG 갱신을 추가한다.

**Architecture:** 순수 로직(레이아웃 반경·클러스터·통계·라벨 배치·검색 매칭)은 import 없는 모듈로 분리해 `node --test`로 TDD 한다. Three.js 의존 시각 모듈(scene/nodes/render)은 헤드리스 Chromium 스크린샷 + 콘솔 에러 0으로 검증한다. 기존 controller API는 유지하고 `focusNode`·`playIntro`를 추가한다.

**Tech Stack:** HTML/CSS/바닐라 ES Modules, three@0.180.0 · 3d-force-graph@1.73.4 · d3-force-3d@3(esm.sh), PapaParse, Node 22 내장 테스트 러너(`node --test`, package.json 없음), Playwright(스크래치 패드에만 설치 — 리포에 추가 금지).

## Global Constraints

- 제로빌드: 빌드 스텝·프레임워크·npm 보일러플레이트(package.json 등) 재도입 금지. 테스트는 `node --test tests/`로 무설정 실행.
- 색/타이포/스페이싱은 `css/tokens.css` 변수만 참조 — styles.css·JS에 신규 인라인 hex 금지(그래프 색은 CSS 변수 read).
- 라이트 모드 없음, 드롭섀도 금지(하어라인+글로우만).
- 액센트 그린(`--color-primary`)은 본문 텍스트 금지. 저채도 HUD 잉크(`--hud-ink`·`--hud-dim`)는 허용.
- 한글은 Noto Sans KR, UI 크롬 Latin은 JetBrains Mono. 우측 설정 패널 항목은 영어.
- 허브(유광명, id 1) `fx=fy=fz=0` 중심 고정 유지. BASE_YEAR(2026)는 `normalize.js` SSOT 재사용.
- 관계 검증 군집(지아이비타·마키나락스·PwC·포스코이엔씨·한국전력공사)은 소속 엣지로 유지.
- `prefers-reduced-motion: reduce` → 인트로·스윕·위성 공전 생략.
- 커밋 메시지: 이모지 + 한글 설명, 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Structure

| 파일 | 상태 | 책임 |
| --- | --- | --- |
| `js/layout.js` | Create | 순수: `yearsKnown`, `orbitRadius`, `RING_YEARS`, `ORBIT` 상수 |
| `js/graph.js` | Modify | `findClusters(graph)` 추가 |
| `js/stats.js` | Create | 순수: `computeStats(graph, clusters)` |
| `js/labels.js` | Create | 순수: `labelLines`, `placeLabels`, `createDeclutter` |
| `js/search.js` | Create | 순수 `matchMembers` + DOM `initSearch` |
| `js/camera.js` | Create | `homePosition`, `flyTo`, `playIntro`, `freezeLayout` (THREE 비의존) |
| `js/scene.js` | Create | 배경·레이더 그리드·스윕·연차 눈금·라이트·블룸·색공간 |
| `js/nodes.js` | Create | Blip/허브 객체 팩토리, 라벨 div, 선택 레티클 |
| `js/render.js` | Rewrite | ForceGraph3D 구성·force·엣지·선택·controller |
| `js/panels.js` | Rewrite | KPI·요약·상세(연결 탐색)·설정·상태줄·검색 연결 |
| `js/main.js` | Modify | 로딩 HUD, 클러스터/통계 산출, 인트로 호출, WebGL 예외 |
| `index.html` | Rewrite | 새 마크업(헤더 검색·KPI·패널·상태줄·로딩 HUD) |
| `css/tokens.css` | Modify | HUD 토큰 추가 |
| `css/styles.css` | Rewrite | HUD 스타일·반응형 |
| `tests/*.test.js` | Create | 순수 모듈 단위 테스트 |
| `assets/og/og-image.html` · `og-image.png` | Rewrite | HUD 공유 카드 |
| `CLAUDE.md` · `DESIGN.md` · `README.md` · `docs/plan.md` | Modify | 규칙·구조·Phase 8 반영 |

검증 스크립트(스크래치 패드, 리포 밖): `shot.js <url> <out.png> [w] [h] [waitMs] [action]` — Playwright chromium(`--use-angle=swiftshader`), 콘솔 error/warning·pageerror 출력.

---

### Task 1: 순수 레이아웃·클러스터·통계 모듈 (TDD)

**Files:**
- Create: `js/layout.js`, `js/stats.js`, `tests/layout.test.js`, `tests/graph.test.js`, `tests/stats.test.js`
- Modify: `js/graph.js` (파일 끝에 `findClusters` 추가)

**Interfaces:**
- Produces:
  - `yearsKnown(sinceYear: number, baseYear = BASE_YEAR): number` — `max(1, baseYear - sinceYear)`, 비유한수 → 1
  - `orbitRadius(w: number): number` — `ORBIT.R_MIN + (ORBIT.R_MAX - ORBIT.R_MIN) * (1 - ln(clamp(w,1,W_MAX))/ln(W_MAX))`
  - `ORBIT = { R_MIN: 64, R_MAX: 280, W_MAX: 30 }`, `RING_YEARS = [2024, 2020, 2010, 2000]`
  - `findClusters(graph): { list: Array<{id:number, name:string, size:number, memberIds:number[]}>, byNode: Map<number, {id:number, name:string, size:number}> }` — 소속+협업 연결요소(허브 제외, 크기≥2), size 내림차순, 동률은 최소 memberId 오름차순. `name` = 구성원 표시 조직(현직장∪과거경력, 멤버당 중복 제거, `자영업`·`프리랜서` 제외) 최빈값, 동률은 `localeCompare` 오름차순.
  - `computeStats(graph, clusters): { members, clusters, links:{hub,affiliation,interest,collaboration}, avgCareer, oldestSince, longestBond, topOrgs:Array<{name,count}>, decades:Array<{label:string,count:number}> }` — 허브 제외 집계. `topOrgs` 상위 5(동률 이름순). `decades`는 최소~최대 연대 연속 구간(`"1990"`…).

- [ ] **Step 1: 실패 테스트 작성** — `tests/layout.test.js`

```js
import test from "node:test";
import assert from "node:assert/strict";
import { yearsKnown, orbitRadius, ORBIT, RING_YEARS } from "../js/layout.js";

test("yearsKnown: 기준연도 차이, 최소 1", () => {
  assert.equal(yearsKnown(2020, 2026), 6);
  assert.equal(yearsKnown(2026, 2026), 1);
  assert.equal(yearsKnown(2030, 2026), 1);
  assert.equal(yearsKnown(NaN, 2026), 1);
});

test("orbitRadius: 오래 알수록 중심에 가깝고 단조 감소", () => {
  assert.equal(orbitRadius(1), ORBIT.R_MAX);
  assert.equal(orbitRadius(ORBIT.W_MAX), ORBIT.R_MIN);
  assert.equal(orbitRadius(999), ORBIT.R_MIN);
  assert.ok(orbitRadius(2) > orbitRadius(6));
  assert.ok(orbitRadius(6) > orbitRadius(16));
});

test("RING_YEARS: 최근→과거 순", () => {
  assert.deepEqual(RING_YEARS, [2024, 2020, 2010, 2000]);
});
```

`tests/graph.test.js`

```js
import test from "node:test";
import assert from "node:assert/strict";
import { findClusters } from "../js/graph.js";

const m = (id, company, pastOrgs = []) => ({ id, name: `n${id}`, company, pastOrgs });
const node = (mem) => ({ id: mem.id, isHub: mem.id === 1, member: mem });

test("findClusters: 소속+협업 연결요소, 허브·단독 제외, 크기순", () => {
  const members = [m(1, "자영업"), m(2, "A사"), m(3, "A사"), m(4, "B사", ["A사"]), m(5, "C사"), m(6, "C사"), m(7, "D사")];
  const graph = {
    nodes: members.map(node),
    links: [
      { source: 1, target: 2, type: "hub" },
      { source: 2, target: 3, type: "affiliation" },
      { source: 3, target: 4, type: "collaboration" },
      { source: 5, target: 6, type: "affiliation" },
      { source: 6, target: 7, type: "interest" },
    ],
  };
  const { list, byNode } = findClusters(graph);
  assert.equal(list.length, 2);
  assert.deepEqual(list[0].memberIds, [2, 3, 4]);
  assert.equal(list[0].name, "A사");
  assert.equal(list[1].name, "C사");
  assert.equal(byNode.get(4).id, 0);
  assert.equal(byNode.has(1), false);
  assert.equal(byNode.has(7), false);
});

test("findClusters: link 끝점이 객체여도 동작", () => {
  const members = [m(1, "자영업"), m(2, "A사"), m(3, "A사")];
  const nodes = members.map(node);
  const graph = { nodes, links: [{ source: nodes[1], target: nodes[2], type: "affiliation" }] };
  assert.equal(findClusters(graph).list[0].size, 2);
});
```

`tests/stats.test.js`

```js
import test from "node:test";
import assert from "node:assert/strict";
import { computeStats } from "../js/stats.js";

const mem = (id, career, sinceYear, company, pastOrgs = []) => ({ id, career, sinceYear, company, pastOrgs });
const graph = {
  nodes: [
    { id: 1, isHub: true, member: mem(1, 21, 1980, "자영업", ["X"]) },
    { id: 2, isHub: false, member: mem(2, 10, 1999, "A사", ["B사"]) },
    { id: 3, isHub: false, member: mem(3, 20, 2024, "A사", ["A사"]) },
    { id: 4, isHub: false, member: mem(4, 31, 2008, "프리랜서", ["B사"]) },
  ],
  links: [
    { source: 1, target: 2, type: "hub" }, { source: 1, target: 3, type: "hub" }, { source: 1, target: 4, type: "hub" },
    { source: 2, target: 3, type: "affiliation" }, { source: 3, target: 4, type: "collaboration" },
  ],
};

test("computeStats: 허브 제외 집계", () => {
  const s = computeStats(graph, { list: [{ id: 0 }] });
  assert.equal(s.members, 3);
  assert.equal(s.clusters, 1);
  assert.deepEqual(s.links, { hub: 3, affiliation: 1, interest: 0, collaboration: 1 });
  assert.equal(s.avgCareer, 20);
  assert.equal(s.oldestSince, 1999);
  assert.equal(s.longestBond, 27);
  assert.deepEqual(s.topOrgs, [{ name: "A사", count: 2 }, { name: "B사", count: 2 }]);
  assert.deepEqual(s.decades, [
    { label: "1990", count: 1 }, { label: "2000", count: 1 }, { label: "2010", count: 0 }, { label: "2020", count: 1 },
  ]);
});
```

- [ ] **Step 2: 실패 확인** — Run: `node --test tests/` → Expected: FAIL (`Cannot find module .../js/layout.js`, `findClusters` not exported, `stats.js` 없음)

- [ ] **Step 3: 구현**

`js/layout.js`

```js
// layout.js — 원반(레이더) 레이아웃 순수 계산. THREE/DOM 비의존(node --test 대상).
import { BASE_YEAR } from "./normalize.js";

export const ORBIT = { R_MIN: 64, R_MAX: 280, W_MAX: 30 };
export const RING_YEARS = [2024, 2020, 2010, 2000];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function yearsKnown(sinceYear, baseYear = BASE_YEAR) {
  if (!Number.isFinite(sinceYear)) return 1;
  return Math.max(1, baseYear - sinceYear);
}

export function orbitRadius(w) {
  const t = Math.log(clamp(w, 1, ORBIT.W_MAX)) / Math.log(ORBIT.W_MAX);
  return ORBIT.R_MIN + (ORBIT.R_MAX - ORBIT.R_MIN) * (1 - t);
}
```

`js/graph.js` 끝에 추가

```js
const NON_ORG_DISPLAY = new Set(["자영업", "프리랜서"]);

export function findClusters(graph) {
  const id = (e) => (typeof e === "object" && e !== null ? e.id : e);
  const hubIds = new Set(graph.nodes.filter((n) => n.isHub).map((n) => n.id));
  const parent = new Map(graph.nodes.map((n) => [n.id, n.id]));
  const find = (x) => {
    while (parent.get(x) !== x) x = parent.get(x);
    return x;
  };
  for (const l of graph.links) {
    if (l.type !== "affiliation" && l.type !== "collaboration") continue;
    const s = id(l.source), t = id(l.target);
    if (hubIds.has(s) || hubIds.has(t)) continue;
    const rs = find(s), rt = find(t);
    if (rs !== rt) parent.set(Math.max(rs, rt), Math.min(rs, rt));
  }
  const groups = new Map();
  for (const n of graph.nodes) {
    if (hubIds.has(n.id)) continue;
    const r = find(n.id);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(n);
  }
  const list = [...groups.values()]
    .filter((g) => g.length > 1)
    .map((g) => g.sort((a, b) => a.id - b.id))
    .sort((a, b) => b.length - a.length || a[0].id - b[0].id)
    .map((g, i) => ({ id: i, name: topOrgName(g), size: g.length, memberIds: g.map((n) => n.id) }));
  const byNode = new Map();
  for (const c of list) for (const mid of c.memberIds) byNode.set(mid, { id: c.id, name: c.name, size: c.size });
  return { list, byNode };
}

function topOrgName(nodes) {
  const freq = new Map();
  for (const n of nodes) {
    const m = n.member || {};
    for (const org of new Set([m.company, ...(m.pastOrgs || [])])) {
      if (!org || NON_ORG_DISPLAY.has(org)) continue;
      freq.set(org, (freq.get(org) || 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? "Cluster";
}
```

`js/stats.js`

```js
// stats.js — KPI·네트워크 요약 패널용 순수 집계. THREE/DOM 비의존.
import { BASE_YEAR } from "./normalize.js";

const NON_ORG_DISPLAY = new Set(["자영업", "프리랜서"]);
const TOP_ORGS = 5;

export function computeStats(graph, clusters) {
  const others = graph.nodes.filter((n) => !n.isHub).map((n) => n.member);
  const links = { hub: 0, affiliation: 0, interest: 0, collaboration: 0 };
  for (const l of graph.links) if (l.type in links) links[l.type]++;

  const careers = others.map((m) => m.career).filter(Number.isFinite);
  const avgCareer = careers.length ? Math.round(careers.reduce((a, b) => a + b, 0) / careers.length) : 0;
  const years = others.map((m) => m.sinceYear).filter(Number.isFinite);
  const oldestSince = years.length ? Math.min(...years) : BASE_YEAR;

  const freq = new Map();
  for (const m of others) {
    for (const org of new Set([m.company, ...(m.pastOrgs || [])])) {
      if (!org || NON_ORG_DISPLAY.has(org)) continue;
      freq.set(org, (freq.get(org) || 0) + 1);
    }
  }
  const topOrgs = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_ORGS)
    .map(([name, count]) => ({ name, count }));

  const decades = [];
  if (years.length) {
    const lo = Math.floor(Math.min(...years) / 10) * 10;
    const hi = Math.floor(Math.max(...years) / 10) * 10;
    for (let d = lo; d <= hi; d += 10) {
      decades.push({ label: String(d), count: years.filter((y) => Math.floor(y / 10) * 10 === d).length });
    }
  }

  return {
    members: others.length,
    clusters: clusters.list.length,
    links,
    avgCareer,
    oldestSince,
    longestBond: BASE_YEAR - oldestSince,
    topOrgs,
    decades,
  };
}
```

- [ ] **Step 4: 통과 확인** — Run: `node --test tests/` → Expected: 전부 PASS
- [ ] **Step 5: 커밋** — `git add js/layout.js js/stats.js js/graph.js tests/ && git commit -m ":white_check_mark: HUD 레이아웃·클러스터·통계 순수 모듈 + 단위 테스트"`

---

### Task 2: 라벨 문구·배치(declutter) 순수 모듈 (TDD)

**Files:** Create `js/labels.js`, `tests/labels.test.js`

**Interfaces:**
- Produces:
  - `labelLines(member, fields, isHub): { main: string, sub: string|null }` — `fields = {name, career, nickname, interest, affiliation}`(bool). main = 이름(허브는 항상, 일반은 `fields.name`일 때, 아니면 ""). sub = 선택 필드 순서 `affiliation(현직장, 자영업/프리랜서면 과거경력[0])`, `career(`${career}Y`)`, `nickname`, `interest(상위 2개 " · ")`를 `" · "`로 연결, 허브는 sub 없음(null), 비면 null.
  - `placeLabels(items, gap = {x: 6, y: 2}): Set<id>` — items `{id, x, y, w, h, pri, off}` (x,y = 좌상단 px). `off` 제외, pri 내림차순 greedy, 기존 배치와 gap 포함 겹치면 숨김.
  - `createDeclutter({ items: () => Item[], apply: (visibleIds:Set) => void, every = 6 }): { tick(): void, force(): void }` — `tick`은 every 프레임마다, `force`는 즉시 실행.

- [ ] **Step 1: 실패 테스트** — `tests/labels.test.js`

```js
import test from "node:test";
import assert from "node:assert/strict";
import { labelLines, placeLabels, createDeclutter } from "../js/labels.js";

const member = { name: "김규연", nickname: "Kyu", career: 7, company: "삼성전자", pastOrgs: ["마키나락스"], interestTags: ["투자", "AI", "LLM"] };
const F = (o = {}) => ({ name: true, career: false, nickname: false, interest: false, affiliation: false, ...o });

test("labelLines: 이름만", () => {
  assert.deepEqual(labelLines(member, F(), false), { main: "김규연", sub: null });
});
test("labelLines: 보조 줄 순서 org · career · nick · interest", () => {
  const r = labelLines(member, F({ affiliation: true, career: true, nickname: true, interest: true }), false);
  assert.equal(r.sub, "삼성전자 · 7Y · Kyu · 투자 · AI");
});
test("labelLines: 자영업이면 과거경력 첫 값", () => {
  assert.equal(labelLines({ ...member, company: "자영업" }, F({ affiliation: true }), false).sub, "마키나락스");
});
test("labelLines: 허브는 이름 강제·보조 줄 없음", () => {
  assert.deepEqual(labelLines(member, F({ name: false, career: true }), true), { main: "김규연", sub: null });
});
test("labelLines: 이름 끔 + 필드 없음 → 빈 라벨", () => {
  assert.deepEqual(labelLines(member, F({ name: false }), false), { main: "", sub: null });
});

test("placeLabels: 우선순위 높은 라벨이 이김", () => {
  const vis = placeLabels([
    { id: "a", x: 0, y: 0, w: 50, h: 16, pri: 1 },
    { id: "b", x: 10, y: 4, w: 50, h: 16, pri: 5 },
    { id: "c", x: 200, y: 0, w: 50, h: 16, pri: 0 },
  ]);
  assert.deepEqual([...vis].sort(), ["b", "c"]);
});
test("placeLabels: gap 이내 근접도 충돌, off 제외", () => {
  const vis = placeLabels([
    { id: "a", x: 0, y: 0, w: 50, h: 16, pri: 2 },
    { id: "b", x: 54, y: 0, w: 50, h: 16, pri: 1 },
    { id: "c", x: 500, y: 0, w: 50, h: 16, pri: 9, off: true },
  ]);
  assert.deepEqual([...vis], ["a"]);
});

test("createDeclutter: every 프레임마다 apply", () => {
  let calls = 0;
  const d = createDeclutter({ items: () => [], apply: () => calls++, every: 3 });
  for (let i = 0; i < 7; i++) d.tick();
  assert.equal(calls, 3);
  d.force();
  assert.equal(calls, 4);
});
```

- [ ] **Step 2: 실패 확인** — `node --test tests/labels.test.js` → FAIL (모듈 없음)
- [ ] **Step 3: 구현** — `js/labels.js`

```js
// labels.js — 그래프 라벨 문구 구성 + 화면 충돌 기반 배치(declutter). THREE/DOM 비의존.
const NON_ORG_DISPLAY = new Set(["자영업", "프리랜서"]);
const INTEREST_MAX = 2;

export function labelLines(member, fields, isHub) {
  const m = member || {};
  const main = isHub || fields.name ? (m.name ?? "") : "";
  if (isHub) return { main, sub: null };
  const parts = [];
  if (fields.affiliation) {
    const org = m.company && !NON_ORG_DISPLAY.has(m.company) ? m.company : m.pastOrgs?.[0];
    if (org) parts.push(org);
  }
  if (fields.career && Number.isFinite(m.career)) parts.push(`${m.career}Y`);
  if (fields.nickname && m.nickname) parts.push(m.nickname);
  if (fields.interest && m.interestTags?.length) parts.push(m.interestTags.slice(0, INTEREST_MAX).join(" · "));
  return { main, sub: parts.length ? parts.join(" · ") : null };
}

export function placeLabels(items, gap = { x: 6, y: 2 }) {
  const placed = [];
  const visible = new Set();
  const sorted = items.filter((it) => !it.off).sort((a, b) => b.pri - a.pri);
  for (const it of sorted) {
    const hit = placed.some(
      (p) => it.x < p.x + p.w + gap.x && it.x + it.w + gap.x > p.x && it.y < p.y + p.h + gap.y && it.y + it.h + gap.y > p.y
    );
    if (hit) continue;
    placed.push(it);
    visible.add(it.id);
  }
  return visible;
}

export function createDeclutter({ items, apply, every = 6 }) {
  let frame = 0;
  const run = () => apply(placeLabels(items()));
  return {
    tick() {
      if (frame++ % every === 0) run();
    },
    force: run,
  };
}
```

- [ ] **Step 4: 통과 확인** — `node --test tests/` → PASS
- [ ] **Step 5: 커밋** — `:white_check_mark: 그래프 라벨 문구·충돌 배치 순수 모듈 + 테스트`

---

### Task 3: 검색 매칭 (TDD) + DOM 바인딩

**Files:** Create `js/search.js`, `tests/search.test.js`

**Interfaces:**
- Produces:
  - `matchMembers(nodes, query, limit = 8): Array<{ node, field: "name"|"nickname"|"org", text: string }>` — trim·소문자 비교, 빈 쿼리 → []. 점수: 이름 startsWith 0 < 이름 includes 1 < 닉네임 includes 2 < 조직(현직장·과거경력) includes 3. 동점은 이름 `localeCompare`. `text`는 매칭된 필드 표시값(org는 매칭된 조직명, 그 외는 현직장).
  - `initSearch({ input, list, nodes, onPick }): { focus(): void, close(): void }` — 입력마다 결과 렌더(`li[role=option]`, 이름 + 보조 텍스트), ↑↓ 하이라이트(`aria-activedescendant`), Enter/클릭 → `onPick(node)` 후 입력 비우고 닫기, Esc 닫기, 결과 없음 → `No match` 행(선택 불가). 전역 ⌘K/Ctrl+K·`/`(입력 포커스 아닐 때) → focus.

- [ ] **Step 1: 실패 테스트** — `tests/search.test.js`

```js
import test from "node:test";
import assert from "node:assert/strict";
import { matchMembers } from "../js/search.js";

const n = (id, name, nickname, company, pastOrgs = []) => ({ id, member: { name, nickname, company, pastOrgs } });
const nodes = [n(1, "유광명", "건호아범", "자영업", ["PwC"]), n(2, "김규연", "", "삼성전자", ["마키나락스"]), n(3, "이규", "Dean", "딥세일즈"), n(4, "박지호", "", "PwC")];

test("빈 쿼리는 결과 없음", () => {
  assert.deepEqual(matchMembers(nodes, "  "), []);
});
test("이름 접두 > 이름 포함", () => {
  const r = matchMembers(nodes, "이규");
  assert.equal(r[0].node.id, 3);
});
test("조직 매칭은 field=org, text=조직명, 대소문자 무시, 동점은 이름순", () => {
  const r = matchMembers(nodes, "pwc");
  assert.deepEqual(r.map((x) => [x.node.id, x.field, x.text]), [[4, "org", "PwC"], [1, "org", "PwC"]]);
});
test("닉네임 매칭", () => {
  assert.equal(matchMembers(nodes, "dean")[0].field, "nickname");
});
test("limit 적용", () => {
  assert.equal(matchMembers(nodes, "pwc", 1).length, 1);
});
```

- [ ] **Step 2: 실패 확인** — FAIL (모듈 없음)
- [ ] **Step 3: 구현** — `js/search.js` (matchMembers는 위 규칙대로; initSearch는 DOM 전용, 모듈 최상위에서 document 접근 금지)
- [ ] **Step 4: 통과 확인** — `node --test tests/` → PASS
- [ ] **Step 5: 커밋** — `:sparkles: 검색 매칭 모듈 + 테스트`

---

### Task 4: HUD 토큰 · 마크업 · 스타일(크롬)

**Files:** Modify `css/tokens.css`; Rewrite `index.html`, `css/styles.css`

**Interfaces:**
- Produces(DOM id — Task 7이 사용): `#graph`, `#search-input`, `#search-list`, `#search-toggle`, `#data-source-badge`, `#node-count`, `#kpis`, `#detail-panel`, `#detail-body`, `#settings-panel`, `#settings-handle`, `#zoom-reset`, `#status-src`, `#status-sync`, `#loading-hud`, `#error-ui`, `#error-msg`, `#retry-btn`. 라벨 토글 `button[data-label]`(aria-pressed), 관계 토글 `button[data-edge]`(aria-pressed) 내부 `em[data-count]`.
- 토큰(추가): `--hud-canvas #070a09`, `--hud-canvas-glow #0f1a14`, `--hud-grid #1f6b4f`, `--hud-grid-soft #123d2e`, `--hud-ink #d7f5e8`, `--hud-dim #4f8f74`, `--hud-faint #2f5c49`, `--hud-frame rgba(0,217,146,.22)`, `--hud-panel rgba(5,10,8,.72)`, `--hud-cell rgba(5,10,8,.95)`, `--hud-blip #5fcf9f`, `--hud-scan rgba(255,255,255,.018)`, `--radius-hud 2px`, `--font-hud "JetBrains Mono","Noto Sans KR",ui-monospace,monospace`, `--graph-collaboration #ffd65a`.

- [ ] **Step 1:** tokens.css에 HUD 토큰 블록 추가(주석으로 규칙 변경 명시), Google Fonts에 JetBrains Mono 추가.
- [ ] **Step 2:** index.html 재작성 — 헤더(브랜드·검색·배지·카운트·GitHub), KPI, 좌 패널(`#detail-body`), 우 패널(Labels 5 버튼: Name/Org/Career/Nick/Interests, Relations 4 버튼: Affiliation/Collaboration/Interest/Hub, Reset view, 모바일 핸들), 상태줄, 로딩 HUD, 에러 UI. OG/Twitter 메타 유지.
- [ ] **Step 3:** styles.css 재작성 — 풀블리드 그리드 대신 fixed 오버레이 레이아웃, HUD 프레임(코너 브래킷 ::before/::after), 스캔라인 body::after, 그래프 라벨(.graph-label .main/.sub, .is-hub, .is-culled, .is-dim, .is-hover), 레티클(.reticle), 링 태그(.ring-tag), 반응형 3구간.
- [ ] **Step 4: 검증** — 정적 서버에서 `shot.js` 1440×900 캡처 → 크롬 렌더 확인(그래프는 아직 구버전 렌더러이므로 레이아웃만 확인), 콘솔 에러 0. `grep -nE "#[0-9a-fA-F]{3,6}" css/styles.css` → 0건.
- [ ] **Step 5: 커밋** — `:lipstick: HUD 토큰·마크업·스타일 개편`

---

### Task 5: 3D 장면·노드·렌더러 재작성

**Files:** Create `js/scene.js`, `js/nodes.js`, `js/camera.js`; Rewrite `js/render.js`

**Interfaces:**
- Consumes: `orbitRadius`, `yearsKnown`, `RING_YEARS`(layout.js), `labelLines`, `createDeclutter`(labels.js)
- Produces:
  - `scene.js`: `dressScene(graph3d, { colors, reducedMotion }) → { tick(t: number): void }` — scene.background 캔버스 텍스처(`NoColorSpace` 아님: sRGB 출력 수정 후 `SRGBColorSpace`), PolarGridHelper(반경 `orbitRadius(1)+20`, 12섹터), 연차 눈금 CSS2D(`.ring-tag`, `NNY`), 스윕(18s/회전), DirectionalLight, UnrealBloomPass(strength .18 / radius .25 / threshold .85) + OutputPass, `renderer.outputColorSpace = SRGBColorSpace`.
  - `nodes.js`: `createNodeFactory({ colors, reducedMotion, radius: (node) => number }) → { build(node): THREE.Object3D, setActive(id, on): void, setHover(id, on): void, labelDiv(id): HTMLElement|undefined, renderLabel(node, fields): void, tick(t): void, reticle: CSS2DObject }`
  - `camera.js`: `homePosition(nodes, { aspect, fov, widthFraction }) → {x,y,z}`, `flyTo(graph3d, node, { distance = 190, ms = 900 })`, `freezeLayout(nodes)`, `playIntro(graph3d, nodes, { ms = 1600 }) → Promise<void>`
  - `render.js`: `render(graph, { container, clusters }) → controller` with `setLabelFields(field, on)`, `setLinkTypeVisibility(type, on)`, `highlightNode(node|null)`, `focusNode(id)`, `resetView(ms = 800)`, `playIntro(): Promise<void>`, `onSelect: null|((node|null) => void)`.
- 동작: force = link(허브 strength 0, 소속/협업 distance 28 strength .3, 관심사 .02) + radial(orbitRadius(yearsKnown)) strength .9 + forceY(0) .18 + charge -35, `warmupTicks(300)`, `enableNodeDrag(false)`, `showNavInfo(false)`. 엣지 Normal 블렌딩 머티리얼(type별 1개 공유 + dim용 별도 재질 없이 opacity만 토글), 허브 엣지 `LineDashedMaterial`(computeLineDistances). 파티클 = 선택 노드 incident 소속/협업만 2개.

- [ ] **Step 1:** camera.js/scene.js/nodes.js 작성(프로토타입 `proto-render.js`의 blip·hub·polar·sweep 코드를 토큰 read 방식으로 이식).
- [ ] **Step 2:** render.js 재작성(위 인터페이스).
- [ ] **Step 3: 검증** — `node --test tests/` PASS 유지, `shot.js` 1440×900 → 원반·Blip·레이더·라벨 정리 확인, 콘솔 에러 0. 소속 엣지 수 70·협업 21 로그 확인.
- [ ] **Step 4: 커밋** — `:sparkles: Command HUD 그래프 — 레이더 원반 레이아웃·Blip 노드·라벨 정리`

---

### Task 6: 패널·KPI·상태줄·검색·연결 탐색·인트로 연결

**Files:** Rewrite `js/panels.js`; Modify `js/main.js`

**Interfaces:**
- Consumes: `controller`(Task 5), `computeStats`, `findClusters`, `initSearch`
- Produces: `initPanels(controller, graph, { clusters, stats, source, loadedAt })`
- 동작: KPI 6칸, 좌 패널 요약(미선택)/상세(선택: 이니셜 아바타, 클러스터 태그, Career·Since, Now·Past, Focus 칩, Connections = 소속·협업 상대 button 목록 → `controller.focusNode(id)`), 닫기 → `highlightNode(null)` + 요약 복귀. 라벨/관계 토글 aria-pressed 동기화. 상태줄 `SRC`/`SYNC HH:MM`. 검색 onPick → `focusNode`. main.js: 로딩 HUD 표시 → 로드/정규화/그래프/클러스터/통계 → render(try/catch: WebGL 실패 시 에러 UI 문구) → initPanels → `await controller.playIntro()` → 로딩 HUD 숨김.

- [ ] **Step 1:** panels.js·main.js 구현.
- [ ] **Step 2: 검증(E2E, shot.js 확장 스크립트)** — 로드 후 콘솔 에러 0 / 검색 "양근수" Enter → 상세 패널 이름 일치 / Connections 첫 행 클릭 → 상세 이름 변경 / Relations Interest 토글 aria-pressed=true / Reset view 클릭 에러 없음 / 배경 클릭 → 요약 복귀.
- [ ] **Step 3: 커밋** — `:sparkles: HUD 패널·KPI·검색·연결 탐색·인트로`

---

### Task 7: 반응형 검증·보정

**Files:** Modify `css/styles.css`, (필요 시) `js/panels.js`

- [ ] **Step 1:** 820×1180, 390×844 캡처 → 패널/KPI/검색/시트 겹침 확인 후 보정.
- [ ] **Step 2:** 모바일에서 노드 선택 시 상세 드로어 열림·닫기, 설정 시트 핸들 토글 확인.
- [ ] **Step 3: 커밋** — `:lipstick: HUD 반응형 보정(태블릿·모바일)`

---

### Task 8: OG 이미지 갱신

**Files:** Rewrite `assets/og/og-image.html`; Regenerate `assets/og/og-image.png`

- [ ] **Step 1:** HUD 스타일 카드(레이더 그리드 SVG + Blip 점 + 허브 오빗 마크 + NODE 워드마크 + 태그라인 + KPI 한 줄) 작성. 1200×630.
- [ ] **Step 2:** 스크래치 패드 Playwright로 캡처 → `assets/og/og-image.png`, Read로 육안 확인.
- [ ] **Step 3: 커밋** — `:art: OG 공유 이미지 HUD 디자인으로 갱신`

---

### Task 9: 문서 갱신 · 정리

**Files:** Modify `CLAUDE.md`, `DESIGN.md`(HUD 확장 절 추가), `README.md`(기술 스택·구조·테스트 실행), `docs/plan.md`(Phase 8 체크리스트)

- [ ] **Step 1:** 규칙 변경(본문 그린 완화, 노드/엣지 색, 라운딩, 폰트, 파티클 정책, 파일 구조, `node --test`) 반영.
- [ ] **Step 2:** `design-preview/` 임시 폴더 삭제(커밋 대상 아님).
- [ ] **Step 3: 최종 검증** — `node --test tests/` PASS, 3개 뷰포트 스크린샷, 콘솔 에러 0, `git status` 깨끗.
- [ ] **Step 4: 커밋** — `:memo: HUD 리디자인 문서 반영(CLAUDE·DESIGN·README·plan)`
