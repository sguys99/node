// render.js — Command HUD 3D 지식그래프 렌더 + 인터랙션 (3d-force-graph / Three.js)
//
// 흐름: buildGraph() → { nodes, links } ──render()──▶ 3D 렌더 + controller 반환
//   - 레이아웃: 기울어진 원반. 허브로부터 반경 = 인연 기간(로그 스케일, 오래 알수록 가깝게).
//     warmup으로 미리 계산 → 인트로에서 허브로부터 확산 → 이후 정적 고정(노드 드래그 없음).
//   - 무대: scene.js(배경·레이더 그리드·연차 링·스윕·블룸). 노드: nodes.js(Blip·허브·라벨·레티클).
//   - 엣지: 소속=그린 · 협업=골드 · 관심사=연녹(기본 off) · 허브=옅은 점선. Normal 블렌딩(무발광).
//     flow 파티클은 선택 노드의 소속/협업 incident 엣지에만.
//   - 라벨: CSS2D 고정 px + labels.js 충돌 정리(허브 > 선택 > 호버 > 이웃 > 크기).
//   - 인터랙션: 드래그 회전 + 관성, 노드 클릭 → fly-to + 레티클 + dim + onSelect. 자동 회전 없음.
//
// 색은 css/tokens.css 변수를 read(JS 하드코딩 hex 금지).

import * as THREE from "https://esm.sh/three@0.180.0";
import ForceGraph3D from "https://esm.sh/3d-force-graph@1.73.4?deps=three@0.180.0";
import { CSS2DRenderer } from "https://esm.sh/three@0.180.0/examples/jsm/renderers/CSS2DRenderer.js";
import { forceRadial, forceY } from "https://esm.sh/d3-force-3d@3";
import { BASE_YEAR } from "./normalize.js";
import { orbitRadius, yearsKnown } from "./layout.js";
import { createDeclutter } from "./labels.js";
import { dressScene } from "./scene.js";
import { createNodeFactory } from "./nodes.js";
import { homePosition, flyTo, waitForLayout, freezeLayout, playIntro } from "./camera.js";

// ── 디자인 토큰 read ──
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const cssPx = (name) => parseFloat(css(name)) || 0;

// ── 렌더 튜닝 상수 ──
const HUB_VAL_MULT = 2.2; // 허브 크기 배수
const NODE_SCALE = 4.2; // 일반 노드 반경 = ∛val × 4.2
const HUB_SCALE = 3.2;
const WARMUP_TICKS = 300;
const LINK = {
  width: { hub: 0, affiliation: 0.7, collaboration: 1.1, interest: 0.4 },
  opacity: { hub: 0.45, affiliation: 0.42, collaboration: 0.7, interest: 0.35 },
  focusOpacity: 0.95, // 선택 incident 엣지
  dimOpacity: 0.012, // 선택 시 나머지(sRGB 출력에선 낮은 알파도 진해 보여 작게)
  distance: 28, // 소속/협업/관심사 링크 길이(군집)
  strength: { hub: 0, affiliation: 0.3, collaboration: 0.3, interest: 0.02 },
};
const RADIAL_STRENGTH = 0.9;
const FLATTEN_STRENGTH = 0.18; // 원반 두께(forceY)
const CHARGE = -35;
const PARTICLE = { count: 2, width: 1.4, speed: 0.004 };
const DAMPING = 0.12; // trackball dynamicDampingFactor(낮을수록 관성↑)
const FLY = { distance: 340, hubDistance: 460, ms: 900 };
const INTRO_MS = 1600;
const INTRO_DOLLY = 1.9; // 인트로 시작 카메라 거리 배수
const RESET_MS = 800;
const DASH_REFRESH_FRAMES = 30; // 허브 점선 lineDistances 재계산 주기
const LABEL_PRIORITY = { hub: 1e7, selected: 1e6, hover: 5e5, neighbor: 1e5 };
const RETICLE_PAD = 14; // 레티클 = 마커 지름 + 여백(px)

const rawId = (endpoint) =>
  typeof endpoint === "object" && endpoint !== null ? endpoint.id : endpoint;

/**
 * Command HUD 지식그래프 렌더 + 인터랙션.
 * @param {{nodes: Object[], links: Object[]}} graph buildGraph() 출력
 * @param {{container: string|HTMLElement}} [opts]
 * @returns {Object} controller (setLabelFields, setLinkTypeVisibility, highlightNode, focusNode,
 *                    resetView, playIntro, onSelect)
 */
export function render(graph, opts = {}) {
  const el =
    typeof opts.container === "string"
      ? document.querySelector(opts.container)
      : opts.container || document.getElementById("graph");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const COLORS = {
    canvas: css("--hud-canvas"),
    canvasGlow: css("--hud-canvas-glow"),
    grid: css("--hud-grid"),
    gridSoft: css("--hud-grid-soft"),
    sweep: css("--color-primary"),
    blip: css("--hud-blip"),
    selected: css("--hud-ink"),
    hub: css("--color-primary"),
    satellite: css("--color-body"),
  };
  const EDGE_COLORS = {
    hub: css("--hud-dim"),
    affiliation: css("--color-primary"),
    interest: css("--color-primary-soft"),
    collaboration: css("--graph-collaboration"),
  };

  // ── 이웃(노드-노드 관계만 — 허브 엣지는 전원 연결이라 강조 의미 없음) ──
  const neighbors = new Map(graph.nodes.map((n) => [n.id, new Set()]));
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  for (const l of graph.links) {
    if (l.type === "hub") continue;
    neighbors.get(rawId(l.source))?.add(rawId(l.target));
    neighbors.get(rawId(l.target))?.add(rawId(l.source));
  }

  // ── 런타임 상태 ──
  let selectedId = null;
  let hoverId = null;
  const linkVisible = { hub: true, affiliation: true, interest: false, collaboration: true };
  const labelFields = { name: true, career: false, nickname: false, interest: false, affiliation: true };

  const isActive = (id) =>
    selectedId == null || id === selectedId || nodeById.get(id)?.isHub || neighbors.get(selectedId)?.has(id);
  const isIncident = (l) =>
    selectedId != null && (rawId(l.source) === selectedId || rawId(l.target) === selectedId);

  const nodeVal = (n) => (n.isHub ? n.val * HUB_VAL_MULT : n.val);
  const nodeRadius = (n) => Math.cbrt(Math.max(1, nodeVal(n))) * (n.isHub ? HUB_SCALE : NODE_SCALE);

  const factory = createNodeFactory({
    colors: COLORS,
    reducedMotion,
    radius: nodeRadius,
    fields: () => labelFields,
  });

  // ── 엣지 머티리얼: 허브 = 공유 점선 / 노드-노드 = 링크별(개별 dim) ──
  const hubDash = new THREE.LineDashedMaterial({
    color: EDGE_COLORS.hub,
    transparent: true,
    opacity: LINK.opacity.hub,
    dashSize: 2.2,
    gapSize: 2.6,
    depthWrite: false,
  });
  const linkMats = new Map();
  const linkMaterial = (l) => {
    if (l.type === "hub") return hubDash;
    if (!linkMats.has(l)) {
      linkMats.set(
        l,
        new THREE.MeshBasicMaterial({
          color: EDGE_COLORS[l.type],
          transparent: true,
          opacity: LINK.opacity[l.type],
          depthWrite: false,
        })
      );
    }
    return linkMats.get(l);
  };
  const particleCount = (l) =>
    linkVisible[l.type] && (l.type === "affiliation" || l.type === "collaboration") && isIncident(l)
      ? PARTICLE.count
      : 0;

  // ── CSS2D 라벨 렌더러(드래그 방해 없도록 pointer-events 차단) ──
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.domElement.style.pointerEvents = "none";

  const graph3d = ForceGraph3D({ extraRenderers: [labelRenderer] })(el)
    .showNavInfo(false)
    .backgroundColor(COLORS.canvas)
    .graphData(graph)
    .nodeLabel(() => "") // 기본 툴팁 끔(라벨이 대신함)
    .nodeThreeObject((n) => factory.build(n))
    .nodeThreeObjectExtend(false)
    .linkMaterial(linkMaterial)
    .linkWidth((l) => LINK.width[l.type])
    .linkResolution(8)
    .linkVisibility((l) => linkVisible[l.type])
    .linkDirectionalParticles(particleCount)
    .linkDirectionalParticleWidth(PARTICLE.width)
    .linkDirectionalParticleSpeed(PARTICLE.speed)
    .linkDirectionalParticleColor((l) => EDGE_COLORS[l.type])
    .enableNodeDrag(false) // 드래그는 항상 회전(정적 레이아웃)
    .warmupTicks(WARMUP_TICKS)
    .width(el.clientWidth)
    .height(el.clientHeight);

  // ── 레이아웃 force: 연차 반경(radial) + 평면화(y) + 군집(link) ──
  graph3d
    .d3Force("link")
    .distance(LINK.distance)
    .strength((l) => LINK.strength[l.type]);
  graph3d.d3Force(
    "radial",
    forceRadial(
      (n) => (n.isHub ? 0 : orbitRadius(yearsKnown(n.member?.sinceYear))),
      0,
      0,
      0
    ).strength(RADIAL_STRENGTH)
  );
  graph3d.d3Force("flatten", forceY(0).strength(FLATTEN_STRENGTH));
  graph3d.d3Force("charge").strength(CHARGE);

  const stage = dressScene(graph3d, { colors: COLORS, reducedMotion, baseYear: BASE_YEAR });
  graph3d.scene().add(factory.reticle);

  // ── 컨트롤: 드래그 회전 + 관성 ──
  const controls = graph3d.controls();
  controls.staticMoving = false;
  controls.dynamicDampingFactor = DAMPING;
  controls.rotateSpeed = 1.1;

  // ── 라벨 정리(declutter) ──
  const sizeCache = new Map(); // id -> {w, h}
  const v3 = new THREE.Vector3();
  const labelItems = () => {
    const cam = graph3d.camera();
    const w = el.clientWidth;
    const h = el.clientHeight;
    const items = [];
    for (const n of graph.nodes) {
      const div = factory.labelDiv(n.id);
      if (!div || !Number.isFinite(n.x) || div.classList.contains("is-empty")) continue;
      // CSS2D는 화면 밖 라벨을 display:none 처리 → 크기 0은 캐시하지 않고 이번 배치에서 제외
      if (!sizeCache.has(n.id)) {
        if (!div.offsetWidth) continue;
        sizeCache.set(n.id, { w: div.offsetWidth, h: div.offsetHeight });
      }
      const { w: bw, h: bh } = sizeCache.get(n.id);
      v3.set(n.x, n.y + factory.labelAnchorY(n), n.z).project(cam);
      const sx = ((v3.x + 1) / 2) * w;
      const sy = ((1 - v3.y) / 2) * h;
      const pri =
        (n.isHub ? LABEL_PRIORITY.hub : 0) +
        (n.id === selectedId ? LABEL_PRIORITY.selected : 0) +
        (n.id === hoverId ? LABEL_PRIORITY.hover : 0) +
        (selectedId != null && neighbors.get(selectedId)?.has(n.id) ? LABEL_PRIORITY.neighbor : 0) +
        nodeVal(n) * 100 -
        v3.z * 50;
      // 라벨 하단이 앵커에 붙으므로 박스는 앵커 위쪽
      items.push({ id: n.id, x: sx - bw / 2, y: sy - bh, w: bw, h: bh, pri, off: v3.z > 1 || !isActive(n.id) });
    }
    return items;
  };
  const declutter = createDeclutter({
    items: labelItems,
    apply: (visible) => {
      for (const n of graph.nodes) {
        factory.labelDiv(n.id)?.classList.toggle("is-culled", !visible.has(n.id));
      }
    },
  });

  // 허브 점선은 lineDistances가 있어야 dash를 그린다 → 좌표 변경·재생성 대비 주기적 재계산.
  const computeHubDashes = () => {
    graph3d.scene().traverse((obj) => {
      if (obj.isLine && obj.material === hubDash) obj.computeLineDistances();
    });
  };

  // 선택 레티클 크기 = 화면상 마커 지름 + 여백(줌에 따라 갱신)
  const v3b = new THREE.Vector3();
  const sizeReticle = () => {
    const node = selectedId == null ? null : nodeById.get(selectedId);
    if (!node) return;
    const cam = graph3d.camera();
    v3.set(node.x, node.y, node.z).project(cam);
    v3b.set(factory.markerRadius(node), 0, 0).applyQuaternion(cam.quaternion);
    v3b.add(node).project(cam); // node의 x/y/z를 더해 화면 오른쪽 가장자리 점
    // ndc 차 × 폭/2 = 반경(px) → ×2 = 지름
    factory.sizeReticle(Math.abs(v3b.x - v3.x) * el.clientWidth + RETICLE_PAD);
  };

  // 카메라가 움직이는 동안엔 매 프레임 라벨 정리(정지 시엔 declutter.tick의 스로틀)
  const lastCam = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
  const cameraMoved = () => {
    const cam = graph3d.camera();
    const moved =
      lastCam.p.distanceToSquared(cam.position) > 1e-4 || 1 - Math.abs(lastCam.q.dot(cam.quaternion)) > 1e-8;
    lastCam.p.copy(cam.position);
    lastCam.q.copy(cam.quaternion);
    return moved;
  };

  // ── 프레임 루프(무대·노드 애니메이션, 라벨 정리, 레티클, 점선) ──
  let frame = 0;
  const loop = (t) => {
    stage.tick(t);
    factory.tick(t);
    if (cameraMoved()) declutter.force();
    else declutter.tick();
    sizeReticle();
    if (frame++ % DASH_REFRESH_FRAMES === 0) computeHubDashes();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  // ── 상태 반영(선택 → 노드·엣지·파티클·레티클) ──
  const refresh = () => {
    for (const n of graph.nodes) factory.setActive(n.id, isActive(n.id));
    for (const [l, mat] of linkMats) {
      mat.opacity =
        selectedId == null ? LINK.opacity[l.type] : isIncident(l) ? LINK.focusOpacity : LINK.dimOpacity;
    }
    hubDash.opacity = selectedId == null ? LINK.opacity.hub : LINK.dimOpacity * 3;
    graph3d.linkDirectionalParticles(particleCount);
    factory.placeReticle(selectedId == null ? null : nodeById.get(selectedId));
    declutter.force();
  };

  const widthFraction = () => {
    const w = el.clientWidth;
    if (w < 640) return 1; // 모바일은 폭을 꽉 채움(핀치 줌 보완)
    if (w < 1024) return 0.92;
    const side = 2 * (cssPx("--panel-width") + cssPx("--hud-gutter") * 1.5);
    return Math.max(0.45, (w - side) / w);
  };
  const home = () => {
    const cam = graph3d.camera();
    return homePosition(graph.nodes, { aspect: cam.aspect, fov: cam.fov, widthFraction: widthFraction() });
  };
  const ORIGIN = { x: 0, y: 0, z: 0 };

  const select = (id, { fly = false, notify = false } = {}) => {
    selectedId = id;
    refresh();
    const node = id == null ? null : nodeById.get(id);
    if (node && fly) {
      flyTo(graph3d, node, {
        distance: node.isHub ? FLY.hubDistance : FLY.distance,
        ms: reducedMotion ? 0 : FLY.ms,
      });
    }
    if (notify) controller.onSelect?.(node);
  };

  // ── 인터랙션 ──
  graph3d
    .onNodeClick((node) => select(selectedId === node.id ? null : node.id, { fly: selectedId !== node.id, notify: true }))
    .onBackgroundClick(() => {
      if (selectedId != null) select(null, { notify: true });
    })
    .onNodeHover((node, prev) => {
      el.style.cursor = node ? "pointer" : "grab";
      if (prev) factory.setHover(prev.id, false);
      if (node) factory.setHover(node.id, true);
      hoverId = node?.id ?? null;
      declutter.force();
    });

  // ── 반응형 리사이즈 ──
  new ResizeObserver(() => {
    graph3d.width(el.clientWidth).height(el.clientHeight);
    declutter.force();
  }).observe(el);

  // ── controller (패널 제어용 핸들) ──
  const controller = {
    /** 라벨 구성 토글 (name/affiliation/career/nickname/interest). */
    setLabelFields(field, on) {
      if (!(field in labelFields)) return;
      labelFields[field] = !!on;
      for (const n of graph.nodes) factory.renderLabel(n, labelFields);
      sizeCache.clear();
      declutter.force();
    },
    /** 엣지 유형 표시 토글 (hub/affiliation/interest/collaboration). */
    setLinkTypeVisibility(type, visible) {
      if (!(type in linkVisible)) return;
      linkVisible[type] = !!visible;
      graph3d.linkVisibility((l) => linkVisible[l.type]).linkDirectionalParticles(particleCount);
    },
    /** 외부에서 선택/해제(카메라 이동·onSelect 통지 없음). */
    highlightNode(node) {
      select(node?.id ?? null);
    },
    /** 선택 + 카메라 이동 + onSelect 통지(검색·연결 목록 탐색). */
    focusNode(id) {
      if (nodeById.has(id)) select(id, { fly: true, notify: true });
    },
    /** 카메라를 홈 시점으로(선택 유지). */
    resetView(ms = RESET_MS) {
      graph3d.cameraPosition(home(), ORIGIN, reducedMotion ? 0 : ms);
    },
    /**
     * 인트로: 허브에서 노드 확산 + 카메라 dolly-in(모션 축소 시 즉시 최종 상태).
     * @param {{onStart?: () => void}} [opts] onStart = 첫 프레임이 확산 시작 상태로 그려진 뒤 호출(로딩 HUD 해제 시점)
     */
    async playIntro({ onStart } = {}) {
      await waitForLayout(graph.nodes);
      const target = home();
      if (reducedMotion) {
        freezeLayout(graph.nodes);
        graph3d.cameraPosition(target, ORIGIN, 0);
        onStart?.();
        return;
      }
      graph3d.cameraPosition(
        { x: target.x * INTRO_DOLLY, y: target.y * INTRO_DOLLY, z: target.z * INTRO_DOLLY },
        ORIGIN,
        0
      );
      graph3d.cameraPosition(target, ORIGIN, INTRO_MS);
      const done = playIntro(graph3d, graph.nodes, { ms: INTRO_MS });
      requestAnimationFrame(() => requestAnimationFrame(() => onStart?.()));
      await done;
      computeHubDashes();
    },
    /** 노드 선택 시 호출되는 콜백 슬롯 (좌측 상세 패널이 구독). */
    onSelect: null,
  };

  return controller;
}
