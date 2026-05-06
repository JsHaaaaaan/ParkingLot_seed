const fs = require("fs");
const path = require("path");
const { parseCsv } = require("./csv");
const {
  DEFAULT_CAPSTONE_OUTPUT_PATH,
  DEFAULT_OUTPUT_PATH,
} = require("./config");
const { normalizeParkingLots } = require("./normalize");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    if (key === "copy-to-capstone") {
      args.copyToCapstone = true;
      continue;
    }
    args[key] = argv[index + 1];
    index += 1;
  }
  return args;
}

async function fetchApiRows(apiUrl, serviceKey) {
  const rows = [];
  let page = 1;
  const perPage = 1000;
  let totalCount = null;

  while (totalCount === null || rows.length < totalCount) {
    const url = new URL(apiUrl);
    url.searchParams.set("page", String(page));
    url.searchParams.set("perPage", String(perPage));
    if (serviceKey) {
      url.searchParams.set("serviceKey", serviceKey);
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`공공데이터 API 호출 실패: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json();
    const data = Array.isArray(payload.data) ? payload.data : [];
    totalCount = Number(payload.totalCount || data.length);
    rows.push(...data);

    if (data.length === 0) {
      break;
    }
    page += 1;
  }

  return rows;
}

function readInputRows(inputPath) {
  const content = fs.readFileSync(inputPath, "utf8");
  if (inputPath.toLowerCase().endsWith(".json")) {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.data || [];
  }
  return parseCsv(content);
}

function writeJson(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
}

async function run(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const outputPath = args.output || DEFAULT_OUTPUT_PATH;
  if (!args.input && !process.env.DATA_GO_KR_API_URL) {
    throw new Error("입력 CSV 경로 또는 DATA_GO_KR_API_URL이 필요합니다.");
  }

  const rows = args.input
    ? readInputRows(args.input)
    : await fetchApiRows(process.env.DATA_GO_KR_API_URL, process.env.DATA_GO_KR_SERVICE_KEY);

  const normalized = normalizeParkingLots(rows);
  writeJson(outputPath, normalized);

  if (args.copyToCapstone) {
    writeJson(DEFAULT_CAPSTONE_OUTPUT_PATH, normalized);
  }

  return {
    inputCount: rows.length,
    outputCount: normalized.length,
    outputPath,
    copiedToCapstone: Boolean(args.copyToCapstone),
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
    })
    .catch((error) => {
      console.error("[parking-seed:failed]");
      console.error(error.message);
      process.exit(1);
    });
}

module.exports = {
  run,
};
