// data.js — 데이터 로드·폴백·파싱 (Phase 2, PRD §3.1·§8.5)
//
// 흐름: fetch(SHEET_CSV_URL) ──실패──▶ fetch(SNAPSHOT_URL) ──실패──▶ loadError
// 파서는 PapaParse(전역 Papa, CDN UMD) — gviz CSV의 따옴표/콤마/줄바꿈 처리 때문에 직접 split 금지.

// 구글시트 gviz CSV 엔드포인트 (PRD §8.5, CORS 허용)
export const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1fychV7omFIle0GpBAF2_ccAyF0cZAtY7IFsmkIS5sic/gviz/tq?tqx=out:csv&gid=0";

// 폴백 스냅샷 (저장소 동봉, 동일 스키마 — 수동 갱신)
export const SNAPSHOT_URL = "data/snapshot.csv";

// 라이브 fetch 타임아웃 — 시트 응답 지연 시 스냅샷 폴백 유도(3초 렌더 목표 안전장치)
const FETCH_TIMEOUT_MS = 5000;

// AbortController 타임아웃을 두른 fetch. res.ok 아니면 throw.
async function fetchWithTimeout(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

// CSV 텍스트 → 행 배열. header:true 로 첫 행을 컬럼명으로, 빈 줄은 스킵.
function parseCsv(text) {
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

/**
 * 데이터 로드 + 폴백.
 * @returns {Promise<{rows: Object[], source: ("live"|"snapshot"|null), error: (Error|null)}>}
 *   - 라이브 성공:   { rows, source: "live",     error: null }
 *   - 스냅샷 폴백:   { rows, source: "snapshot", error: null }
 *   - 둘 다 실패:    { rows: [],  source: null,   error: Error }
 */
export async function loadData() {
  // (1) 라이브 시도
  try {
    const rows = parseCsv(await fetchWithTimeout(SHEET_CSV_URL));
    if (!rows.length) throw new Error("빈 시트 응답"); // 헤더만/빈 응답은 실패로 간주
    return { rows, source: "live", error: null };
  } catch (e) {
    console.warn("[NODE] live fetch 실패, 스냅샷 폴백:", e);
  }

  // (2) 스냅샷 폴백
  try {
    const rows = parseCsv(await fetchWithTimeout(SNAPSHOT_URL));
    return { rows, source: "snapshot", error: null };
  } catch (e) {
    console.error("[NODE] 스냅샷 폴백도 실패:", e);
    return { rows: [], source: null, error: e };
  }
}
