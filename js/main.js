// main.js — 부트스트랩 오케스트레이션 엔트리.
//
// Phase 0: CDN 라이브러리 로드 스모크 체크.
// Phase 2: load → 출처 배지 / 노드 카운트 / 에러 UI 갱신 (data.js 연동).
// Phase 5: 이 흐름을 normalize → buildGraph → render 로 확장한다.

import { loadData } from "./data.js";
import { normalize } from "./normalize.js";
import { buildGraph, HUB_ID } from "./graph.js";

// ============ Phase 0: CDN 라이브러리 스모크 체크 ============
const libs = {
  THREE: typeof window.THREE !== "undefined",
  ForceGraph3D: typeof window.ForceGraph3D !== "undefined",
  Papa: typeof window.Papa !== "undefined",
};

const missing = Object.entries(libs)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

if (missing.length === 0) {
  console.info("[NODE] CDN 라이브러리 로드 완료:", Object.keys(libs).join(", "));
} else {
  console.error("[NODE] CDN 라이브러리 로드 실패:", missing.join(", "));
}

// ============ Phase 2: 데이터 로드 + 출처 표시 ============
const badgeEl = document.getElementById("data-source-badge");
const countEl = document.getElementById("node-count");
const errorEl = document.getElementById("error-ui");
const retryBtn = document.getElementById("retry-btn");

const SOURCE_LABEL = { live: "Live", snapshot: "Snapshot" };

async function bootstrap() {
  // 로딩 상태
  errorEl.hidden = true;
  badgeEl.dataset.source = "";
  badgeEl.textContent = "…";
  countEl.textContent = "— nodes";

  const { rows, source, error } = await loadData();

  if (error) {
    // 폴백까지 실패 → 에러 안내 UI(재시도) 노출
    badgeEl.dataset.source = "";
    badgeEl.textContent = "Error";
    countEl.textContent = "— nodes";
    errorEl.hidden = false;
    return;
  }

  // 성공: 출처 배지 + 노드 카운트 반영
  badgeEl.dataset.source = source;
  badgeEl.textContent = SOURCE_LABEL[source] ?? source;
  countEl.textContent = `${rows.length} nodes`;
  console.info(`[NODE] 데이터 로드 완료: source=${source}, rows=${rows.length}`);

  // Phase 3: 정규화 — 동의어 통합 + 결측치 대체 → NormalizedMember[]
  const members = normalize(rows);
  console.info("[NODE] 정규화 샘플:", members[0], `(총 ${members.length}건)`);

  // Phase 4: 그래프 모델 — 노드/엣지 추론
  const graph = buildGraph(members);
  const count = (t) => graph.links.filter((l) => l.type === t).length;
  console.info(
    `[NODE] 그래프 생성: 노드 ${graph.nodes.length}, 엣지 ${graph.links.length}` +
      `(hub/aff/interest=${count("hub")}/${count("affiliation")}/${count("interest")})`
  );
  verifyClusters(graph, members); // Phase 4 검증(임시) — Phase 5 render 연동 시 제거

  // Phase 5 확장 지점: render(graph) 로 교체
}

// ============ Phase 4 검증(임시) ============
// PRD §7.4 검증용 공유 허브 5군집이 affiliation 엣지로 나타나는지 콘솔 확인.
// 유광명은 affiliation이 아닌 hub 엣지로 붙으므로 비허브 구성원 쌍만 검사한다.
// Phase 5에서 render 연동 시 이 함수와 호출부를 제거한다.
function verifyClusters(graph, members) {
  const EXPECTED = {
    지아이비타: ["유광명", "김상균", "김용희", "김정록", "김형록"],
    마키나락스: ["유광명", "김규연", "변정현", "이호진"],
    PwC: ["유광명", "박준상", "박철균", "이명관"],
    포스코이엔씨: ["유광명", "김행찬", "조우철", "한정우"],
    한국전력공사: ["유광명", "노재구", "이민철", "최윤석"],
  };
  const nameToId = new Map(members.map((m) => [m.name, m.id]));

  // affiliation 무방향 인접 집합
  const adj = new Map();
  const link = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a).add(b);
  };
  for (const l of graph.links) {
    if (l.type !== "affiliation") continue;
    link(l.source, l.target);
    link(l.target, l.source);
  }

  for (const [org, names] of Object.entries(EXPECTED)) {
    const ids = names
      .map((n) => nameToId.get(n))
      .filter((id) => id !== undefined && id !== HUB_ID);
    let connected = 0;
    let total = 0;
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        total++;
        if (adj.get(ids[i])?.has(ids[j])) connected++;
      }
    }
    const ok = total > 0 && connected === total;
    console[ok ? "info" : "warn"](
      `[NODE][검증] ${org}: 비허브쌍 ${connected}/${total} affiliation 연결 ${ok ? "OK" : "불완전"}`
    );
  }
}

retryBtn.addEventListener("click", bootstrap);

bootstrap();
