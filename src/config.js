const TARGET_SEOUL_PREFIXES = ["서울특별시", "서울 "];

const TARGET_SEOUL_DISTRICTS = [
  "강남구",
  "강동구",
  "강북구",
  "강서구",
  "관악구",
  "광진구",
  "구로구",
  "금천구",
  "노원구",
  "도봉구",
  "동대문구",
  "동작구",
  "마포구",
  "서대문구",
  "서초구",
  "성동구",
  "성북구",
  "송파구",
  "양천구",
  "영등포구",
  "용산구",
  "은평구",
  "종로구",
  "중구",
  "중랑구",
];

const TARGET_GYEONGGI_CITIES = [
  "안산시",
  "용인시",
  "김포시",
  "광명시",
  "과천시",
  "안성시",
  "화성시",
  "안양시",
  "평택시",
  "성남시",
  "부천시",
  "수원시",
  "오산시",
  "광주시",
  "하남시",
  "구리시",
  "군포시",
];

const DATA_GO_KR_STANDARD_PAGE_URL =
  "https://www.data.go.kr/tcs/dss/selectStdDataDetailView.do";

const DATA_GO_KR_PUBLIC_DATA_PK = "15012896";

const DEFAULT_API_URL = "http://api.data.go.kr/openapi/tn_pubr_prkplce_info_api";
const DEFAULT_OUTPUT_PATH = "output/parking-lots-seed.json";
const DEFAULT_CAPSTONE_OUTPUT_PATH =
  "../Capstone/Capstone/seed-data/parking-lots-seed.json";

module.exports = {
  DATA_GO_KR_PUBLIC_DATA_PK,
  DATA_GO_KR_STANDARD_PAGE_URL,
  DEFAULT_API_URL,
  DEFAULT_CAPSTONE_OUTPUT_PATH,
  DEFAULT_OUTPUT_PATH,
  TARGET_GYEONGGI_CITIES,
  TARGET_SEOUL_DISTRICTS,
  TARGET_SEOUL_PREFIXES,
};
