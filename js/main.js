// main.js — 부트스트랩 오케스트레이션 엔트리.
//
// 흐름: 로딩 HUD → loadData(시트 → 스냅샷 폴백) → normalize → buildGraph → findClusters/computeStats
//       → render(3D, WebGL 실패 시 에러 UI) → initPanels → 인트로(확산) 시작과 함께 로딩 HUD 해제.

import { loadData } from "./data.js";
import { normalize } from "./normalize.js";
import { buildGraph, findClusters } from "./graph.js";
import { computeStats } from "./stats.js";
import { render } from "./render.js";
import { initPanels } from "./panels.js";

// ============ CDN 라이브러리 스모크 체크 ============
// three·3d-force-graph는 ES module(render.js에서 import)로 로드 → 전역 체크 대상은 UMD PapaParse만.
if (typeof window.Papa !== "undefined") {
  console.info("[NODE] PapaParse(UMD) 로드 완료. three·3d-force-graph는 ESM import.");
} else {
  console.error("[NODE] PapaParse 로드 실패");
}

const badgeEl = document.getElementById("data-source-badge");
const countEl = document.getElementById("node-count");
const errorEl = document.getElementById("error-ui");
const errorMsgEl = document.getElementById("error-msg");
const retryBtn = document.getElementById("retry-btn");
const loadingEl = document.getElementById("loading-hud");
const loadingSubEl = document.getElementById("loading-sub");
const graphEl = document.getElementById("graph");

const SOURCE_LABEL = { live: "Live", snapshot: "Snapshot" };
const ERROR_TEXT = {
  load: "데이터를 불러오지 못했습니다.",
  webgl: "3D 그래프를 표시할 수 없습니다. WebGL을 지원하는 브라우저에서 열어주세요.",
};

function setLoading(on, text) {
  loadingEl.hidden = !on;
  loadingEl.classList.remove("is-done");
  if (text) loadingSubEl.textContent = text;
}

function showError(kind) {
  setLoading(false);
  badgeEl.dataset.source = "";
  badgeEl.textContent = "Error";
  countEl.textContent = "— nodes";
  errorMsgEl.textContent = ERROR_TEXT[kind];
  errorEl.hidden = false;
}

async function bootstrap() {
  errorEl.hidden = true;
  badgeEl.dataset.source = "";
  badgeEl.textContent = "…";
  countEl.textContent = "— nodes";
  setLoading(true, "Fetching Google Sheet…");

  const { rows, source, error } = await loadData();
  if (error) {
    showError("load");
    return;
  }
  const loadedAt = new Date();

  badgeEl.dataset.source = source;
  badgeEl.textContent = SOURCE_LABEL[source] ?? source;
  countEl.textContent = `${rows.length} nodes`;
  console.info(`[NODE] 데이터 로드 완료: source=${source}, rows=${rows.length}`);
  setLoading(true, "Building graph…");

  // 정규화 → 그래프 모델(노드/엣지 추론) → 클러스터·통계
  const members = normalize(rows);
  const graph = buildGraph(members);
  const clusters = findClusters(graph);
  const stats = computeStats(graph, clusters);
  console.info(
    `[NODE] 그래프 생성: 노드 ${graph.nodes.length}, 엣지 ${graph.links.length}` +
      `(hub/aff/interest/collab=${stats.links.hub}/${stats.links.affiliation}/` +
      `${stats.links.interest}/${stats.links.collaboration}), 클러스터 ${clusters.list.length}`
  );

  // 3D 렌더(WebGL 컨텍스트 실패 등은 에러 UI로)
  let controller;
  try {
    graphEl.replaceChildren(); // 재시도 시 이전 캔버스 제거
    controller = render(graph, { container: graphEl });
  } catch (err) {
    console.error("[NODE] 3D 렌더 실패:", err);
    showError("webgl");
    return;
  }

  initPanels(controller, graph, { clusters, stats, source, loadedAt });

  // 인트로 첫 프레임이 그려지면 로딩 HUD를 페이드아웃
  await controller.playIntro({ onStart: () => loadingEl.classList.add("is-done") });
  loadingEl.hidden = true;
}

retryBtn.addEventListener("click", bootstrap);

bootstrap();
