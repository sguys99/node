import test from "node:test";
import assert from "node:assert/strict";
import { yearsKnown, orbitRadius, ORBIT, RING_YEARS } from "../js/layout.js";

test("yearsKnown: 기준연도 차이, 최소 1", () => {
  assert.equal(yearsKnown(2020, 2026), 6);
  assert.equal(yearsKnown(2026, 2026), 1);
  assert.equal(yearsKnown(2030, 2026), 1);
  assert.equal(yearsKnown(NaN, 2026), 1);
});

test("orbitRadius: 오래 알수록 중심에 가깝고 단조 감소", () => {
  assert.equal(orbitRadius(1), ORBIT.R_MAX);
  assert.equal(orbitRadius(ORBIT.W_MAX), ORBIT.R_MIN);
  assert.equal(orbitRadius(999), ORBIT.R_MIN);
  assert.ok(orbitRadius(2) > orbitRadius(6));
  assert.ok(orbitRadius(6) > orbitRadius(16));
});

test("RING_YEARS: 최근→과거 순", () => {
  assert.deepEqual(RING_YEARS, [2024, 2020, 2010, 2000]);
});
