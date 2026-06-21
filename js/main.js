// main.js — 부트스트랩 오케스트레이션 엔트리.
//
// Phase 0: CDN 라이브러리 로드 스모크 체크.
// Phase 2: load → 출처 배지 / 노드 카운트 / 에러 UI 갱신 (data.js 연동).
// Phase 5: 이 흐름을 normalize → buildGraph → render 로 확장한다.

import { loadData } from "./data.js";
import { normalize } from "./normalize.js";
import { buildGraph } from "./graph.js";
import { render } from "./render.js";
import { initPanels } from "./panels.js";

// Phase 5+: render()가 반환한 controller(그래프 제어 핸들)를 보관 — Phase 6 패널이 사용.
let controller = null;

// ============ Phase 0: CDN 라이브러리 스모크 체크 ============
// three·ForceGraph3D는 import map 기반 ES module(render.js에서 import)로 이동 →
// 전역 스모크 체크 대상은 UMD 전역인 PapaParse만 남는다.
if (typeof window.Papa !== "undefined") {
  console.info("[NODE] PapaParse(UMD) 로드 완료. three·ForceGraph3D는 ESM import.");
} else {
  console.error("[NODE] PapaParse 로드 실패");
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

  // Phase 5: 구형 지식그래프 렌더 + 인터랙션. controller는 Phase 6 패널 제어에 사용.
  controller = render(graph, { container: "#graph" });

  // Phase 6: 좌측 상세 / 우측 설정 패널 연결.
  initPanels(controller, graph);
}

retryBtn.addEventListener("click", bootstrap);

bootstrap();
