// graph.js — 정규화 레코드 → 그래프 모델 { nodes, links } (렌더러 독립, PRD §3.3·§7.4)
//
// 흐름: NormalizedMember[] ──buildGraph()──▶ { nodes, links }
//   - buildNodes(): 노드 크기 val = clamp(√career · k), 유광명(번호 1) 중심 고정
//   - buildLinks(): (A)허브 (B)소속공유 (C)관심사공유 엣지 추론 → dedupe
//   - 소속 매칭은 normalize 단계에서 만든 affiliationKeys(현직장∪과거경력, 교차 포함) 사용
//   - 기준 연도(BASE_YEAR)는 normalize.js를 SSOT로 재사용

import { BASE_YEAR } from "./normalize.js";

/**
 * @typedef {Object} GraphNode
 * @property {number} id          번호(= member.id)
 * @property {string} name        라벨(이름)
 * @property {number} val         노드 크기 = clamp(√career · k)
 * @property {boolean} isHub       true → 유광명(중심 고정)
 * @property {number=} fx          허브일 때 0(중심 고정)
 * @property {number=} fy          허브일 때 0
 * @property {number=} fz          허브일 때 0
 * @property {Object} member      상세 패널용 원본 NormalizedMember 참조
 */

/**
 * @typedef {Object} GraphLink
 * @property {number} source       노드 id
 * @property {number} target       노드 id
 * @property {"hub"|"affiliation"|"interest"|"collaboration"} type
 * @property {number} weight       hub: max(1, 2026-협업시점) / 그 외: 공유 키(또는 협업) 개수
 * @property {string[]=} shared    공유 소속 또는 공유 태그
 */

// ── 상수(갱신 가능하게 분리) ──
export const HUB_ID = 1; // 유광명(중심 노드)
export const INTEREST_THRESHOLD = 2; // 관심사 엣지 최소 중첩(헤어볼 방지, PRD §7.4)
export const NODE_SIZE_K = 1.6; // √career 배율
export const NODE_VAL_MIN = 3; // clamp 하한(career 0/이상치도 최소 구슬)
export const NODE_VAL_MAX = 14; // clamp 상한(일반 노드 비대화 방지)

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * 노드 크기 = clamp(√career · k). career 비유효(NaN/≤0)면 하한 반환(NaN 반경 방지).
 * @param {number} career
 * @returns {number}
 */
export function nodeVal(career) {
  if (!Number.isFinite(career) || career <= 0) return NODE_VAL_MIN;
  return clamp(Math.sqrt(career) * NODE_SIZE_K, NODE_VAL_MIN, NODE_VAL_MAX);
}

/**
 * 노드 생성. 유광명(HUB_ID)만 isHub=true + fx/fy/fz=0 중심 고정.
 * @param {Object[]} members NormalizedMember[]
 * @returns {GraphNode[]}
 */
export function buildNodes(members) {
  return members.map((m) => {
    const isHub = m.id === HUB_ID;
    /** @type {GraphNode} */
    const node = { id: m.id, name: m.name, val: nodeVal(m.career), isHub, member: m };
    if (isHub) {
      node.fx = 0;
      node.fy = 0;
      node.fz = 0;
    }
    return node;
  });
}

// ── 내부 헬퍼 ──

/** 상삼각(i<j) 순회 — 각 무방향 쌍을 정확히 1회 fn(a, b)로 전달. */
function eachPair(items, fn) {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) fn(items[i], items[j]);
  }
}

/**
 * b 배열 중 aSet에 든 원소만 반환(교집합). aSet은 비파괴(같은 a를 여러 b와 비교).
 * b 내부 중복은 seen으로 1회만 카운트.
 */
function intersect(aSet, b) {
  const seen = new Set();
  const out = [];
  for (const x of b) {
    if (aSet.has(x) && !seen.has(x)) {
      out.push(x);
      seen.add(x);
    }
  }
  return out;
}

/** 무방향 쌍 + type 유일 키(min|max|type). */
function pairKey(source, target, type) {
  const [lo, hi] = source <= target ? [source, target] : [target, source];
  return `${lo}|${hi}|${type}`;
}

/** (A) 허브 엣지 — 유광명과 전원 1차 연결. weight = max(1, 2026 - 협업시점). */
function hubLinks(members) {
  return members
    .filter((m) => m.id !== HUB_ID)
    .map((m) => ({
      source: HUB_ID,
      target: m.id,
      type: "hub",
      weight: Math.max(1, BASE_YEAR - m.sinceYear),
    }));
}

/**
 * (D) 협업 엣지 — 협업 컬럼에 기록된 이름을 노드 id로 매칭해 노드-노드 연결.
 * 방향 무시(무방향) + 자기참조/미매칭 이름은 건너뛴다. 같은 이름이 여러 명이면 첫 매칭만.
 * @param {Object[]} members NormalizedMember[]
 * @returns {GraphLink[]}
 */
function collaborationLinks(members) {
  // 이름 → id 매칭 맵(동명이인 방어: 최초 1회만 등록).
  const idByName = new Map();
  for (const m of members) {
    const key = (m.name ?? "").trim();
    if (key && !idByName.has(key)) idByName.set(key, m.id);
  }

  const links = [];
  for (const m of members) {
    for (const rawName of m.collaborators ?? []) {
      const targetId = idByName.get(rawName.trim());
      if (targetId == null || targetId === m.id) continue; // 미매칭/자기참조 제외
      links.push({
        source: m.id,
        target: targetId,
        type: "collaboration",
        shared: [rawName.trim()],
        weight: 1,
      });
    }
  }
  return links;
}

/**
 * 엣지 추론 (PRD §7.4): (A)허브 + (B)소속공유 + (C)관심사공유 + (D)협업 → dedupe.
 * @param {Object[]} members NormalizedMember[]
 * @returns {GraphLink[]}
 */
export function buildLinks(members) {
  const others = members.filter((m) => m.id !== HUB_ID);

  // 멤버별 Set 사전 계산(쌍마다 재생성 금지).
  const affSetById = new Map();
  const tagSetById = new Map();
  for (const m of others) {
    affSetById.set(m.id, new Set(m.affiliationKeys));
    tagSetById.set(m.id, new Set([...m.doingTags, ...m.interestTags]));
  }

  const links = [...hubLinks(members)];

  // (B) 소속 공유 — 교집합 비어있지 않으면 항상 생성.
  eachPair(others, (a, b) => {
    const shared = intersect(affSetById.get(a.id), b.affiliationKeys);
    if (shared.length > 0) {
      links.push({
        source: a.id,
        target: b.id,
        type: "affiliation",
        shared,
        weight: shared.length,
      });
    }
  });

  // (C) 관심사 공유 — 표준 태그(하는일∪관심사) 중첩 ≥ INTEREST_THRESHOLD.
  eachPair(others, (a, b) => {
    const shared = intersect(tagSetById.get(a.id), [...b.doingTags, ...b.interestTags]);
    if (shared.length >= INTEREST_THRESHOLD) {
      links.push({
        source: a.id,
        target: b.id,
        type: "interest",
        shared,
        weight: shared.length,
      });
    }
  });

  // (D) 협업 — 협업 컬럼 기록 이름을 노드-노드 엣지로(전체 멤버 대상).
  links.push(...collaborationLinks(members));

  return dedupe(links);
}

/**
 * 동일 무방향 쌍 + 동일 type 엣지를 1개로 정리.
 * type이 다르면 별개(같은 쌍에 affiliation+interest 공존 시 둘 다 보존).
 * 충돌 시 weight 큰 쪽 유지(방어층 — 상삼각 순회로 자체 중복은 없음).
 * @param {GraphLink[]} links
 * @returns {GraphLink[]}
 */
export function dedupe(links) {
  const byKey = new Map();
  for (const l of links) {
    const k = pairKey(l.source, l.target, l.type);
    const prev = byKey.get(k);
    if (!prev || l.weight > prev.weight) byKey.set(k, l);
  }
  return [...byKey.values()];
}

/**
 * 그래프 모델 생성(공개 진입점).
 * @param {Object[]} members NormalizedMember[]
 * @returns {{ nodes: GraphNode[], links: GraphLink[] }}
 */
export function buildGraph(members) {
  return { nodes: buildNodes(members), links: buildLinks(members) };
}
