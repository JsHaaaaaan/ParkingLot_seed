const {
  DATA_GO_KR_PUBLIC_DATA_PK,
  DATA_GO_KR_STANDARD_PAGE_URL,
  TARGET_GYEONGGI_CITIES,
  TARGET_SEOUL_DISTRICTS,
} = require("./config");

const SEARCH_COLUMNS = ["RDNMADR", "LNMADR"];
const CONCURRENCY = 3;
const RETRY_COUNT = 4;

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#034;/g, "\"")
    .replace(/&#39;/g, "'");
}

function cleanCell(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function extractRowsFromHtml(html) {
  const rowMatches = html.match(/<tr[^>]*class=["'][^"']*contentsTr[^"']*["'][\s\S]*?<\/tr>/gi) || [];
  return rowMatches.map((rowHtml) => {
    const columns = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map((match) => cleanCell(match[1]));

    return {
      parking_management_number: columns[0] || null,
      parking_lot_name: columns[1] || null,
      parking_lot_division: columns[2] || null,
      parking_lot_type: columns[3] || null,
      road_address: columns[4] || null,
      lot_address: columns[5] || null,
      parking_capacity: columns[6] || null,
      alternate_no_division: columns[8] || null,
      weekday_operating_hours: operatingHours(columns[10], columns[11]),
      saturday_operating_hours: operatingHours(columns[12], columns[13]),
      holiday_operating_hours: operatingHours(columns[14], columns[15]),
      basic_parking_time: columns[17] || null,
      basic_parking_fee: columns[18] || null,
      additional_unit_time: columns[19] || null,
      additional_unit_fee: columns[20] || null,
      phone_number: columns[27] || null,
      lat: columns[28] || null,
      lng: columns[29] || null,
    };
  });
}

function operatingHours(start, end) {
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

function targetSearchTerms() {
  return [
    ...TARGET_SEOUL_DISTRICTS.map((district) => `서울특별시 ${district}`),
    ...TARGET_GYEONGGI_CITIES.map((city) => `경기도 ${city}`),
  ];
}

async function fetchSearchRows(keyword, column) {
  const body = new URLSearchParams({
    publicDataPk: DATA_GO_KR_PUBLIC_DATA_PK,
    colCondition: column,
    searchKeyword1: keyword,
  });
  const response = await fetch(DATA_GO_KR_STANDARD_PAGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": "Mozilla/5.0",
      Referer: "https://www.data.go.kr/data/15012896/standard.do",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`포털 그리드 조회 실패: ${response.status} ${response.statusText} (${column} ${keyword})`);
  }

  const html = await response.text();
  const rows = extractRowsFromHtml(html);
  return {
    column,
    keyword,
    rowCount: rows.length,
    capped: rows.length >= 499,
    rows,
  };
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchSearchRowsWithRetry(keyword, column) {
  let lastError = null;
  for (let attempt = 1; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      return await fetchSearchRows(keyword, column);
    } catch (error) {
      lastError = error;
      await sleep(500 * attempt);
    }
  }
  throw lastError;
}

async function runWithConcurrency(tasks, worker) {
  const results = new Array(tasks.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < tasks.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(tasks[currentIndex], currentIndex);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, runWorker));
  return results;
}

async function collectPortalGridRows() {
  const tasks = [];
  for (const keyword of targetSearchTerms()) {
    for (const column of SEARCH_COLUMNS) {
      tasks.push({ keyword, column });
    }
  }

  const reports = await runWithConcurrency(tasks, ({ keyword, column }) =>
    fetchSearchRowsWithRetry(keyword, column)
  );

  return {
    rows: reports.flatMap((report) => report.rows),
    reports: reports.map(({ column, keyword, rowCount, capped }) => ({
      column,
      keyword,
      rowCount,
      capped,
    })),
  };
}

module.exports = {
  collectPortalGridRows,
  extractRowsFromHtml,
  targetSearchTerms,
};
