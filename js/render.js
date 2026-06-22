// render.js — 인터랙티브 3D 지식그래프 렌더링 + 인터랙션 (3d-force-graph / Three.js)
//
// 흐름: buildGraph() → { nodes, links } ──render()──▶ 3D 렌더 + controller 반환
//   - 노드: 입체 구체(씬 라이트 음영 + 은은한 bloom). 크기 = 경력(√career), 허브=그린·최대.
//   - 라벨: CSS2D HTML 오버레이(항상 일정 px·선명). 우측 Labels 토글로 구성. 허브 이름 기본 노출.
//   - 엣지: type별 색/굵기 + 허브·소속 엣지에 느린 방향성 파티클(flow 연출, 과하지 않게).
//   - 인터랙션: 드래그로 회전(trackball + damping 관성 → 잡고 돌리면 미끄러지듯). 자동 회전 없음.
//   - 선택: 노드 클릭 → 연결만 강조·나머지 dim + 좌측 상세 패널 통지.
//
// 디자인: 그래프 색은 DESIGN.md 토큰(css/tokens.css --color-*)을 그대로 준용(허브=그린, 노드=그레이).
// THREE 정합: three·ForceGraph3D·UnrealBloomPass·CSS2DRenderer 모두 esm.sh three@0.180.0
//   인스턴스를 공유(?deps=three@0.180.0) → 단일 모듈 dedupe로 색관리/타입 충돌 방지.

import * as THREE from "https://esm.sh/three@0.180.0";
import ForceGraph3D from "https://esm.sh/3d-force-graph@1.73.4?deps=three@0.180.0";
import { CSS2DRenderer, CSS2DObject } from "https://esm.sh/three@0.180.0/examples/jsm/renderers/CSS2DRenderer.js";
import { UnrealBloomPass } from "https://esm.sh/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "https://esm.sh/three@0.180.0/examples/jsm/postprocessing/OutputPass.js";
import { BASE_YEAR } from "./normalize.js";

// ── 디자인 토큰 read (한 번만 캐시) — DESIGN.md 색 준용(원복) ──
const css = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const COLOR = {
  bg: css("--color-canvas"),
  node: css("--color-body"), // 일반 노드 = 그레이
  hub: css("--color-primary"), // 허브 = 그린 액센트
  dim: css("--color-hairline"), // 비활성 dim
  label: css("--color-ink"),
  labelSub: css("--color-mute"),
};
// 엣지 색 의미: 잘 아는 허브 관계는 가는 흰색 점선으로 물러나게, 잘 모르는 노드-노드 관계를 녹색으로 강조.
const EDGE_COLORS = {
  hub: css("--color-ink"), // 허브 엣지 = 밝은 흰색(가는 점선 — 은은한 가이드)
  affiliation: css("--color-primary"), // 소속 엣지 = 진한 녹색(덜 알려진 관계 강조)
  interest: css("--color-primary-soft"), // 관심사 엣지 = 연한 녹색(소속과 톤 구분)
  collaboration: css("--graph-collaboration"), // 협업 엣지 = 밝은 오렌지(과거 협력 관계 강조)
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
// bloom 매우 은은하게(near-black 위 소프트 글로우) — 과한 발광/촌스러움 회피.
const BLOOM = { strength: 0.35, radius: 0.4, threshold: 0.25 };
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

  // ── 하이라이트용 이웃 인접 맵(raw id 기준) + id→node 참조 ──
  const neighbors = new Map();
  const nodeById = new Map();
  graph.nodes.forEach((n) => {
    neighbors.set(n.id, new Set());
    nodeById.set(n.id, n);
  });
  for (const l of graph.links) {
    const s = rawId(l.source);
    const t = rawId(l.target);
    neighbors.get(s)?.add(t);
    neighbors.get(t)?.add(s);
  }

  // ── 런타임 상태(controller가 변경) ──
  let selectedId = null;
  const linkVisible = { hub: true, affiliation: true, interest: true, collaboration: true };
  const labelFields = { name: true, career: false, nickname: false, interest: false, affiliation: false };
  const labelDivs = new Map(); // id -> CSS2D 라벨 div(dim 제어)

  const isActive = (id) =>
    selectedId == null || id === selectedId || neighbors.get(selectedId)?.has(id);

  // ── 노드 크기/색 ──
  const nodeVal = (n) => (n.isHub ? n.val * HUB_VAL_MULT : n.val);
  const nodeRadius = (n) => Math.cbrt(Math.max(1, nodeVal(n))) * NODE_REL_SIZE;
  const nodeColor = (n) => {
    if (!isActive(n.id)) return COLOR.dim; // 비활성 dim
    return n.isHub ? COLOR.hub : COLOR.node;
  };

  // ── 라벨(CSS2D HTML 오버레이 — 줌/거리와 무관하게 항상 일정 px) ──
  const labelLines = (n) => {
    const m = n.member || {};
    const lines = [];
    if (labelFields.name || n.isHub) lines.push({ field: "name", text: m.name ?? n.name });
    if (labelFields.career && Number.isFinite(m.career)) lines.push({ field: "career", text: `${m.career}년` });
    if (labelFields.nickname && m.nickname) lines.push({ field: "nickname", text: m.nickname });
    if (labelFields.interest && m.interestTags?.length)
      lines.push({ field: "interest", text: m.interestTags.slice(0, LABEL_INTEREST_MAX).join(" · ") });
    if (labelFields.affiliation) {
      const org = m.company || m.pastOrgs?.[0];
      if (org) lines.push({ field: "affiliation", text: org });
    }
    return lines;
  };

  // 기존 div의 자식만 교체(내용 in-place 갱신) — 라벨 DOM 생성/파괴 없음 → 잔상 방지.
  const renderLabelContent = (n, div) => {
    div.replaceChildren();
    const lines = labelLines(n);
    if (!lines.length) {
      div.style.display = "none";
      return;
    }
    div.style.display = "";
    lines.forEach((line, i) => {
      const span = document.createElement("span");
      span.className = `${i === 0 ? "main" : "sub"} lf-${line.field}`;
      span.textContent = line.text; // textContent → XSS 안전
      div.appendChild(span);
    });
  };

  // 노드당 라벨 객체를 "최초 1회만" 생성(빈 라벨도 div를 만들어 display:none).
  // 이후 토글은 renderLabelContent로 내용만 갱신 → nodeThreeObject 재호출 불필요(잔상 원천 제거).
  const buildLabelObject = (n) => {
    const div = document.createElement("div");
    div.className = n.isHub ? "graph-label is-hub" : "graph-label";
    renderLabelContent(n, div);
    div.style.opacity = isActive(n.id) ? "1" : "0.12";
    const obj = new CSS2DObject(div);
    obj.position.set(0, nodeRadius(n) + 4, 0); // 노드 위로 살짝 띄움(앵커만 월드 좌표)
    labelDivs.set(n.id, div);
    return obj;
  };

  // ── 엣지 스타일 ──
  const linkColor = (l) => {
    if (l.type === "hub") return EDGE_COLORS.hub; // 허브는 항상 동일(점선 가이드 — dim 안 함, 공유 머티리얼 보호)
    const s = rawId(l.source);
    const t = rawId(l.target);
    const incident = selectedId == null || s === selectedId || t === selectedId;
    return incident ? EDGE_COLORS[l.type] : COLOR.dim;
  };
  // 굵기: 허브=0(가는 1px 점선 라인) · 노드-노드는 튜브로 더 두드러지게(협업 엣지를 가장 굵게 강조).
  const linkWidth = (l) =>
    l.type === "hub"
      ? 0
      : l.type === "collaboration"
        ? 1.4
        : l.type === "affiliation"
          ? 1.1
          : 0.8;
  // flow 파티클 — 허브(흰색)·소속(녹색)·협업(오렌지) 엣지에 흐름. 관심사는 정적.
  const particleCount = (l) =>
    linkVisible[l.type] &&
    (l.type === "hub" || l.type === "affiliation" || l.type === "collaboration")
      ? 2
      : 0;

  // 허브 엣지 점선 머티리얼(가는 흰색) — width=0 라인에만 적용. computeLineDistances 필요(onEngineStop).
  const hubDashMaterial = new THREE.LineDashedMaterial({
    color: new THREE.Color(EDGE_COLORS.hub),
    transparent: true,
    opacity: 0.38, // 조금 더 가늘고 옅게(거슬리지 않게)
    dashSize: 2.2,
    gapSize: 2.2,
  });
  const linkMaterial = (l) => (l.type === "hub" ? hubDashMaterial : undefined);

  // 허브 엣지 거리 = 협업 연차 역매핑(오래 알수록 중심에 가깝게). 소속/관심사는 짧게(군집).
  const hubLinkDistance = (weight) => {
    const w = clamp(weight, 1, 30);
    return 220 - ((w - 1) / 29) * (220 - 70); // weight↑ → distance↓
  };

  // ── CSS2D 라벨 렌더러(HTML 오버레이) — 드래그 방해 없도록 pointer-events 차단 ──
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.pointerEvents = "none";

  // ── ForceGraph3D 인스턴스 ──
  const graph3d = ForceGraph3D({ extraRenderers: [labelRenderer] })(el)
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
    .linkMaterial(linkMaterial) // 허브만 점선 머티리얼(나머지는 기본=녹색 튜브)
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

  // ── 상태 반영 ── (선택에 따라 색/라벨만 갱신. linkWidth 재적용 금지 — 허브 라인
  //    geometry 재생성 시 점선 lineDistances가 사라지므로 색만 갱신한다.)
  const refresh = () => {
    graph3d.nodeColor(nodeColor).linkColor(linkColor);
    for (const [id, div] of labelDivs) {
      div.style.opacity = isActive(id) ? "1" : "0.12";
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

  // 초기 전체 맞춤(엔진 안정화 후 1회) + 허브 점선 거리 계산.
  // LineDashedMaterial는 lineDistances가 있어야 dash를 그린다. computeLineDistances는
  // THREE.Line 객체의 메서드 → 씬을 순회해 허브 점선 머티리얼을 쓰는 Line에 1회 계산.
  const computeHubDashes = () => {
    graph3d.scene().traverse((obj) => {
      if (obj.isLine && obj.material === hubDashMaterial) obj.computeLineDistances();
    });
  };
  let fitted = false;
  graph3d.onEngineStop(() => {
    computeHubDashes();
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
      // 기존 div 내용만 in-place 갱신(재생성 안 함 → 잔상 방지).
      for (const [id, div] of labelDivs) renderLabelContent(nodeById.get(id), div);
      refresh(); // opacity(dim) 재적용
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
