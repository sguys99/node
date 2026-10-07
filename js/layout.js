// layout.js — 원반(레이더) 레이아웃 순수 계산. THREE/DOM 비의존(node --test 대상).
import { BASE_YEAR } from "./normalize.js";

export const ORBIT = { R_MIN: 64, R_MAX: 280, W_MAX: 30 };
export const RING_YEARS = [2024, 2020, 2010, 2000];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function yearsKnown(sinceYear, baseYear = BASE_YEAR) {
  if (!Number.isFinite(sinceYear)) return 1;
  return Math.max(1, baseYear - sinceYear);
}

export function orbitRadius(w) {
  const t = Math.log(clamp(w, 1, ORBIT.W_MAX)) / Math.log(ORBIT.W_MAX);
  return ORBIT.R_MIN + (ORBIT.R_MAX - ORBIT.R_MIN) * (1 - t);
}
