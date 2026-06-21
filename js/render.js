// render.js — Phase 5: 구형(지구본) 지식그래프 렌더링 + 인터랙션 (PRD §3.4·§8.4)
//
// 흐름: buildGraph() → { nodes, links } ──render()──▶ 3d-force-graph 렌더 + controller 반환
//   - 노드: 모노크롬 그레이(비허브) + 그린(허브). 위계는 색이 아닌 크기(√age)·글로우로 표현.
//   - 엣지: type별 색/두께 정적 라인 + 허브 엣지에만 방향성 파티클(헤어볼·성능 보호).
//   - 배경: 반투명 하어라인 와이어프레임 글로브(지구본 메타포).
//   - 글로우: UnrealBloomPass(은은하게) — DESIGN.md "하어라인+글로우만·드롭섀도 금지" 철학과 정합.
//   - controller 반환 → Phase 6 좌/우 패널이 토글·상세·카메라를 제어.
//
// 디자인 제약: 모든 색은 css/tokens.css 변수에서 read(인라인 hex 신규 0건).
// THREE 정합: three·ForceGraph3D·UnrealBloomPass 모두 동일한 esm.sh three@0.180.0
//   인스턴스를 공유한다. 3d-force-graph는 ?deps=three@0.180.0 으로 내부 three 의존을
//   같은 빌드로 고정(?external 대신 ?deps → Timer 등 three 서브경로 import도 esm.sh가
//   일관되게 해결). URL이 동일하므로 브라우저가 단일 모듈로 dedupe → 색 관리 충돌 방지.

import * as THREE from "https://esm.sh/three@0.180.0";
import ForceGraph3D from "https://esm.sh/3d-force-graph@1.73.4?deps=three@0.180.0";
import { UnrealBloomPass } from "https://esm.sh/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "https://esm.sh/three@0.180.0/examples/jsm/postprocessing/OutputPass.js";

// ── 디자인 토큰 read (한 번만 캐시) ──
const css = (name) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const COLOR = {
  primary: css("--color-primary"), // 허브 노드 + 허브 엣지(유일 그린)
  canvas: css("--color-canvas"), // 배경
  ink: css("--color-ink"),
  body: css("--color-body"), // 비허브 노드 그레이
  mute: css("--color-mute"), // 관심사 엣지(가장 옅게)
  hairline: css("--color-hairline"), // 글로브 와이어 + dim 상태
};

// 엣지 type별 색 — hub만 그린 허용(본문 그린 금지 규칙), 나머지 그레이 계열.
const EDGE_COLORS = {
  hub: COLOR.primary,
  affiliation: COLOR.body,
  interest: COLOR.mute,
};

// ── 렌더 튜닝 상수(색/px 아님 → 토큰 무관 로직값) ──
const ROTATE_SPEED = 0.0016; // 글로브 자동 회전 속도(rad/frame)
const NODE_REL_SIZE = 4; // 노드 전체 스케일 보정
const NODE_OPACITY = 0.92;
const LINK_OPACITY = 0.32;
// 블룸은 은은하게(공식 예제 strength=4 대비 대폭↓). threshold로 채도 높은 그린 허브를
// 또렷이, 그레이 노드는 부드럽게 발광시킨다(near-black 배경 위 소프트 앰비언트 글로우).
const BLOOM = { strength: 0.7, radius: 0.4, threshold: 0.3 };
const GLOBE_OPACITY = 0.07;
const GLOBE_FIT = 1.18; // 노드 최외곽 대비 글로브 여유 배율

/** link.source/target는 엔진이 노드 객체로 치환 → 항상 raw id로 환원. */
const rawId = (endpoint) =>
  typeof endpoint === "object" && endpoint !== null ? endpoint.id : endpoint;

/**
 * 구형 지식그래프 렌더 + 인터랙션.
 * @param {{nodes: Object[], links: Object[]}} graph buildGraph() 출력
 * @param {{container: string|HTMLElement}} [opts]
 * @returns {Object} controller (graph3d, setRotation, resetCamera, setLabelFields, setLinkTypeVisibility, highlightNode, onSelect)
 */
export function render(graph, opts = {}) {
  const el =
    typeof opts.container === "string"
      ? document.querySelector(opts.container)
      : opts.container || document.getElementById("graph");

  // ── 하이라이트용 이웃 인접 맵(렌더 시 1회, raw id 기준) ──
  const neighbors = new Map(); // id -> Set(이웃 id)
  graph.nodes.forEach((n) => neighbors.set(n.id, new Set()));
  for (const l of graph.links) {
    const s = rawId(l.source);
    const t = rawId(l.target);
    neighbors.get(s)?.add(t);
    neighbors.get(t)?.add(s);
  }

  // ── 런타임 상태(controller가 변경) ──
  let selectedId = null;
  let rotating = true;
  const linkVisible = { hub: true, affiliation: true, interest: true };
  // 호버 툴팁 구성(우측 설정 패널 "라벨 표시"가 제어 — 상시 라벨 아닌 호버 조합).
  const labelFields = { name: true, age: false, nickname: false, interest: false };
  const LABEL_INTEREST_MAX = 3; // 관심사 라벨 시 표시할 상위 태그 수

  // labelFields에 켜진 항목만 member에서 뽑아 호버 HTML 라벨로 조합.
  const buildLabel = (n) => {
    const m = n.member || {};
    const lines = [];
    if (labelFields.name) lines.push(m.name ?? n.name);
    if (labelFields.age && Number.isFinite(m.age)) lines.push(`나이 ${m.age}`);
    if (labelFields.nickname && m.nickname) lines.push(m.nickname);
    if (labelFields.interest && m.interestTags?.length)
      lines.push(m.interestTags.slice(0, LABEL_INTEREST_MAX).join(" · "));
    return lines.length ? lines.join("\n") : (m.name ?? n.name); // 전부 꺼져도 이름은 표시
  };

  const isActive = (id) =>
    selectedId == null || id === selectedId || neighbors.get(selectedId)?.has(id);

  // ── 노드/엣지 스타일 접근자(상태 반응) ──
  const nodeColor = (n) => {
    // 비허브는 차분한 실버 그레이(body), 허브만 그린. 위계는 색이 아닌 크기·글로우로.
    const base = n.isHub ? COLOR.primary : COLOR.body;
    return isActive(n.id) ? base : COLOR.hairline; // 비활성 → dim
  };
  const linkColor = (l) => {
    const s = rawId(l.source);
    const t = rawId(l.target);
    const incident = selectedId == null || s === selectedId || t === selectedId;
    return incident ? EDGE_COLORS[l.type] : COLOR.hairline;
  };
  const linkWidth = (l) => (l.type === "hub" ? 1.2 : 0.5);
  const particleCount = (l) =>
    l.type === "hub" && linkVisible.hub ? 2 : 0; // 허브 엣지에만 흐름

  // ── ForceGraph3D 인스턴스 ──
  const graph3d = ForceGraph3D()(el)
    .backgroundColor(COLOR.canvas)
    .graphData(graph)
    .nodeRelSize(NODE_REL_SIZE)
    .nodeVal((n) => n.val)
    .nodeOpacity(NODE_OPACITY)
    .nodeColor(nodeColor)
    .nodeLabel(buildLabel) // 호버 HTML 툴팁(3D 씬 밖 → 블룸 영향 없음), 구성은 labelFields가 제어
    .linkVisibility((l) => linkVisible[l.type])
    .linkColor(linkColor)
    .linkWidth(linkWidth)
    .linkOpacity(LINK_OPACITY)
    .linkDirectionalParticles(particleCount)
    .linkDirectionalParticleWidth(1.5)
    .linkDirectionalParticleSpeed(0.006)
    .width(el.clientWidth)
    .height(el.clientHeight);

  // ── 반투명 와이어프레임 글로브(기준 반경 1 → onEngineStop에서 스케일) ──
  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 24),
    new THREE.MeshBasicMaterial({
      color: COLOR.hairline,
      wireframe: true,
      transparent: true,
      opacity: GLOBE_OPACITY,
      depthWrite: false,
    })
  );
  graph3d.scene().add(globe);

  // 시뮬레이션 안정화 후 노드 최외곽을 감싸도록 글로브 크기 보정.
  graph3d.onEngineStop(() => {
    let maxR = 1;
    for (const n of graph3d.graphData().nodes) {
      const r = Math.hypot(n.x || 0, n.y || 0, n.z || 0);
      if (r > maxR) maxR = r;
    }
    globe.scale.setScalar(maxR * GLOBE_FIT);
  });

  // ── 블룸(모던 시그니처) ──
  const bloom = new UnrealBloomPass();
  bloom.strength = BLOOM.strength;
  bloom.radius = BLOOM.radius;
  bloom.threshold = BLOOM.threshold;
  const composer = graph3d.postProcessingComposer();
  composer.addPass(bloom);
  composer.addPass(new OutputPass()); // 톤매핑 + 선형→sRGB 최종 인코딩(컴포저 마지막 패스)
  // 색 관리 정합: 렌더러 출력 색공간을 선형으로 둬 RenderPass가 중간 타깃에 선형으로
  // 기록하게 하고, sRGB 인코딩은 OutputPass에서 "한 번만" 수행한다. (기본 srgb로 두면
  // RenderPass가 한 번, OutputPass가 또 한 번 인코딩 → near-black 배경이 회색으로 들뜸.)
  graph3d.renderer().outputColorSpace = THREE.LinearSRGBColorSpace;

  // ── 자동 회전(기본 on) — scene 회전으로 노드+글로브 함께 도는 지구본 스핀 ──
  (function spin() {
    if (rotating) graph3d.scene().rotation.y += ROTATE_SPEED;
    requestAnimationFrame(spin);
  })();

  // ── 인터랙션: 선택 → 하이라이트 + onSelect 통지 ──
  const refresh = () => {
    graph3d.nodeColor(nodeColor).linkColor(linkColor).linkWidth(linkWidth);
  };

  graph3d
    .onNodeClick((node) => {
      selectedId = selectedId === node.id ? null : node.id; // 같은 노드 재클릭 → 해제
      refresh();
      controller.onSelect?.(selectedId == null ? null : node);
    })
    .onBackgroundClick(() => {
      if (selectedId == null) return;
      selectedId = null;
      refresh();
      controller.onSelect?.(null);
    });

  // ── 컨테이너 반응형 리사이즈 ──
  const ro = new ResizeObserver(() => {
    graph3d.width(el.clientWidth).height(el.clientHeight);
  });
  ro.observe(el);

  // ── controller (Phase 6 패널 제어용 핸들) ──
  const controller = {
    graph3d,
    /** 자동 회전 on/off (우측 설정 패널). */
    setRotation(on) {
      rotating = !!on;
    },
    /** 카메라 줌 리셋 — 전체 그래프가 보이도록 맞춤. */
    resetCamera() {
      graph3d.zoomToFit(800, 80);
    },
    /** 호버 툴팁 라벨 구성 토글 (name/age/nickname/interest). */
    setLabelFields(field, on) {
      if (!(field in labelFields)) return;
      labelFields[field] = !!on;
      graph3d.nodeLabel(buildLabel);
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
    /** 노드 선택 시 호출되는 콜백 슬롯 (Phase 6 좌측 상세 패널이 구독). */
    onSelect: null,
  };

  return controller;
}
