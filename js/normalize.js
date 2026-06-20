// normalize.js — 동의어 통합·결측치 규칙으로 NormalizedMember[] 생성 (Phase 3, PRD §7)
//
// 흐름: rawRows(한글 컬럼 키) ──normalize()──▶ NormalizedMember[]
//   - 하는일/관심사/희망사항 → toCanonicalTags()로 표준 태그 통합
//   - 닉네임/과거경력 공란 허용(노드는 항상 생성)
//   - 숫자 컬럼 파싱 실패 시 안전 기본값(협업시점=2026, 나이=중앙값) 대체 + 로그
//   - 소속(현직장∪과거경력)은 orgKey()로 매칭 키 정규화 → Phase 4 소속 엣지 입력

// 기준 연도 — 허브 엣지 굵기(2026 - 협업시점) 및 협업시점 결측 기본값.
export const BASE_YEAR = 2026;

/**
 * 동의어 통합 맵. 키는 **소문자·trim 후 비교용**, 값은 표준(canonical) 표기.
 * PRD §7.2 예시 + data/snapshot.csv 실데이터 관찰 변형을 포괄한다.
 * 새 변형이 보이면 여기에 `"<소문자 변형>": "<표준 표기>"` 한 줄을 추가하면 된다.
 */
export const SYNONYM_MAP = {
  // 지식그래프 (관찰: 셀에 "… 등" 꼬리표가 붙은 변형 포함)
  "지식 그래프": "지식그래프",
  "지식그래프 등": "지식그래프",
  "지식 그래프 등": "지식그래프",
  "knowledge graph": "지식그래프",
  // Vibe coding
  "바이브코딩": "Vibe coding",
  "vibe coding": "Vibe coding",
  // AI Agent
  "ai agent": "AI Agent",
  // LLM Framework
  "llm framework": "LLM Framework",
  // 데이터플랫폼
  "data platform": "데이터플랫폼",
  "데이터 플랫폼": "데이터플랫폼",
  // 데이터분석
  "데이터 분석": "데이터분석",
  // AI 트렌드
  "최신 기술 트렌드": "AI 트렌드",
  "최신 ai 트렌드": "AI 트렌드",
  "최신 llm 트렌드": "AI 트렌드",
  // 네트워킹
  "네트워크": "네트워킹",
  "협업 기회": "네트워킹",
  // AI Trading
  "trading": "AI Trading",
  "ai trading": "AI Trading",
};

/**
 * 키워드 셀 → 표준 태그 배열. 콤마 분리 → trim → 빈 값 제거 → 동의어 통합.
 * 미정의 키워드는 원형 유지(PRD §7.2).
 * @param {string=} cell
 * @returns {string[]}
 */
export function toCanonicalTags(cell) {
  if (!cell) return [];
  return cell
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => SYNONYM_MAP[s.toLowerCase()] ?? s);
}

/**
 * 소속 매칭 키 정규화 — 내부/양끝 공백 제거 + 소문자.
 * `LG 전자`·`LG전자` → 동일 키(`lg전자`). 표시값은 바꾸지 않고 매칭에만 쓴다.
 * @param {string=} name
 * @returns {string}
 */
export function orgKey(name) {
  if (!name) return "";
  return name.replace(/\s+/g, "").toLowerCase();
}

/**
 * 소속 셀(콤마 다중) → trim된 표시용 배열. 공란 제거.
 * @param {string=} cell
 * @returns {string[]}
 */
function splitOrgs(cell) {
  if (!cell) return [];
  return cell
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// 숫자 파싱 — 실패 시 NaN 반환(호출부에서 기본값 대체).
function parseNumber(raw) {
  if (raw == null || String(raw).trim() === "") return NaN;
  const n = Number(String(raw).trim());
  return Number.isFinite(n) ? n : NaN;
}

// 중앙값 — 정렬 후 가운데, 짝수 개면 두 값 평균(반올림). 빈 배열은 0.
function median(nums) {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

/**
 * @typedef {Object} NormalizedMember
 * @property {number} id              번호 (PK, 1=유광명)
 * @property {string} name            이름
 * @property {string} nickname        닉네임 (공란 가능 → "")
 * @property {number} sinceYear       협업 시점(연도)
 * @property {number} age             나이(경력) 대용값
 * @property {string} company         현직장 (표시용 원형)
 * @property {string[]} pastOrgs      과거 경력 (표시용 원형, 콤마 분리)
 * @property {string[]} affiliationKeys  현직장∪과거경력의 orgKey 집합(매칭용)
 * @property {string[]} doingTags     하는일 표준 태그
 * @property {string[]} interestTags  관심사 표준 태그
 * @property {string[]} wishTags      희망사항 표준 태그
 */

/**
 * 원본 행 배열 → NormalizedMember[].
 * 노드는 항상 생성한다(결측은 라벨/관계 산정에서만 제외).
 * @param {Object[]} rawRows  PapaParse(header:true) 결과 — 한글 컬럼 키
 * @returns {NormalizedMember[]}
 */
export function normalize(rawRows) {
  // (1패스) 유효 나이 수집 → 결측 대체용 중앙값 산출
  const validAges = [];
  for (const row of rawRows) {
    const age = parseNumber(row["나이(경력)"]);
    if (!Number.isNaN(age)) validAges.push(age);
  }
  const ageFallback = median(validAges);

  // 결측 대체 카운트(요약 로그용)
  let yearSubs = 0;
  let ageSubs = 0;

  // (2패스) 멤버 생성
  const members = rawRows.map((row) => {
    const id = parseNumber(row["번호"]);
    const name = (row["이름"] ?? "").trim();

    let sinceYear = parseNumber(row["협업 시점"]);
    if (Number.isNaN(sinceYear)) {
      console.warn(
        `[NODE] 협업시점 파싱 실패 → 기본값 ${BASE_YEAR} 대체: id=${id} name=${name}`
      );
      sinceYear = BASE_YEAR;
      yearSubs++;
    }

    let age = parseNumber(row["나이(경력)"]);
    if (Number.isNaN(age)) {
      console.warn(
        `[NODE] 나이(경력) 파싱 실패 → 중앙값 ${ageFallback} 대체: id=${id} name=${name}`
      );
      age = ageFallback;
      ageSubs++;
    }

    const company = (row["현직장"] ?? "").trim();
    const pastOrgs = splitOrgs(row["과거 경력"]);

    // 소속 매칭 키: 현직장 ∪ 과거경력 → orgKey → dedupe + 공란 제거
    const affiliationKeys = [
      ...new Set([company, ...pastOrgs].map(orgKey).filter(Boolean)),
    ];

    return {
      id,
      name,
      nickname: (row["닉네임"] ?? "").trim(),
      sinceYear,
      age,
      company,
      pastOrgs,
      affiliationKeys,
      doingTags: toCanonicalTags(row["하는일"]),
      interestTags: toCanonicalTags(row["관심사"]),
      wishTags: toCanonicalTags(row["희망사항"]),
    };
  });

  // 요약 로그 — 총 건수, 표준 태그 고유 집합 크기, 결측 대체 건수
  const tagSet = new Set();
  for (const m of members) {
    m.doingTags.forEach((t) => tagSet.add(t));
    m.interestTags.forEach((t) => tagSet.add(t));
    m.wishTags.forEach((t) => tagSet.add(t));
  }
  console.info(
    `[NODE] 정규화 완료: ${members.length}건, 표준 태그 ${tagSet.size}종, ` +
      `결측 대체(협업시점 ${yearSubs}·나이 ${ageSubs})`
  );

  return members;
}
