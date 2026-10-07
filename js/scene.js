// scene.js — Command HUD 장면 연출: 배경 · 레이더 그리드 · 연차 링/눈금 · 스윕 · 라이트 · 블룸.
//
// 노드/엣지 외의 "무대"만 담당한다. 색은 render.js가 CSS 변수에서 읽어 넘긴 colors를 쓴다.
// 색관리: renderer.outputColorSpace = SRGB → OutputPass가 마지막에 1회 sRGB 인코딩한다.
//   (Linear로 두면 OutputPass가 인코딩을 생략해 모든 색이 토큰보다 어둡게 렌더되던 버그 수정)

import * as THREE from "https://esm.sh/three@0.180.0";
import { CSS2DObject } from "https://esm.sh/three@0.180.0/examples/jsm/renderers/CSS2DRenderer.js";
import { UnrealBloomPass } from "https://esm.sh/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "https://esm.sh/three@0.180.0/examples/jsm/postprocessing/OutputPass.js";
import { orbitRadius, yearsKnown, RING_YEARS } from "./layout.js";

// 블룸은 허브 후광에만 살짝 걸리도록 높은 threshold(노드가 반짝이지 않게).
const BLOOM = { strength: 0.18, radius: 0.25, threshold: 0.85 };
const GRID_SECTORS = 12;
const GRID_Y = -2; // 그리드를 노드 평면보다 살짝 아래에
const SWEEP_PERIOD_MS = 18000;
const SWEEP_ANGLE = Math.PI / 7;
const RING_SEGMENTS = 192;
const TAG_ANGLE = Math.PI * 0.42; // 연차 눈금 위치(카메라 쪽 앞면)

/** 중심부 은은한 글로우 + 비네트 배경 텍스처. */
function backgroundTexture(colors) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 640;
  const g = c.getContext("2d");
  g.fillStyle = colors.canvas;
  g.fillRect(0, 0, c.width, c.height);
  const glow = g.createRadialGradient(512, 350, 0, 512, 350, 620);
  glow.addColorStop(0, colors.canvasGlow);
  glow.addColorStop(1, colors.canvas);
  g.fillStyle = glow;
  g.fillRect(0, 0, c.width, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function circle(radius, material) {
  const pts = [];
  for (let i = 0; i <= RING_SEGMENTS; i++) {
    const a = (i / RING_SEGMENTS) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material);
}

/**
 * 장면 연출 설치.
 * @param {Object} graph3d ForceGraph3D 인스턴스
 * @param {{colors: Object, reducedMotion: boolean, baseYear: number}} opts
 * @returns {{tick: (t: number) => void}}
 */
export function dressScene(graph3d, { colors, reducedMotion, baseYear }) {
  const scene = graph3d.scene();
  scene.background = backgroundTexture(colors);

  // 입체감 보조 방향광(기본 라이트에 더해 허브 구체 음영)
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(1, 1.5, 1);
  scene.add(dir);

  const radar = new THREE.Group();
  radar.position.y = GRID_Y;
  scene.add(radar);

  // 방사선 12섹터 + 외곽 원(PolarGridHelper, 링 1개)
  const outer = orbitRadius(1) + 20;
  const polar = new THREE.PolarGridHelper(outer, GRID_SECTORS, 1, 128, colors.gridSoft, colors.gridSoft);
  polar.material.transparent = true;
  polar.material.opacity = 0.7;
  polar.material.depthWrite = false;
  radar.add(polar);

  // 연차 링 — 인연 시작 연도(2024/2020/2010/2000)의 궤도 반경. 눈금 = 함께한 햇수.
  const ringMat = new THREE.LineBasicMaterial({
    color: colors.grid,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  for (const year of RING_YEARS) {
    const w = yearsKnown(year, baseYear);
    const r = orbitRadius(w);
    radar.add(circle(r, ringMat));
    const tag = document.createElement("div");
    tag.className = "ring-tag";
    tag.textContent = `${String(w).padStart(2, "0")}Y`;
    const obj = new CSS2DObject(tag);
    obj.position.set(Math.cos(TAG_ANGLE) * r, 0, Math.sin(TAG_ANGLE) * r);
    radar.add(obj);
  }

  // 레이더 스윕 — 얇은 부채꼴이 천천히 회전(모션 축소 시 정지)
  const sweep = new THREE.Mesh(
    new THREE.CircleGeometry(outer, 48, 0, SWEEP_ANGLE),
    new THREE.MeshBasicMaterial({
      color: colors.sweep,
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  sweep.rotation.x = -Math.PI / 2;
  sweep.position.y = 1;
  radar.add(sweep);

  // 블룸(허브 후광 한정) + 출력 인코딩
  const bloom = new UnrealBloomPass();
  Object.assign(bloom, BLOOM);
  const composer = graph3d.postProcessingComposer();
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  graph3d.renderer().outputColorSpace = THREE.SRGBColorSpace;

  return {
    tick(t) {
      if (!reducedMotion) sweep.rotation.z = -((t % SWEEP_PERIOD_MS) / SWEEP_PERIOD_MS) * Math.PI * 2;
    },
  };
}
