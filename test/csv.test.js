const assert = require("node:assert/strict");
const test = require("node:test");
const { parseCsv } = require("../src/csv");

test("쉼표와 줄바꿈이 있는 CSV 값을 파싱한다", () => {
  const rows = parseCsv('이름,주소,메모\n"테스트,주차장","경기도 용인시","A\nB"\n');

  assert.equal(rows.length, 1);
  assert.equal(rows[0].이름, "테스트,주차장");
  assert.equal(rows[0].주소, "경기도 용인시");
  assert.equal(rows[0].메모, "A\nB");
});
