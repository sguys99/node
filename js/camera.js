// camera.js — 카메라 홈 시점 · 노드 fly-to · 인트로 확산 애니메이션.
//
// THREE 비의존: 3d-force-graph 인스턴스 API(cameraPosition·camera·d3ReheatSimulation)와
// 노드 좌표(x/y/z, fx/fy/fz)만 다룬다.

import { ORBIT } from "./layout.js";

// 원반을 비스듬히(고도 약 37°) 내려다보는 홈 방향. 살짝 옆에서 봐 입체감을 준다.
const HOME_DIR = { x: 0.12, y: 0.75, z: 1 };
const LABEL_MARGIN = 40; // 바깥 노드 라벨이 잘리지 않게 반경 여유
const HEIGHT_FILL = 0.75; // 세로 방향 화면 점유율 상한

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

/**
 * 원반 전체가 보이는 홈 카메라 위치.
 * @param {Object[]} nodes 레이아웃이 끝난 노드(x/z 사용)
 * @param {{aspect:number, fov:number, widthFraction:number}} view
 *   widthFraction = 좌우 패널을 뺀 가용 폭 비율(0~1)
 * @returns {{x:number, y:number, z:number}}
 */
export function homePosition(nodes, { aspect, fov, widthFraction }) {
  const rMax =
    Math.max(ORBIT.R_MIN, ...nodes.map((n) => Math.hypot(n.x || 0, n.z || 0))) + LABEL_MARGIN;
  const vHalf = (fov * Math.PI) / 360;
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const len = Math.hypot(HOME_DIR.x, HOME_DIR.y, HOME_DIR.z);
  const elev = Math.asin(HOME_DIR.y / len);
  const distW = rMax / (Math.tan(hHalf) * widthFraction);
  const distH = (rMax * Math.sin(elev)) / (Math.tan(vHalf) * HEIGHT_FILL);
  const dist = Math.max(distW, distH);
  return {
    x: (HOME_DIR.x / len) * dist,
    y: (HOME_DIR.y / len) * dist,
    z: (HOME_DIR.z / len) * dist,
  };
}

/** 노드를 화면 중앙에 두도록 현재 시선 방향을 유지한 채 다가간다. */
export function flyTo(graph3d, node, { distance = 190, ms = 900 } = {}) {
  const cam = graph3d.camera().position;
  const dx = cam.x - node.x;
  const dy = cam.y - node.y;
  const dz = cam.z - node.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  graph3d.cameraPosition(
    {
      x: node.x + (dx / len) * distance,
      y: node.y + (dy / len) * distance,
      z: node.z + (dz / len) * distance,
    },
    { x: node.x, y: node.y, z: node.z },
    ms
  );
}

/** 모든 노드 좌표가 계산될 때까지(warmup 완료) 프레임 단위로 대기. */
export function waitForLayout(nodes) {
  return new Promise((resolve) => {
    const check = () =>
      nodes.every((n) => Number.isFinite(n.x)) ? resolve() : requestAnimationFrame(check);
    check();
  });
}

/** 현재 좌표에 고정(정적 레이아웃) — 이후 force가 노드를 움직이지 않는다. */
export function freezeLayout(nodes) {
  for (const n of nodes) {
    n.fx = n.x;
    n.fy = n.y;
    n.fz = n.z;
  }
}

/**
 * 인트로: 모든 노드를 허브(원점)에서 최종 좌표로 확산시킨 뒤 그 자리에 고정.
 * fx/fy/fz를 프레임마다 보간하고, 엔진을 재가열해 tick이 좌표를 반영하게 한다.
 * @returns {Promise<void>}
 */
export function playIntro(graph3d, nodes, { ms = 1600 } = {}) {
  const finals = nodes.map((n) => [n, n.x, n.y, n.z]);
  for (const [n] of finals) {
    n.fx = 0;
    n.fy = 0;
    n.fz = 0;
  }
  graph3d.d3ReheatSimulation();
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now) => {
      const e = easeOutCubic(Math.min(1, (now - t0) / ms));
      for (const [n, x, y, z] of finals) {
        n.fx = x * e;
        n.fy = y * e;
        n.fz = z * e;
      }
      if (e < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
