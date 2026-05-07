# 식신로드 주차장 seed 생성기

공공데이터포털 `전국주차장정보표준데이터`만 사용해 식신로드 백엔드용 `parking-lots-seed.json`을 생성한다.

## 데이터 원천

- 원천: https://www.data.go.kr/data/15012896/standard.do
- OpenAPI 요청 주소: `http://api.data.go.kr/openapi/tn_pubr_prkplce_info_api`
- 현재 수집 기준: 2026-05-07 포털 그리드 조회 결과
- 사용 범위:
  - 서울특별시 전역
  - 경기도: 안산, 용인, 김포, 광명, 과천, 안성, 화성, 안양, 평택, 성남, 부천, 수원, 오산, 광주, 하남, 구리, 군포

## 생성 결과

- 생성 파일: `seed-data/parking-lots-seed.json`
- 수집 리포트: `seed-data/portal-grid-report.json`
- 총 주차장 행: 2,528건
- 주차장구분: 공영 2,455건, 민영 73건
- 용인시: 214건
- 좌표 누락: 51건

`주차장관리번호`가 같은데 주차장명/주소가 다른 표준데이터 행이 존재하므로, 관리번호만으로 중복 제거하지 않는다. 동일 행이 도로명/지번 검색에서 중복 수집된 경우에만 제거한다.

## 생성 필드

- 주차장명
- 주차장구분
- 주차장유형
- 소재지도로명주소
- 소재지지번주소
- 주차구획수
- 부제시행구분
- 평일 운영시간
- 토요일 운영 시간
- 공휴일 운영 시간
- 위도
- 경도
- 주차기본시간
- 주차기본요금
- 추가단위시간
- 추가단위요금
- 전화번호

백엔드 seed JSON에서는 snake_case 필드명으로 저장한다.

## 실행 방법

포털 그리드에서 대상 지역을 직접 수집한다. 공공데이터포털 서비스키가 없는 환경에서도 실행 가능하다.

```bash
npm install
npm run build -- --collect-from-portal-grid --portal-report ./output/portal-grid-report.json --output ./output/parking-lots-seed.json --copy-to-capstone
```

공공데이터포털에서 CSV를 내려받은 뒤 변환할 수도 있다.

```bash
npm run build -- --input ./raw/parking-standard.csv --output ./output/parking-lots-seed.json
```

OpenAPI로 가져오려면 공공데이터포털 서비스키를 환경변수로 넣는다.

```bash
set DATA_GO_KR_SERVICE_KEY=...
npm run build -- --output ./output/parking-lots-seed.json
```

현재 레포는 공공데이터포털 표준데이터 외 원천을 사용하지 않는다.

## 검증

```bash
npm test
```

테스트는 CSV 파싱, 지역 필터, OpenAPI 필드 매핑, 운영시간 병합, 숫자/좌표 정규화, 중복 관리번호 보존을 확인한다.
