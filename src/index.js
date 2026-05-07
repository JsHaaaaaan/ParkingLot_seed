const fs = require("fs");
const path = require("path");
const { parseCsv } = require("./csv");
const {
  DEFAULT_API_URL,
  DEFAULT_CAPSTONE_OUTPUT_PATH,
  DEFAULT_OUTPUT_PATH,
} = require("./config");
const { normalizeParkingLots } = require("./normalize");
const { collectPortalGridRows } = require("./portalGrid");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    if (key === "copy-to-capstone" || key === "collect-from-portal-grid") {
      args[key] = true;
      continue;
    }
    args[key] = argv[index + 1];
    index += 1;
  }
  return args;
}

function responseItems(payload) {
  const body = payload.response?.body || payload.body || payload;
  const items = body.items?.item || body.items || body.data || [];
  if (Array.isArray(items)) {
    return items;
  }
  return [items];
}

function responseTotalCount(payload, fallbackCount) {
  const body = payload.response?.body || payload.body || payload;
  return Number(body.totalCount || payload.totalCount || fallbackCount);
}

async function fetchApiRows(apiUrl, serviceKey) {
  const rows = [];
  let pageNo = 1;
  const numOfRows = 1000;
  let totalCount = null;

  while (totalCount === null || rows.length < totalCount) {
    const url = new URL(apiUrl);
    url.searchParams.set("pageNo", String(pageNo));
    url.searchParams.set("numOfRows", String(numOfRows));
    url.searchParams.set("type", "json");
    if (serviceKey) {
      url.searchParams.set("serviceKey", serviceKey);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`공공데이터 API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const resultCode = payload.response?.header?.resultCode;
    const resultMsg = payload.response?.header?.resultMsg;
    if (resultCode && resultCode !== "00") {
      throw new Error(`공공데이터 API 오류: ${resultCode} ${resultMsg || ""}`.trim());
    }

    const data = responseItems(payload);
    totalCount = responseTotalCount(payload, data.length);
    rows.push(...data);

    if (data.length === 0) {
      break;
    }
    pageNo += 1;
  }

  return rows;
}

function readInputRows(inputPath) {
  const content = fs.readFileSync(inputPath, "utf8");
  if (inputPath.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.data || parsed.rows || [];
  }
  return parseCsv(content);
}

function writeJson(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

async function resolveRows(args) {
  if (args["collect-from-portal-grid"]) {
    const result = await collectPortalGridRows();
    return {
      rows: result.rows,
      portalReport: result.reports,
    };
  }

  if (args.input) {
    return {
      rows: readInputRows(args.input),
      portalReport: null,
    };
  }

  return {
    rows: await fetchApiRows(
      process.env.DATA_GO_KR_API_URL || DEFAULT_API_URL,
      process.env.DATA_GO_KR_SERVICE_KEY
    ),
    portalReport: null,
  };
}

async function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const outputPath = args.output || DEFAULT_OUTPUT_PATH;
  if (!args.input && !args["collect-from-portal-grid"] && !process.env.DATA_GO_KR_API_URL) {
    process.env.DATA_GO_KR_API_URL = DEFAULT_API_URL;
  }

  const { rows, portalReport } = await resolveRows(args);
  const normalized = normalizeParkingLots(rows);
  writeJson(outputPath, normalized);

  if (args["portal-report"]) {
    writeJson(args["portal-report"], portalReport || []);
  }

  if (args["copy-to-capstone"]) {
    writeJson(DEFAULT_CAPSTONE_OUTPUT_PATH, normalized);
  }

  return {
    inputCount: rows.length,
    outputCount: normalized.length,
    outputPath,
    copiedToCapstone: Boolean(args["copy-to-capstone"]),
    portalReport,
  };
}

if (require.main === module) {
  run()
    .then((result) => {
      console.log(`[parking-seed] input=${result.inputCount} output=${result.outputCount}`);
      console.log(`[parking-seed] output=${result.outputPath}`);
      if (result.copiedToCapstone) {
        console.log(`[parking-seed] copied=${DEFAULT_CAPSTONE_OUTPUT_PATH}`);
      }
      if (result.portalReport) {
        const capped = result.portalReport.filter((report) => report.capped);
        console.log(`[parking-seed] portal-searches=${result.portalReport.length}`);
        if (capped.length > 0) {
          console.log(`[parking-seed] capped-searches=${capped.length}`);
        }
      }
    })
    .catch((error) => {
      console.error("[parking-seed:failed]");
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = {
  fetchApiRows,
  readInputRows,
  run,
};
