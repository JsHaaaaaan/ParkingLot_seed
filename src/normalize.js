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

function roadAddressOf(row) {
  return valueOf(
    row,
    "소재지도로명주소",
    "road_address",
    "roadAddress",
    "rdnmadr"
  );
}

function lotAddressOf(row) {
  return valueOf(
    row,
    "소재지지번주소",
    "lot_address",
    "lotAddress",
    "lnmadr"
  );
}

function addressText(row) {
  return [roadAddressOf(row), lotAddressOf(row)].filter(Boolean).join(" ");
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
    address.includes(`경기도 ${city}`) || address.includes(`경기도${city}`)
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
    "parkingManagementNumber",
    "prkplceNo"
  );
  const parkingLotName = valueOf(
    row,
    "주차장명",
    "parking_lot_name",
    "parkingLotName",
    "prkplceNm"
  );
  const parkingLotDivision = valueOf(
    row,
    "주차장구분",
    "parking_lot_division",
    "parkingLotDivision",
    "prkplceSe"
  );
  const parkingLotType = valueOf(
    row,
    "주차장유형",
    "parking_lot_type",
    "parkingLotType",
    "prkplceType"
  );

  if (!parkingManagementNumber || !parkingLotName || !parkingLotDivision || !parkingLotType) {
    return null;
  }

  return {
    parking_management_number: parkingManagementNumber,
    parking_lot_name: parkingLotName,
    parking_lot_division: parkingLotDivision,
    parking_lot_type: parkingLotType,
    road_address: roadAddressOf(row),
    lot_address: lotAddressOf(row),
    parking_capacity: integerOf(row, "주차구획수", "parking_capacity", "parkingCapacity", "prkcmprt"),
    alternate_no_division: valueOf(row, "부제시행구분", "alternate_no_division", "alternateNoDivision", "enforceSe"),
    weekday_operating_hours: operatingHours(
      row,
      "평일운영시작시각",
      "평일운영종료시각",
      "weekday_operating_hours"
    ) || operatingHours(row, "weekdayOperOpenHhmm", "weekdayOperColseHhmm", "weekdayOperatingHours"),
    saturday_operating_hours: operatingHours(
      row,
      "토요일운영시작시각",
      "토요일운영종료시각",
      "saturday_operating_hours"
    ) || operatingHours(row, "satOperOperOpenHhmm", "satOperCloseHhmm", "saturdayOperatingHours"),
    holiday_operating_hours: operatingHours(
      row,
      "공휴일운영시작시각",
      "공휴일운영종료시각",
      "holiday_operating_hours"
    ) || operatingHours(row, "holidayOperOpenHhmm", "holidayCloseOpenHhmm", "holidayOperatingHours"),
    lat: decimalOf(row, "위도", "lat", "latitude"),
    lng: decimalOf(row, "경도", "lng", "longitude"),
    basic_parking_time: integerOf(row, "주차기본시간", "basic_parking_time", "basicParkingTime", "basicTime"),
    basic_parking_fee: integerOf(row, "주차기본요금", "basic_parking_fee", "basicParkingFee", "basicCharge"),
    additional_unit_time: integerOf(row, "추가단위시간", "additional_unit_time", "additionalUnitTime", "addUnitTime"),
    additional_unit_fee: integerOf(row, "추가단위요금", "additional_unit_fee", "additionalUnitFee", "addUnitCharge"),
    phone_number: valueOf(row, "전화번호", "phone_number", "phoneNumber"),
  };
}

function seedIdentityKey(row) {
  return [
    row.parking_management_number,
    row.parking_lot_name,
    row.parking_lot_division,
    row.parking_lot_type,
    row.road_address || "",
    row.lot_address || "",
    row.lat ?? "",
    row.lng ?? "",
  ].join("|");
}

function normalizeParkingLots(rows) {
  const deduplicated = new Map();
  rows.map(normalizeParkingLot).filter(Boolean).forEach((row) => {
    deduplicated.set(seedIdentityKey(row), row);
  });
  return Array.from(deduplicated.values()).sort((left, right) =>
    [
      left.parking_management_number.localeCompare(right.parking_management_number, "ko"),
      left.parking_lot_name.localeCompare(right.parking_lot_name, "ko"),
      (left.road_address || "").localeCompare(right.road_address || "", "ko"),
      (left.lot_address || "").localeCompare(right.lot_address || "", "ko"),
    ].find((comparison) => comparison !== 0) || 0
  );
}

module.exports = {
  isTargetRegion,
  normalizeParkingLot,
  normalizeParkingLots,
  operatingHours,
  seedIdentityKey,
};
