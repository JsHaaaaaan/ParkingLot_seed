const assert = require("node:assert/strict");
const test = require("node:test");
const {
  isTargetRegion,
  normalizeParkingLot,
  normalizeParkingLots,
} = require("../src/normalize");

const baseRow = {
  주차장관리번호: "TEST-1",
  주차장명: "테스트 공영주차장",
  주차장구분: "공영",
  주차장유형: "노외",
  소재지도로명주소: "경기도 용인시 처인구 테스트로 1",
  소재지지번주소: "경기도 용인시 처인구 테스트동 1",
  주차구획수: "1,234",
  부제시행구분: "미시행",
  평일운영시작시각: "09:00",
  평일운영종료시각: "18:00",
  토요일운영시작시각: "10:00",
  토요일운영종료시각: "17:00",
  공휴일운영시작시각: "00:00",
  공휴일운영종료시각: "23:59",
  위도: "37.2410864",
  경도: "127.1775537",
  주차기본시간: "30",
  주차기본요금: "500",
  추가단위시간: "10",
  추가단위요금: "200",
  전화번호: "031-000-0000",
};

test("서울 전역과 지정 경기도 시만 대상 지역으로 본다", () => {
  assert.equal(isTargetRegion({ 소재지도로명주소: "서울특별시 강남구 테헤란로 1" }), true);
  assert.equal(isTargetRegion({ 소재지도로명주소: "경기도 용인시 처인구 테스트로 1" }), true);
  assert.equal(isTargetRegion({ 소재지도로명주소: "경기도 고양시 덕양구 테스트로 1" }), false);
});

test("표준데이터 행을 백엔드 seed row로 변환한다", () => {
  const row = normalizeParkingLot(baseRow);

  assert.equal(row.parking_management_number, "TEST-1");
  assert.equal(row.parking_lot_name, "테스트 공영주차장");
  assert.equal(row.parking_capacity, 1234);
  assert.equal(row.weekday_operating_hours, "09:00~18:00");
  assert.equal(row.saturday_operating_hours, "10:00~17:00");
  assert.equal(row.holiday_operating_hours, "00:00~23:59");
  assert.equal(row.lat, 37.2410864);
  assert.equal(row.lng, 127.1775537);
});

test("주차장관리번호 기준으로 중복을 제거한다", () => {
  const rows = normalizeParkingLots([
    baseRow,
    { ...baseRow, 주차장명: "나중 주차장" },
  ]);

  assert.equal(rows.length, 1);
  assert.equal(rows[0].parking_lot_name, "나중 주차장");
});
