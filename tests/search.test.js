import test from "node:test";
import assert from "node:assert/strict";
import { matchMembers } from "../js/search.js";

const n = (id, name, nickname, company, pastOrgs = []) => ({ id, member: { name, nickname, company, pastOrgs } });
const nodes = [n(1, "유광명", "건호아범", "자영업", ["PwC"]), n(2, "김규연", "", "삼성전자", ["마키나락스"]), n(3, "이규", "Dean", "딥세일즈"), n(4, "박지호", "", "PwC")];

test("빈 쿼리는 결과 없음", () => {
  assert.deepEqual(matchMembers(nodes, "  "), []);
});
test("이름 접두 > 이름 포함", () => {
  const r = matchMembers(nodes, "이규");
  assert.equal(r[0].node.id, 3);
});
test("조직 매칭은 field=org, text=조직명, 대소문자 무시, 동점은 이름순", () => {
  const r = matchMembers(nodes, "pwc");
  assert.deepEqual(r.map((x) => [x.node.id, x.field, x.text]), [[4, "org", "PwC"], [1, "org", "PwC"]]);
});
test("닉네임 매칭", () => {
  assert.equal(matchMembers(nodes, "dean")[0].field, "nickname");
});
test("limit 적용", () => {
  assert.equal(matchMembers(nodes, "pwc", 1).length, 1);
});
