# 식신로드 주차장 seed 생성기

공공데이터포털 `전국주차장정보표준데이터`만 사용해 식신로드 백엔드용 `parking-lots-seed.json`을 생성한다.

## 데이터 원천

- 원천: https://www.data.go.kr/data/15012896/standard.do
- 수정일 확인: 2026-04-20
- 갱신주기: 반기
- 사용 범위:
  - 서울특별시 전역
  - 경기도: 안산, 용인, 김포, 광명, 과천, 안성, 화성, 안양, 평택, 성남, 부천, 수원, 오산, 광주, 하남, 구리, 군포

## 생성 필드

- 주차장관리번호
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

공공데이터포털에서 CSV를 내려받은 뒤 실행한다.

```bash
npm install
npm run build -- --input ./raw/parking-standard.csv --output ./output/parking-lots-seed.json
```

Capstone 백엔드 seed-data 디렉터리로 바로 복사하려면:

```bash
npm run build -- --input ./raw/parking-standard.csv --copy-to-capstone
```

Open API로 가져오려면 공공데이터포털에서 제공하는 실제 API URL과 서비스키를 환경변수로 넣는다.

```bash
set DATA_GO_KR_API_URL=https://api.odcloud.kr/api/.../v1/...
set DATA_GO_KR_SERVICE_KEY=...
npm run build -- --output ./output/parking-lots-seed.json
```

현재 레포는 공공데이터포털 표준데이터 외 원천을 사용하지 않는다.

## 검증

```bash
npm test
```

테스트는 CSV 파싱, 지역 필터, 운영시간 병합, 숫자/좌표 정규화를 확인한다.
