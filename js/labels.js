// labels.js — 그래프 라벨 문구 구성 + 화면 충돌 기반 배치(declutter). THREE/DOM 비의존(node --test 대상).
//
// 흐름: render.js가 매 N프레임 노드 라벨의 화면 박스(items)를 넘기면
//   placeLabels()가 우선순위(허브 > 선택 > 호버 > 이웃 > 크기 > 카메라 근접) 순으로
//   겹치지 않는 라벨만 골라 visible 집합을 돌려준다 → 나머지는 숨김(.is-culled).

// 표시 조직에서 건너뛸 고용 형태(현직장이 이 값이면 과거경력 첫 값으로 대체).
const NON_ORG_DISPLAY = new Set(["자영업", "프리랜서"]);
const INTEREST_MAX = 2;

/**
 * 라벨 문구 — 주 줄(이름) + 보조 줄(선택 필드를 " · "로 연결).
 * @param {Object} member NormalizedMember
 * @param {{name:boolean, career:boolean, nickname:boolean, interest:boolean, affiliation:boolean}} fields
 * @param {boolean} isHub 허브는 이름 강제·보조 줄 없음
 * @returns {{main: string, sub: string|null}}
 */
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
  if (fields.interest && m.interestTags?.length) {
    parts.push(m.interestTags.slice(0, INTEREST_MAX).join(" · "));
  }
  return { main, sub: parts.length ? parts.join(" · ") : null };
}

/**
 * 우선순위 greedy 배치. 이미 놓인 라벨과 (gap 포함) 겹치면 숨긴다.
 * @param {{id:*, x:number, y:number, w:number, h:number, pri:number, off?:boolean}[]} items 좌상단 px 박스
 * @param {{x:number, y:number}} [gap]
 * @returns {Set<*>} 보이는 라벨 id
 */
export function placeLabels(items, gap = { x: 6, y: 2 }) {
  const placed = [];
  const visible = new Set();
  const sorted = items.filter((it) => !it.off).sort((a, b) => b.pri - a.pri);
  for (const it of sorted) {
    const hit = placed.some(
      (p) =>
        it.x < p.x + p.w + gap.x &&
        it.x + it.w + gap.x > p.x &&
        it.y < p.y + p.h + gap.y &&
        it.y + it.h + gap.y > p.y
    );
    if (hit) continue;
    placed.push(it);
    visible.add(it.id);
  }
  return visible;
}

/**
 * 프레임 스로틀 래퍼 — tick()은 every 프레임마다, force()는 즉시 배치를 다시 계산한다.
 * @param {{items: () => Object[], apply: (visible: Set<*>) => void, every?: number}} opts
 */
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
