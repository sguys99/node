// stats.js — KPI 스트립·네트워크 요약 패널용 순수 집계. THREE/DOM 비의존(node --test 대상).
//
// 흐름: buildGraph() + findClusters() ──computeStats()──▶ 허브 제외 통계 객체
//   - members / clusters / type별 엣지 수
//   - 평균 경력, 가장 오래된 인연(since)·기간
//   - 상위 소속(현직장∪과거경력, 멤버당 1회) / 인연 시작 연대 분포

import { BASE_YEAR } from "./normalize.js";

// 특정 조직이 아닌 고용 형태 — 상위 소속 집계에서 제외(normalize.NON_ORG_KEYS의 표시값).
const NON_ORG_DISPLAY = new Set(["자영업", "프리랜서"]);
const TOP_ORGS = 5;

/**
 * @param {{nodes: Object[], links: Object[]}} graph buildGraph() 출력
 * @param {{list: Object[]}} clusters findClusters() 출력
 */
export function computeStats(graph, clusters) {
  const others = graph.nodes.filter((n) => !n.isHub).map((n) => n.member);

  const links = { hub: 0, affiliation: 0, interest: 0, collaboration: 0 };
  for (const l of graph.links) if (l.type in links) links[l.type]++;

  const careers = others.map((m) => m.career).filter(Number.isFinite);
  const avgCareer = careers.length
    ? Math.round(careers.reduce((a, b) => a + b, 0) / careers.length)
    : 0;
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

  // 최소~최대 연대를 빈 구간 없이 연속으로(히스토그램 x축 고정).
  const decades = [];
  if (years.length) {
    const decade = (y) => Math.floor(y / 10) * 10;
    for (let d = decade(Math.min(...years)); d <= decade(Math.max(...years)); d += 10) {
      decades.push({ label: String(d), count: years.filter((y) => decade(y) === d).length });
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
