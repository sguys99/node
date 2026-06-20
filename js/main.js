// main.js — 부트스트랩 오케스트레이션 엔트리.
// Phase 5에서 load → normalize → buildGraph → render 흐름을 구현한다.
//
// Phase 0: CDN 라이브러리가 정상 로드되었는지 검증하는 스모크 체크만 수행.

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
