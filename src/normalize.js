const {
  TARGET_GYEONGGI_CITIES,
  TARGET_SEOUL_PREFIXES,
} = require("./config");

function text(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = String(value).trim();
  return normalized.length === 0 ? null : normalized;
}

function valueOf(row, ...keys) {
  for (const key of keys) {
    const value = text(row[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
}

function integerOf(row, ...keys) {
  const value = valueOf(row, ...keys);
  if (value === null) {
    return null;
  }
  const normalized = value.replace(/,/g, "");
  if (!/^-?\d+$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}

function decimalOf(row, ...keys) {
  const value = valueOf(row, ...keys);
  if (value === null) {
    return null;
  }
  const normalized = value.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function operatingHours(row, startKey, endKey, fallbackKey) {
  const fallback = valueOf(row, fallbackKey);
  if (fallback) {
    return fallback;
  }

  const start = valueOf(row, startKey);
  const end = valueOf(row, endKey);
  if (!start && !end) {
    return null;
  }
  if (!start) {
    return end;
  }
  if (!end) {
    return start;
  }
  return `${start}~${end}`;
}

function addressText(row) {
  return [
    valueOf(row, "소재지도로명주소", "road_address", "roadAddress"),
    valueOf(row, "소재지지번주소", "lot_address", "lotAddress"),
  ]
    .filter(Boolean)
    .join(" ");
}

function isTargetRegion(row) {
  const address = addressText(row);
  if (!address) {
    return false;
  }

  if (TARGET_SEOUL_PREFIXES.some((prefix) => address.startsWith(prefix))) {
    return true;
  }

  return TARGET_GYEONGGI_CITIES.some((city) =>
    address.includes(`경기도 ${city}`) || address.includes(`경기 ${city}`)
  );
}

function normalizeParkingLot(row) {
  if (!isTargetRegion(row)) {
    return null;
  }

  const parkingManagementNumber = valueOf(
    row,
    "주차장관리번호",
    "parking_management_number",
    "parkingManagementNumber"
  );
  const parkingLotName = valueOf(row, "주차장명", "parking_lot_name", "parkingLotName");
  const parkingLotDivision = valueOf(row, "주차장구분", "parking_lot_division", "parkingLotDivision");
  const parkingLotType = valueOf(row, "주차장유형", "parking_lot_type", "parkingLotType");

  if (!parkingManagementNumber || !parkingLotName || !parkingLotDivision || !parkingLotType) {
    return null;
  }

  return {
    parking_management_number: parkingManagementNumber,
    parking_lot_name: parkingLotName,
    parking_lot_division: parkingLotDivision,
    parking_lot_type: parkingLotType,
    road_address: valueOf(row, "소재지도로명주소", "road_address", "roadAddress"),
    lot_address: valueOf(row, "소재지지번주소", "lot_address", "lotAddress"),
    parking_capacity: integerOf(row, "주차구획수", "parking_capacity", "parkingCapacity"),
    alternate_no_division: valueOf(row, "부제시행구분", "alternate_no_division", "alternateNoDivision"),
    weekday_operating_hours: operatingHours(
      row,
      "평일운영시작시각",
      "평일운영종료시각",
      "평일 운영시간"
    ),
    saturday_operating_hours: operatingHours(
      row,
      "토요일운영시작시각",
      "토요일운영종료시각",
      "토요일 운영 시간"
    ),
    holiday_operating_hours: operatingHours(
      row,
      "공휴일운영시작시각",
      "공휴일운영종료시각",
      "공휴일 운영 시간"
    ),
    lat: decimalOf(row, "위도", "lat", "latitude"),
    lng: decimalOf(row, "경도", "lng", "longitude"),
    basic_parking_time: integerOf(row, "주차기본시간", "basic_parking_time", "basicParkingTime"),
    basic_parking_fee: integerOf(row, "주차기본요금", "basic_parking_fee", "basicParkingFee"),
    additional_unit_time: integerOf(row, "추가단위시간", "additional_unit_time", "additionalUnitTime"),
    additional_unit_fee: integerOf(row, "추가단위요금", "additional_unit_fee", "additionalUnitFee"),
    phone_number: valueOf(row, "전화번호", "phone_number", "phoneNumber"),
  };
}

function normalizeParkingLots(rows) {
  const deduplicated = new Map();
  rows.map(normalizeParkingLot).filter(Boolean).forEach((row) => {
    deduplicated.set(row.parking_management_number, row);
  });
  return Array.from(deduplicated.values()).sort((left, right) =>
    left.parking_management_number.localeCompare(right.parking_management_number, "ko")
  );
}

module.exports = {
  isTargetRegion,
  normalizeParkingLot,
  normalizeParkingLots,
  operatingHours,
};
