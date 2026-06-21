// render.js — 인터랙티브 3D 지식그래프 렌더링 + 인터랙션 (3d-force-graph / Three.js)
//
// 흐름: buildGraph() → { nodes, links } ──render()──▶ 3D 렌더 + controller 반환
//   - 노드: 입체 구체(씬 라이트 음영 + 은은한 bloom). 크기 = 경력(√career), 허브=앰버·최대.
//   - 라벨: 씬 안 SpriteText(항상 카메라 향함). 우측 Labels 토글로 구성. 허브 이름 기본 노출.
//   - 엣지: type별 색/굵기 + 허브·소속 엣지에 느린 방향성 파티클(flow 연출, 과하지 않게).
//   - 인터랙션: 드래그로 회전(trackball + damping 관성 → 잡고 돌리면 미끄러지듯). 자동 회전 없음.
//   - 선택: 노드 클릭 → 연결만 강조·나머지 dim + 좌측 상세 패널 통지.
//
// 디자인: 그래프 레이어 색은 css/tokens.css의 --graph-* 변수에서 read(그래프 한정 비구속, 비녹색).
// THREE 정합: three·ForceGraph3D·UnrealBloomPass·three-spritetext 모두 esm.sh three@0.180.0
//   인스턴스를 공유(?deps=three@0.180.0) → 단일 모듈 dedupe로 색관리/타입 충돌 방지.

import * as THREE from "https://esm.sh/three@0.180.0";
import ForceGraph3D from "https://esm.sh/3d-force-graph@1.73.4?deps=three@0.180.0";
import SpriteText from "https://esm.sh/three-spritetext@1.9.6?deps=three@0.180.0";
import { UnrealBloomPass } from "https://esm.sh/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "https://esm.sh/three@0.180.0/examples/jsm/postprocessing/OutputPass.js";
import { BASE_YEAR } from "./normalize.js";

// ── 디자인 토큰 read (한 번만 캐시) ──
const css = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const COLOR = {
  bg: css("--graph-bg"),
  node: css("--graph-node"),
  hub: css("--graph-hub"),
  dim: css("--graph-dim"),
  label: css("--graph-label"),
  labelSub: css("--graph-label-sub"),
};
const EDGE_COLORS = {
  hub: css("--graph-edge-hub"),
  affiliation: css("--graph-edge-aff"),
  interest: css("--graph-edge-int"),
};

// ── 렌더 튜닝 상수 ──
const NODE_REL_SIZE = 4; // 노드 전체 스케일 보정
const HUB_VAL_MULT = 2.5; // 허브 노드 크기 배수(중심 강조)
const NODE_OPACITY = 0.95;
const NODE_RESOLUTION = 16; // 구체 세그먼트(입체감↑)
const LINK_OPACITY = 0.3;
const PARTICLE_SPEED = 0.004; // 엣지 flow 속도(느리게 — 과하지 않게)
const PARTICLE_WIDTH = 1.2;
const DAMPING = 0.12; // trackball dynamicDampingFactor(낮을수록 관성↑)
// bloom 은은하게(near-black 인디고 위 소프트 글로우) — 과한 발광 회피.
const BLOOM = { strength: 0.6, radius: 0.45, threshold: 0.2 };
const LABEL_INTEREST_MAX = 2;

/** link.source/target는 엔진이 노드 객체로 치환 → 항상 raw id로 환원. */
const rawId = (endpoint) =>
  typeof endpoint === "object" && endpoint !== null ? endpoint.id : endpoint;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * 인터랙티브 3D 지식그래프 렌더 + 인터랙션.
 * @param {{nodes: Object[], links: Object[]}} graph buildGraph() 출력
 * @param {{container: string|HTMLElement}} [opts]
 * @returns {Object} controller (setLabelFields, setLinkTypeVisibility, highlightNode, resetView, onSelect)
 */
export function render(graph, opts = {}) {
  const el =
    typeof opts.container === "string"
      ? document.querySelector(opts.container)
      : opts.container || document.getElementById("graph");

  // ── 하이라이트용 이웃 인접 맵(raw id 기준) ──
  const neighbors = new Map();
  graph.nodes.forEach((n) => neighbors.set(n.id, new Set()));
  for (const l of graph.links) {
    const s = rawId(l.source);
    const t = rawId(l.target);
    neighbors.get(s)?.add(t);
    neighbors.get(t)?.add(s);
  }

  // ── 런타임 상태(controller가 변경) ──
  let selectedId = null;
  const linkVisible = { hub: true, affiliation: true, interest: true };
  const labelFields = { name: true, career: false, nickname: false, interest: false };
  const labelSprites = new Map(); // id -> SpriteText(라벨 dim 제어)

  const isActive = (id) =>
    selectedId == null || id === selectedId || neighbors.get(selectedId)?.has(id);

  // ── 노드 크기/색 ──
  const nodeVal = (n) => (n.isHub ? n.val * HUB_VAL_MULT : n.val);
  const nodeRadius = (n) => Math.cbrt(Math.max(1, nodeVal(n))) * NODE_REL_SIZE;
  const nodeColor = (n) => {
    if (!isActive(n.id)) return COLOR.dim; // 비활성 dim
    return n.isHub ? COLOR.hub : COLOR.node;
  };

  // ── 라벨(씬 안 SpriteText, billboard) ──
  const labelLines = (n) => {
    const m = n.member || {};
    const lines = [];
    if (labelFields.name || n.isHub) lines.push(m.name ?? n.name);
    if (labelFields.career && Number.isFinite(m.career)) lines.push(`${m.career}년차`);
    if (labelFields.nickname && m.nickname) lines.push(m.nickname);
    if (labelFields.interest && m.interestTags?.length)
      lines.push(m.interestTags.slice(0, LABEL_INTEREST_MAX).join(" · "));
    return lines;
  };

  const buildLabelObject = (n) => {
    labelSprites.delete(n.id);
    const lines = labelLines(n);
    if (!lines.length) return null;
    const sprite = new SpriteText(lines.join("\n"));
    sprite.color = n.isHub ? COLOR.hub : COLOR.label;
    sprite.textHeight = n.isHub ? 8 : 5.5;
    sprite.fontFace = '"Noto Sans KR", "Inter", sans-serif';
    sprite.fontWeight = n.isHub ? "700" : "500";
    sprite.backgroundColor = false;
    sprite.material.transparent = true;
    sprite.material.depthWrite = false;
    sprite.material.opacity = isActive(n.id) ? 1 : 0.12;
    sprite.position.set(0, nodeRadius(n) + 3, 0); // 노드 위로 살짝 띄움
    labelSprites.set(n.id, sprite);
    return sprite;
  };

  // ── 엣지 스타일 ──
  const linkColor = (l) => {
    const s = rawId(l.source);
    const t = rawId(l.target);
    const incident = selectedId == null || s === selectedId || t === selectedId;
    return incident ? EDGE_COLORS[l.type] : COLOR.dim;
  };
  // 굵기 = 허브 weight(알게 된 연차). 소속/관심사는 가늘게.
  const linkWidth = (l) =>
    l.type === "hub" ? clamp(0.4 + l.weight * 0.18, 0.6, 5) : l.type === "affiliation" ? 0.6 : 0.4;
  // flow 파티클 — 허브·소속 엣지에만(과하지 않게), 가시 상태일 때.
  const particleCount = (l) =>
    linkVisible[l.type] && (l.type === "hub" || l.type === "affiliation") ? 2 : 0;

  // 허브 엣지 거리 = 협업 연차 역매핑(오래 알수록 중심에 가깝게). 소속/관심사는 짧게(군집).
  const hubLinkDistance = (weight) => {
    const w = clamp(weight, 1, 30);
    return 220 - ((w - 1) / 29) * (220 - 70); // weight↑ → distance↓
  };

  // ── ForceGraph3D 인스턴스 ──
  const graph3d = ForceGraph3D()(el)
    .backgroundColor(COLOR.bg)
    .graphData(graph)
    .nodeRelSize(NODE_REL_SIZE)
    .nodeVal(nodeVal)
    .nodeResolution(NODE_RESOLUTION)
    .nodeOpacity(NODE_OPACITY)
    .nodeColor(nodeColor)
    .nodeThreeObjectExtend(true) // 기본 구체 + 라벨 sprite 동시
    .nodeThreeObject(buildLabelObject)
    .linkColor(linkColor)
    .linkWidth(linkWidth)
    .linkOpacity(LINK_OPACITY)
    .linkVisibility((l) => linkVisible[l.type])
    .linkDirectionalParticles(particleCount)
    .linkDirectionalParticleSpeed(PARTICLE_SPEED)
    .linkDirectionalParticleWidth(PARTICLE_WIDTH)
    .width(el.clientWidth)
    .height(el.clientHeight);

  // 레이아웃: 허브 엣지 거리로 방사 구조(오래 알수록 중심 가깝게), 소속/관심사는 군집.
  graph3d
    .d3Force("link")
    .distance((l) => (l.type === "hub" ? hubLinkDistance(l.weight) : 36));

  // ── 라이팅(입체감) — 기본 라이트에 부드러운 방향광 보강 ──
  const dir = new THREE.DirectionalLight(0xffffff, 0.55);
  dir.position.set(1, 1, 1);
  graph3d.scene().add(dir);

  // ── 블룸(소프트 글로우) + 색관리(OutputPass 1회 인코딩) ──
  const bloom = new UnrealBloomPass();
  bloom.strength = BLOOM.strength;
  bloom.radius = BLOOM.radius;
  bloom.threshold = BLOOM.threshold;
  const composer = graph3d.postProcessingComposer();
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  graph3d.renderer().outputColorSpace = THREE.LinearSRGBColorSpace;

  // ── 컨트롤: 드래그 회전 + 관성(damping) — 잡고 돌리면 미끄러지듯 감속 ──
  const controls = graph3d.controls();
  controls.staticMoving = false; // 관성 on
  controls.dynamicDampingFactor = DAMPING;
  controls.rotateSpeed = 1.1;

  // ── 상태 반영 ──
  const refresh = () => {
    graph3d
      .nodeColor(nodeColor)
      .linkColor(linkColor)
      .linkWidth(linkWidth)
      .linkDirectionalParticles(particleCount);
    for (const [id, sprite] of labelSprites) {
      sprite.material.opacity = isActive(id) ? 1 : 0.12;
    }
  };

  // ── 인터랙션: 선택 → 강조 + onSelect 통지 ──
  graph3d
    .onNodeClick((node) => {
      selectedId = selectedId === node.id ? null : node.id; // 재클릭 → 해제
      refresh();
      controller.onSelect?.(selectedId == null ? null : node);
    })
    .onBackgroundClick(() => {
      if (selectedId == null) return;
      selectedId = null;
      refresh();
      controller.onSelect?.(null);
    })
    .onNodeHover((node) => {
      el.style.cursor = node ? "pointer" : "grab";
    });

  // ── 반응형 리사이즈 ──
  const ro = new ResizeObserver(() => {
    graph3d.width(el.clientWidth).height(el.clientHeight);
  });
  ro.observe(el);

  // 초기 전체 맞춤(엔진 안정화 후 1회).
  let fitted = false;
  graph3d.onEngineStop(() => {
    if (fitted) return;
    fitted = true;
    graph3d.zoomToFit(600, 60);
  });

  // ── controller (패널 제어용 핸들) ──
  const controller = {
    /** 라벨 구성 토글 (name/career/nickname/interest). */
    setLabelFields(field, on) {
      if (!(field in labelFields)) return;
      labelFields[field] = !!on;
      graph3d.nodeThreeObject(buildLabelObject); // 라벨 sprite 재생성
    },
    /** 엣지 유형 표시 토글 (hub/affiliation/interest). */
    setLinkTypeVisibility(type, visible) {
      if (!(type in linkVisible)) return;
      linkVisible[type] = !!visible;
      graph3d
        .linkVisibility((l) => linkVisible[l.type])
        .linkDirectionalParticles(particleCount);
      refresh();
    },
    /** 외부에서 노드 선택/해제 (좌측 상세 패널 연동). */
    highlightNode(node) {
      selectedId = node?.id ?? null;
      refresh();
    },
    /** 카메라 줌/회전 초기화 — 전체 그래프가 보이도록 맞춤. */
    resetView() {
      graph3d.zoomToFit(600, 60);
    },
    /** 노드 선택 시 호출되는 콜백 슬롯 (좌측 상세 패널이 구독). */
    onSelect: null,
  };

  return controller;
}
