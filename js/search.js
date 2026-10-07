// search.js — 헤더 검색: 이름·닉네임·조직 부분일치 → 노드 선택(fly-to).
//
// matchMembers()는 순수 함수(node --test 대상). initSearch()는 DOM 바인딩 전용이며
// 모듈 최상위에서는 document에 접근하지 않는다(테스트 import 안전).

const DEFAULT_LIMIT = 8;

/**
 * 검색 매칭 — 점수: 이름 접두(0) < 이름 포함(1) < 닉네임 포함(2) < 조직 포함(3). 동점은 이름순.
 * @param {Object[]} nodes GraphNode[] (node.member 사용)
 * @param {string} query
 * @param {number} [limit]
 * @returns {{node: Object, field: "name"|"nickname"|"org", text: string}[]}
 */
export function matchMembers(nodes, query, limit = DEFAULT_LIMIT) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return [];
  const hits = [];
  for (const node of nodes) {
    const m = node.member || {};
    const name = (m.name ?? "").toLowerCase();
    let hit = null;
    if (name.startsWith(q)) hit = { score: 0, field: "name", text: m.company ?? "" };
    else if (name.includes(q)) hit = { score: 1, field: "name", text: m.company ?? "" };
    else if ((m.nickname ?? "").toLowerCase().includes(q)) hit = { score: 2, field: "nickname", text: m.company ?? "" };
    else {
      const org = [m.company, ...(m.pastOrgs || [])].find((o) => o && o.toLowerCase().includes(q));
      if (org) hit = { score: 3, field: "org", text: org };
    }
    if (hit) hits.push({ node, ...hit });
  }
  return hits
    .sort((a, b) => a.score - b.score || (a.node.member.name ?? "").localeCompare(b.node.member.name ?? ""))
    .slice(0, limit)
    .map(({ node, field, text }) => ({ node, field, text }));
}

/**
 * 검색 입력·드롭다운 바인딩. ⌘K/Ctrl+K 또는 `/`로 포커스, ↑↓ 이동, Enter 선택, Esc 닫기.
 * @param {{input: HTMLInputElement, list: HTMLElement, nodes: Object[], onPick: (node: Object) => void}} opts
 * @returns {{focus: () => void, close: () => void}}
 */
export function initSearch({ input, list, nodes, onPick }) {
  let results = [];
  let active = -1;

  const close = () => {
    list.hidden = true;
    list.replaceChildren();
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  };

  const setActive = (i) => {
    active = i;
    list.querySelectorAll('[role="option"]').forEach((li, idx) => {
      li.classList.toggle("is-active", idx === i);
      if (idx === i) input.setAttribute("aria-activedescendant", li.id);
    });
  };

  const pick = (i) => {
    const r = results[i];
    if (!r) return;
    input.value = "";
    close();
    input.blur();
    onPick(r.node);
  };

  const renderList = () => {
    results = matchMembers(nodes, input.value);
    list.replaceChildren();
    if (!input.value.trim()) return close();
    if (!results.length) {
      const li = document.createElement("li");
      li.className = "search-empty";
      li.textContent = "No match";
      list.appendChild(li);
    }
    results.forEach((r, i) => {
      const li = document.createElement("li");
      li.id = `search-opt-${i}`;
      li.setAttribute("role", "option");
      const name = document.createElement("b");
      name.textContent = r.node.member.name; // textContent → XSS 안전
      const sub = document.createElement("span");
      sub.textContent = r.field === "nickname" ? `${r.node.member.nickname} · ${r.text}` : r.text;
      li.append(name, sub);
      // blur보다 먼저 처리되도록 mousedown에서 선택
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        pick(i);
      });
      list.appendChild(li);
    });
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    setActive(results.length ? 0 : -1);
  };

  input.addEventListener("input", renderList);
  input.addEventListener("focus", () => input.value.trim() && renderList());
  input.addEventListener("blur", close);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && results.length) {
      e.preventDefault();
      setActive((active + 1) % results.length);
    } else if (e.key === "ArrowUp" && results.length) {
      e.preventDefault();
      setActive((active - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(active >= 0 ? active : 0);
    } else if (e.key === "Escape") {
      input.value = "";
      close();
      input.blur();
    }
  });

  const focus = () => {
    input.focus();
    input.select();
  };

  document.addEventListener("keydown", (e) => {
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "");
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      focus();
    } else if (e.key === "/" && !typing) {
      e.preventDefault();
      focus();
    }
  });

  return { focus, close };
}
