// main.js — 부트스트랩 오케스트레이션 엔트리.
//
// Phase 0: CDN 라이브러리 로드 스모크 체크.
// Phase 2: load → 출처 배지 / 노드 카운트 / 에러 UI 갱신 (data.js 연동).
// Phase 5: 이 흐름을 normalize → buildGraph → render 로 확장한다.

import { loadData } from "./data.js";
import { normalize } from "./normalize.js";

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

  // Phase 5 확장 지점: buildGraph(members) → render(...)
}

retryBtn.addEventListener("click", bootstrap);

bootstrap();
