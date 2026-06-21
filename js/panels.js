// panels.js — Phase 6: 좌측 상세 / 우측 설정 패널 (PRD §3.5·§3.6)
//
// 흐름: render()의 controller + buildGraph()의 graph를 받아
//   - 좌측: controller.onSelect 구독 → 선택 노드의 member를 문서형 정보 리스트로 표시.
//   - 우측: 기존 마크업 체크박스/버튼을 controller 메서드(setLabelFields·
//           setLinkTypeVisibility·setRotation·resetCamera)에 바인딩.
//
// 디자인: 모든 색/타이포/스페이싱은 css 토큰(.detail-* 클래스)에서 read.
//   인라인 hex/px 신규 0건·드롭섀도 금지(하어라인 리듬+모노 숫자) — DESIGN.md 정합.

/** 선택 노드 incident 엣지를 type별로 집계 → Map<id, {hub, affiliation, interest}>. */
function buildConnCounts(graph) {
  const rawId = (e) => (typeof e === "object" && e !== null ? e.id : e);
  const counts = new Map();
  for (const n of graph.nodes) {
    counts.set(n.id, { hub: 0, affiliation: 0, interest: 0 });
  }
  for (const l of graph.links) {
    const s = rawId(l.source);
    const t = rawId(l.target);
    if (counts.has(s)) counts.get(s)[l.type]++;
    if (counts.has(t)) counts.get(t)[l.type]++;
  }
  return counts;
}

/** XSS·마크업 깨짐 방지용 텍스트 이스케이프(사용자 데이터는 구글시트 원형). */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** 태그 배열 → .tag-chip 묶음 HTML(빈 배열이면 ""). */
function chipsHtml(tags) {
  if (!tags?.length) return "";
  return tags.map((t) => `<span class="tag-chip">${esc(t)}</span>`).join("");
}

/** eyebrow 라벨 + 값 필드 블록(값 없으면 ""). */
function fieldHtml(label, value) {
  if (!value) return "";
  return `<div class="detail-field">
    <p class="detail-field-label">${esc(label)}</p>
    <p class="detail-field-value">${esc(value)}</p>
  </div>`;
}

/** eyebrow 라벨 + 칩 그룹 섹션(태그 없으면 ""). */
function chipSectionHtml(label, tags) {
  const chips = chipsHtml(tags);
  if (!chips) return "";
  return `<div class="detail-field">
    <p class="detail-field-label">${esc(label)}</p>
    <div class="detail-chips">${chips}</div>
  </div>`;
}

/** 선택 노드 → #detail-content 내부 HTML(문서형 정보 리스트). */
function detailHtml(member, conn) {
  const nick = member.nickname
    ? `<span class="detail-nick">${esc(member.nickname)}</span>`
    : "";
  const pastOrgs = member.pastOrgs?.length ? member.pastOrgs.join(", ") : "";

  const fields = [
    fieldHtml("현직장", member.company),
    fieldHtml("과거 경력", pastOrgs),
  ].filter(Boolean).join("");

  const chips = [
    chipSectionHtml("하는 일", member.doingTags),
    chipSectionHtml("관심사", member.interestTags),
    chipSectionHtml("희망사항", member.wishTags),
  ].filter(Boolean).join("");

  const c = conn || { hub: 0, affiliation: 0, interest: 0 };

  return `<div class="detail-header">
      <h2 class="detail-name">${esc(member.name)}${nick}</h2>
      <button type="button" class="detail-close" aria-label="상세 닫기">✕</button>
    </div>

    <dl class="detail-stats">
      <div class="detail-stat">
        <dt class="detail-stat-label">나이 / 경력</dt>
        <dd class="detail-stat-value">${esc(member.age)}</dd>
      </div>
      <div class="detail-stat">
        <dt class="detail-stat-label">협업 since</dt>
        <dd class="detail-stat-value">${esc(member.sinceYear)}</dd>
      </div>
    </dl>

    ${fields ? `<div class="detail-section">${fields}</div>` : ""}
    ${chips ? `<div class="detail-section">${chips}</div>` : ""}

    <div class="detail-section">
      <p class="detail-field-label">연결</p>
      <div class="detail-conn">
        <span class="detail-conn-item">허브 <b>${c.hub}</b></span>
        <span class="detail-conn-item">소속 <b>${c.affiliation}</b></span>
        <span class="detail-conn-item">관심사 <b>${c.interest}</b></span>
      </div>
    </div>`;
}

/**
 * 좌/우 패널 초기화. bootstrap() 재호출(재시도) 시에도 안전하게 재바인딩.
 * @param {Object} controller render()가 반환한 컨트롤러
 * @param {{nodes: Object[], links: Object[]}} graph buildGraph() 출력
 */
export function initPanels(controller, graph) {
  const connCounts = buildConnCounts(graph);
  const narrow = window.matchMedia("(max-width: 1023px)");

  const panelLeft = document.querySelector(".panel-left");
  const placeholder = document.getElementById("detail-placeholder");
  const content = document.getElementById("detail-content");

  // ── 좌측 상세 패널 ──
  function renderDetail(node) {
    content.innerHTML = detailHtml(node.member, connCounts.get(node.id));
    placeholder.hidden = true;
    content.hidden = false;
    if (narrow.matches) panelLeft.classList.add("is-open"); // 드로어 슬라이드인
    content
      .querySelector(".detail-close")
      ?.addEventListener("click", closeDetail);
  }

  function clearDetail() {
    content.hidden = true;
    content.innerHTML = "";
    placeholder.hidden = false;
    panelLeft.classList.remove("is-open");
  }

  // 닫기 버튼: 그래프 선택 해제 + 패널 정리(highlightNode는 onSelect 미호출 → 직접 clear).
  function closeDetail() {
    controller.highlightNode(null);
    clearDetail();
  }

  controller.onSelect = (node) => (node ? renderDetail(node) : clearDetail());
  clearDetail(); // 초기 상태 보장(재시도 시 이전 상세 제거)

  // ── 우측 설정 패널 ──
  const settings = document.getElementById("settings-panel");

  // 라벨 표시(호버 툴팁 구성) — 마크업 기본은 '이름'만 checked.
  settings.querySelectorAll('input[name="label"]').forEach((cb) => {
    controller.setLabelFields(cb.value, cb.checked); // 초기 동기화
    cb.addEventListener("change", () =>
      controller.setLabelFields(cb.value, cb.checked)
    );
  });

  // 엣지 유형 표시 — 마크업 기본 전부 checked.
  settings.querySelectorAll('input[name="edge"]').forEach((cb) => {
    controller.setLinkTypeVisibility(cb.value, cb.checked); // 초기 동기화
    cb.addEventListener("change", () =>
      controller.setLinkTypeVisibility(cb.value, cb.checked)
    );
  });

  // 자동 회전(기본 on) / 줌 리셋.
  const rotateToggle = document.getElementById("rotate-toggle");
  rotateToggle.addEventListener("change", () =>
    controller.setRotation(rotateToggle.checked)
  );

  document
    .getElementById("zoom-reset")
    .addEventListener("click", () => controller.resetCamera());
}
