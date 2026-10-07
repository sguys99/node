// nodes.js — 노드 3D 객체 팩토리(Blip · 허브) + CSS2D 라벨 · 선택 레티클.
//
// 일반 노드 = Blip: 화면을 향한 평면 마커(링 + 중심 점 + 옅은 내부 채움). 발광 없음(Normal 블렌딩).
// 허브     = 그린 구체 + 로고 오빗 모티프(궤도 링 + 위성 점) + 아주 약한 후광.
// 라벨은 노드 그룹에 붙은 CSS2D div(줌 무관 고정 px). 문구는 labels.labelLines()가 결정.

import * as THREE from "https://esm.sh/three@0.180.0";
import { CSS2DObject } from "https://esm.sh/three@0.180.0/examples/jsm/renderers/CSS2DRenderer.js";
import { labelLines } from "./labels.js";

const BLIP_SCALE = 2.4; // 스프라이트 지름 = 반경 × 2.4
const BLIP_OPACITY = 0.9;
const HOVER_SCALE = 1.25;
const DIM_FACTOR = 0.025; // 비활성 노드 불투명도 배율(sRGB 출력에선 낮은 알파도 진해 보여 작게)
const HUB_HALO_OPACITY = 0.22;
const HUB_ORBIT_SCALE = 2.4; // 궤도 링 반경 = 허브 반경 × 2.4
const HUB_ORBIT_TILT = 0.35;
const SATELLITE_SPEED = 0.0006; // rad/ms
const LABEL_GAP = 6;

/** 링 + 중심 점 Blip 텍스처(흰색 — 머티리얼 color로 틴트). */
function blipTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(255,255,255,0.10)";
  g.beginPath();
  g.arc(64, 64, 54, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(255,255,255,1)";
  g.lineWidth = 7;
  g.beginPath();
  g.arc(64, 64, 54, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = "rgba(255,255,255,1)";
  g.beginPath();
  g.arc(64, 64, 15, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** 허브 후광용 방사형 그라디언트 텍스처. */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,255,255,0.35)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * @param {{colors: Object, reducedMotion: boolean, radius: (node: Object) => number,
 *          fields: () => Object}} opts  fields = 현재 라벨 필드 토글 상태 getter
 */
export function createNodeFactory({ colors, reducedMotion, radius, fields }) {
  const blipTex = blipTexture();
  const glowTex = glowTexture();
  const sphereGeo = new THREE.SphereGeometry(1, 32, 20);
  const parts = new Map(); // id -> { mats: {mat, base}[], blip?, blipScale, label }
  const animated = [];

  function buildHub(group, r) {
    const color = new THREE.Color(colors.hub);
    const core = new THREE.Mesh(sphereGeo, new THREE.MeshLambertMaterial({ color, transparent: true }));
    core.scale.setScalar(r);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: HUB_HALO_OPACITY,
      })
    );
    halo.scale.setScalar(r * 5);

    // 로고 오빗 모티프 — 궤도 링 + 위성 점
    const orbitR = r * HUB_ORBIT_SCALE;
    const pts = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR));
    }
    const ring = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 })
    );
    const satellite = new THREE.Mesh(sphereGeo, new THREE.MeshBasicMaterial({ color: colors.satellite }));
    satellite.scale.setScalar(r * 0.22);
    satellite.position.set(orbitR, 0, 0);
    const orbit = new THREE.Group();
    orbit.rotation.x = HUB_ORBIT_TILT;
    orbit.add(ring, satellite);
    if (!reducedMotion) {
      animated.push((t) => {
        const a = t * SATELLITE_SPEED;
        satellite.position.set(Math.cos(a) * orbitR, 0, Math.sin(a) * orbitR);
      });
    }
    group.add(core, halo, orbit);
    return { mats: [{ mat: core.material, base: 1 }] };
  }

  function buildBlip(group, r) {
    const blip = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: blipTex,
        color: new THREE.Color(colors.blip),
        transparent: true,
        depthWrite: false,
        opacity: BLIP_OPACITY,
      })
    );
    const blipScale = r * BLIP_SCALE;
    blip.scale.setScalar(blipScale);
    group.add(blip);
    return { mats: [{ mat: blip.material, base: BLIP_OPACITY }], blip, blipScale };
  }

  /** 노드 3D 객체(최초 1회). 라벨 div도 여기서 만들고 이후엔 내용만 갱신한다. */
  function build(node) {
    const group = new THREE.Group();
    const r = radius(node);
    const part = node.isHub ? buildHub(group, r) : buildBlip(group, r);

    const label = document.createElement("div");
    label.className = node.isHub ? "graph-label is-hub" : "graph-label";
    const labelObj = new CSS2DObject(label);
    labelObj.center.set(0.5, 1); // div 하단을 앵커에 → 노드 바로 위
    labelObj.position.set(0, labelAnchorY(node), 0);
    group.add(labelObj);

    parts.set(node.id, { ...part, label });
    renderLabel(node, fields());
    return group;
  }

  /** 화면에 보이는 마커 반경(월드 단위) — 허브 구체 / Blip 스프라이트 절반. */
  function markerRadius(node) {
    const r = radius(node);
    return node.isHub ? r : r * (BLIP_SCALE / 2);
  }

  /** 노드 중심 → 라벨 하단 앵커까지의 높이(월드 단위). */
  function labelAnchorY(node) {
    return markerRadius(node) + LABEL_GAP;
  }

  /** 라벨 문구 in-place 갱신(div 재생성 없음 → 잔상 방지). */
  function renderLabel(node, fields) {
    const label = parts.get(node.id)?.label;
    if (!label) return;
    const { main, sub } = labelLines(node.member, fields, node.isHub);
    label.replaceChildren();
    label.classList.toggle("is-empty", !main && !sub);
    if (main) {
      const span = document.createElement("span");
      span.className = "main";
      span.textContent = main; // textContent → XSS 안전
      label.appendChild(span);
    }
    if (sub) {
      const span = document.createElement("span");
      span.className = "sub";
      span.textContent = sub;
      label.appendChild(span);
    }
  }

  function setActive(id, on) {
    for (const { mat, base } of parts.get(id)?.mats ?? []) mat.opacity = on ? base : base * DIM_FACTOR;
  }

  function setHover(id, on) {
    const p = parts.get(id);
    if (p?.blip) p.blip.scale.setScalar(p.blipScale * (on ? HOVER_SCALE : 1));
  }

  // 선택 레티클 — 씬에 1개, 선택 노드 위치로 이동
  const reticleDiv = document.createElement("div");
  reticleDiv.className = "reticle";
  const reticle = new CSS2DObject(reticleDiv);
  reticle.visible = false;

  // 선택 노드 Blip은 밝은 잉크색으로 강조(이전 선택은 원래 색 복원)
  let markedId = null;
  const markSelected = (id) => {
    if (markedId != null) parts.get(markedId)?.blip?.material.color.set(colors.blip);
    if (id != null) parts.get(id)?.blip?.material.color.set(colors.selected);
    markedId = id;
  };

  function placeReticle(node) {
    markSelected(node?.id ?? null);
    if (!node) {
      reticle.visible = false;
      return;
    }
    reticle.position.set(node.x, node.y, node.z);
    reticle.visible = true;
    // 애니메이션 재생(같은 노드 재선택 포함)
    reticleDiv.style.animation = "none";
    void reticleDiv.offsetWidth;
    reticleDiv.style.animation = "";
  }

  return {
    build,
    renderLabel,
    setActive,
    setHover,
    labelDiv: (id) => parts.get(id)?.label,
    labelAnchorY,
    markerRadius,
    reticle,
    placeReticle,
    /** 레티클 한 변(px) — render.js가 화면상 마커 크기로 매 프레임 지정. */
    sizeReticle(px) {
      reticleDiv.style.setProperty("--reticle-size", `${Math.round(px)}px`);
    },
    tick(t) {
      for (const fn of animated) fn(t);
    },
  };
}
