// panels.js — Command HUD 패널: KPI 스트립 · 좌측 요약/상세 · 우측 설정 · 상태줄 · 검색 연결.
//
// 흐름: render()의 controller + buildGraph()의 graph + 통계(stats)·클러스터를 받아
//   - KPI: 6개 지표(태블릿 4개 — CSS가 축약)
//   - 좌측: 미선택 = 네트워크 요약(상위 조직·연대 분포) / 선택 = 상세 + Connections(클릭 → 그 노드로 이동)
//   - 우측: Labels·Relations 토글(aria-pressed) → controller, Reset view, 태블릿/모바일 핸들
//   - 상태줄: 출처·동기화 시각 / 헤더 검색 → controller.focusNode
//
// 디자인: 모든 색/타이포/스페이싱은 css 토큰(.hud-* 클래스)에서 read. 사용자 데이터는 esc() 후 주입.

import { initSearch } from "./search.js";

const rawId = (e) => (typeof e === "object" && e !== null ? e.id : e);

/** XSS·마크업 깨짐 방지용 텍스트 이스케이프(사용자 데이터는 구글시트 원형). */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SOURCE_NAME = { live: "Google Sheet", snapshot: "Snapshot" };
const TYPE_RANK = { collaboration: 0, affiliation: 1, interest: 2 };

// ── KPI ──
function kpiHtml(stats) {
  return [
    ["MEMBERS", stats.members],
    ["CLUSTERS", stats.clusters],
    ["AFFIL LINKS", stats.links.affiliation],
    ["COLLAB LINKS", stats.links.collaboration],
    ["AVG CAREER", `${stats.avgCareer}Y`],
    ["LONGEST BOND", `${stats.longestBond}Y`],
  ]
    .map(([k, v]) => `<div class="kpi"><span class="kpi-key">${k}</span><b class="kpi-val">${esc(v)}</b></div>`)
    .join("");
}

// ── 좌측: 네트워크 요약 ──
function overviewHtml(stats, hubName) {
  const maxOrg = stats.topOrgs[0]?.count || 1;
  const maxDec = Math.max(1, ...stats.decades.map((d) => d.count));
  const bars = stats.topOrgs
    .map(
      (o) => `<li>
        <span class="bar-name">${esc(o.name)}</span>
        <span class="bar-track"><i style="width:${(o.count / maxOrg) * 100}%"></i></span>
        <span class="bar-val">${o.count}</span>
      </li>`
    )
    .join("");
  const hist = stats.decades
    .map(
      (d) => `<div class="hist-col">
        <b>${d.count}</b><i style="--h:${(d.count / maxDec).toFixed(3)}"></i><span>${esc(d.label)}</span>
      </div>`
    )
    .join("");

  return `<p class="hud-eyebrow">Network</p>
    <div class="hero">
      <span class="hero-num">${stats.members}</span>
      <span class="hero-unit">domain experts<br />around ${esc(hubName)}</span>
    </div>
    <div class="stat-grid">
      <div class="stat"><b>${stats.clusters}</b><span>Clusters</span></div>
      <div class="stat"><b>${stats.links.affiliation}</b><span>Affiliations</span></div>
      <div class="stat"><b>${stats.links.collaboration}</b><span>Collabs</span></div>
      <div class="stat"><b>${stats.avgCareer}<small>y</small></b><span>Avg career</span></div>
    </div>
    <p class="hud-label">Top organizations</p>
    <ul class="bars">${bars}</ul>
    <p class="hud-label">Since</p>
    <div class="hist">${hist}</div>
    <p class="panel-foot">Longest bond · since ${stats.oldestSince}</p>`;
}

// ── 좌측: 인력 상세 ──

/** 선택 노드의 노드-노드 연결을 사람 단위로 병합(협업 > 소속 > 관심사 순으로 대표 type). */
function connectionsOf(node, graph, nodeById) {
  const byPeer = new Map();
  for (const l of graph.links) {
    if (l.type === "hub") continue;
    const s = rawId(l.source);
    const t = rawId(l.target);
    if (s !== node.id && t !== node.id) continue;
    const peerId = s === node.id ? t : s;
    if (!byPeer.has(peerId)) byPeer.set(peerId, { peer: nodeById.get(peerId), types: new Map() });
    byPeer.get(peerId).types.set(l.type, l.shared ?? []);
  }
  return [...byPeer.values()]
    .map(({ peer, types }) => {
      const type = [...types.keys()].sort((a, b) => TYPE_RANK[a] - TYPE_RANK[b])[0];
      const via = [];
      if (types.has("collaboration")) via.push("Collaborated");
      if (types.has("affiliation")) via.push(types.get("affiliation").join(", "));
      if (!via.length && types.has("interest")) via.push(types.get("interest").join(", "));
      return { peer, type, via: via.join(" · ") };
    })
    .sort((a, b) => TYPE_RANK[a.type] - TYPE_RANK[b.type] || a.peer.member.name.localeCompare(b.peer.member.name));
}

function chipsHtml(label, tags) {
  if (!tags?.length) return "";
  return `<p class="hud-label">${label}</p>
    <div class="chips">${tags.map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>`;
}

function detailHtml(node, conns, cluster, totalMembers) {
  const m = node.member;
  const sub = [
    m.nickname ? `<span>${esc(m.nickname)}</span>` : "",
    cluster ? `<span class="cluster-tag">${esc(cluster.name)} cluster</span>` : "",
    node.isHub ? `<span class="cluster-tag">Hub</span>` : "",
  ].join("");
  const kv = [
    m.company ? `<div class="kv"><span>Now</span><p>${esc(m.company)}</p></div>` : "",
    m.pastOrgs?.length ? `<div class="kv"><span>Past</span><p>${esc(m.pastOrgs.join(" · "))}</p></div>` : "",
  ].join("");

  const connList = node.isHub
    ? `<p class="panel-foot">Connected to all ${totalMembers} experts.</p>`
    : conns.length
      ? `<ul class="conn-list">${conns
          .map(
            (c) => `<li><button type="button" class="conn" data-id="${c.peer.id}">
              <i class="sw sw-${c.type}" aria-hidden="true"></i>
              <b>${esc(c.peer.member.name)}</b><span>${esc(c.via)}</span>
            </button></li>`
          )
          .join("")}</ul>`
      : `<p class="panel-foot">No direct relations yet.</p>`;

  return `<div class="detail-head">
      <div class="avatar" aria-hidden="true">${esc((m.name ?? "").slice(-2))}</div>
      <div>
        <h2 class="detail-name">${esc(m.name)}</h2>
        ${sub ? `<p class="detail-sub">${sub}</p>` : ""}
      </div>
      <button type="button" class="detail-close" aria-label="상세 닫기">✕</button>
    </div>
    <div class="stat-grid">
      <div class="stat"><b>${Number.isFinite(m.career) ? m.career : "—"}<small>y</small></b><span>Career</span></div>
      <div class="stat"><b>${esc(m.sinceYear)}</b><span>Since</span></div>
    </div>
    ${kv}
    ${chipsHtml("Focus", [...(m.doingTags ?? []), ...(m.interestTags ?? [])])}
    ${chipsHtml("Wish", m.wishTags)}
    <p class="hud-label">Connections <em>${node.isHub ? totalMembers : conns.length}</em></p>
    ${connList}`;
}

// 정적 DOM 리스너는 1회만 바인딩(재시도 bootstrap 시 중복 방지). 핸들러는 최신 상태(ctx)를 참조.
let ctx = null;
let bound = false;
const searchNodes = []; // 검색 대상(initPanels마다 내용 교체 — initSearch는 1회 바인딩)

function bindOnce() {
  if (bound) return;
  bound = true;

  const settings = document.getElementById("settings-panel");
  const detailBody = document.getElementById("detail-body");
  const search = document.querySelector(".search");
  const searchInput = document.getElementById("search-input");

  // 라벨 토글(aria-pressed)
  settings.querySelectorAll("[data-label]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(on));
      ctx?.controller.setLabelFields(btn.dataset.label, on);
    });
  });

  // 관계 토글(범례 겸용)
  settings.querySelectorAll("[data-edge]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const on = btn.getAttribute("aria-pressed") !== "true";
      btn.setAttribute("aria-pressed", String(on));
      ctx?.controller.setLinkTypeVisibility(btn.dataset.edge, on);
    });
  });

  document.getElementById("zoom-reset").addEventListener("click", () => ctx?.controller.resetView());

  // 태블릿(상단 접이식) / 모바일(하단 시트) 설정 핸들
  const handle = document.getElementById("settings-handle");
  handle.addEventListener("click", () => {
    const open = settings.classList.toggle("is-open");
    handle.setAttribute("aria-expanded", String(open));
  });

  // 상세 패널: 닫기 · 연결 목록 탐색(이벤트 위임)
  detailBody.addEventListener("click", (e) => {
    const conn = e.target.closest(".conn");
    if (conn) {
      ctx?.controller.focusNode(Number(conn.dataset.id));
      return;
    }
    if (e.target.closest(".detail-close")) {
      ctx?.controller.highlightNode(null);
      ctx?.showOverview();
    }
  });

  // 모바일 검색: 아이콘 → 입력 펼침
  document.getElementById("search-toggle").addEventListener("click", () => {
    search.classList.add("is-open");
    searchInput.focus();
  });
  searchInput.addEventListener("blur", () => search.classList.remove("is-open"));

  // 헤더 검색 → 선택 + 카메라 이동
  initSearch({
    input: searchInput,
    list: document.getElementById("search-list"),
    nodes: searchNodes,
    onPick: (node) => ctx?.controller.focusNode(node.id),
  });
}

/**
 * 패널 초기화. bootstrap() 재호출(재시도) 시에도 안전.
 * @param {Object} controller render()가 반환한 컨트롤러
 * @param {{nodes: Object[], links: Object[]}} graph buildGraph() 출력
 * @param {{clusters: Object, stats: Object, source: string, loadedAt: Date}} info
 */
export function initPanels(controller, graph, { clusters, stats, source, loadedAt }) {
  const narrow = window.matchMedia("(max-width: 1023px)");
  const panelLeft = document.getElementById("detail-panel");
  const detailBody = document.getElementById("detail-body");
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const hub = graph.nodes.find((n) => n.isHub);

  const showOverview = () => {
    detailBody.innerHTML = overviewHtml(stats, hub?.member.name ?? "");
    panelLeft.classList.remove("is-open");
  };
  const showDetail = (node) => {
    detailBody.innerHTML = detailHtml(
      node,
      connectionsOf(node, graph, nodeById),
      clusters.byNode.get(node.id),
      stats.members
    );
    panelLeft.scrollTop = 0;
    if (narrow.matches) panelLeft.classList.add("is-open"); // 드로어 슬라이드인
  };

  ctx = { controller, showOverview };
  searchNodes.splice(0, searchNodes.length, ...graph.nodes);
  bindOnce();

  // KPI · 상태줄
  document.getElementById("kpis").innerHTML = kpiHtml(stats);
  document.getElementById("status-src").textContent = SOURCE_NAME[source] ?? source;
  document.getElementById("status-sync").textContent = loadedAt.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  // 관계 개수(범례) + 마크업 기본값으로 토글 초기 동기화
  const settings = document.getElementById("settings-panel");
  settings.querySelectorAll("[data-edge]").forEach((btn) => {
    btn.querySelector("[data-count]").textContent = stats.links[btn.dataset.edge] ?? 0;
    controller.setLinkTypeVisibility(btn.dataset.edge, btn.getAttribute("aria-pressed") === "true");
  });
  settings.querySelectorAll("[data-label]").forEach((btn) => {
    controller.setLabelFields(btn.dataset.label, btn.getAttribute("aria-pressed") === "true");
  });

  // 좌측 상세 ⇄ 그래프 선택
  controller.onSelect = (node) => (node ? showDetail(node) : showOverview());
  showOverview();
}
