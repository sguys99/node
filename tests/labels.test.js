import test from "node:test";
import assert from "node:assert/strict";
import { labelLines, placeLabels, createDeclutter } from "../js/labels.js";

const member = { name: "김규연", nickname: "Kyu", career: 7, company: "삼성전자", pastOrgs: ["마키나락스"], interestTags: ["투자", "AI", "LLM"] };
const F = (o = {}) => ({ name: true, career: false, nickname: false, interest: false, affiliation: false, ...o });

test("labelLines: 이름만", () => {
  assert.deepEqual(labelLines(member, F(), false), { main: "김규연", sub: null });
});
test("labelLines: 보조 줄 순서 org · career · nick · interest", () => {
  const r = labelLines(member, F({ affiliation: true, career: true, nickname: true, interest: true }), false);
  assert.equal(r.sub, "삼성전자 · 7Y · Kyu · 투자 · AI");
});
test("labelLines: 자영업이면 과거경력 첫 값", () => {
  assert.equal(labelLines({ ...member, company: "자영업" }, F({ affiliation: true }), false).sub, "마키나락스");
});
test("labelLines: 허브는 이름 강제·보조 줄 없음", () => {
  assert.deepEqual(labelLines(member, F({ name: false, career: true }), true), { main: "김규연", sub: null });
});
test("labelLines: 이름 끔 + 필드 없음 → 빈 라벨", () => {
  assert.deepEqual(labelLines(member, F({ name: false }), false), { main: "", sub: null });
});

test("placeLabels: 우선순위 높은 라벨이 이김", () => {
  const vis = placeLabels([
    { id: "a", x: 0, y: 0, w: 50, h: 16, pri: 1 },
    { id: "b", x: 10, y: 4, w: 50, h: 16, pri: 5 },
    { id: "c", x: 200, y: 0, w: 50, h: 16, pri: 0 },
  ]);
  assert.deepEqual([...vis].sort(), ["b", "c"]);
});
test("placeLabels: gap 이내 근접도 충돌, off 제외", () => {
  const vis = placeLabels([
    { id: "a", x: 0, y: 0, w: 50, h: 16, pri: 2 },
    { id: "b", x: 54, y: 0, w: 50, h: 16, pri: 1 },
    { id: "c", x: 500, y: 0, w: 50, h: 16, pri: 9, off: true },
  ]);
  assert.deepEqual([...vis], ["a"]);
});

test("createDeclutter: every 프레임마다 apply", () => {
  let calls = 0;
  const d = createDeclutter({ items: () => [], apply: () => calls++, every: 3 });
  for (let i = 0; i < 7; i++) d.tick();
  assert.equal(calls, 3);
  d.force();
  assert.equal(calls, 4);
});
