import { officialRecords2026 } from "./official-records-2026-data.js";

const zodiacByNumber2026 = {
  1: "马",
  2: "蛇",
  3: "龙",
  4: "兔",
  5: "虎",
  6: "牛",
  7: "鼠",
  8: "猪",
  9: "狗",
  10: "鸡",
  11: "猴",
  12: "羊",
  13: "马",
  14: "蛇",
  15: "龙",
  16: "兔",
  17: "虎",
  18: "牛",
  19: "鼠",
  20: "猪",
  21: "狗",
  22: "鸡",
  23: "猴",
  24: "羊",
  25: "马",
  26: "蛇",
  27: "龙",
  28: "兔",
  29: "虎",
  30: "牛",
  31: "鼠",
  32: "猪",
  33: "狗",
  34: "鸡",
  35: "猴",
  36: "羊",
  37: "马",
  38: "蛇",
  39: "龙",
  40: "兔",
  41: "虎",
  42: "牛",
  43: "鼠",
  44: "猪",
  45: "狗",
  46: "鸡",
  47: "猴",
  48: "羊",
  49: "马",
};
const officialImportKey = "official_import_2026_001_171";

const schemaStatements = [
  `
  CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS records (
    issue TEXT PRIMARY KEY,
    draw_date TEXT NOT NULL,
    regular_json TEXT NOT NULL,
    special INTEGER NOT NULL,
    zodiacs_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
  `,
  `
  CREATE TABLE IF NOT EXISTS project_values (
    issue TEXT NOT NULL,
    project_id TEXT NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (issue, project_id)
  )
  `,
  "CREATE INDEX IF NOT EXISTS idx_projects_sort_order ON projects(sort_order ASC)",
  "CREATE INDEX IF NOT EXISTS idx_records_issue ON records(issue DESC)",
  "CREATE INDEX IF NOT EXISTS idx_project_values_project_id ON project_values(project_id)",
];

let readyPromise = null;

export async function ensureReady(env) {
  if (!readyPromise) {
    readyPromise = setupDatabase(env).catch((error) => {
      readyPromise = null;
      throw error;
    });
  }

  await readyPromise;
}

export async function readState(env) {
  const [projectRows, recordRows, projectValueRows] = await Promise.all([
    env.DB.prepare("SELECT id, name, sort_order FROM projects ORDER BY sort_order ASC, created_at ASC").all(),
    env.DB.prepare("SELECT issue, draw_date, regular_json, special, zodiacs_json FROM records ORDER BY issue DESC").all(),
    env.DB.prepare(
      `
      SELECT pv.issue, p.name AS project_name, pv.value
      FROM project_values pv
      INNER JOIN projects p ON p.id = pv.project_id
      ORDER BY p.sort_order ASC, p.created_at ASC
      `,
    ).all(),
  ]);

  const valueMap = new Map();
  for (const row of projectValueRows.results ?? []) {
    if (!valueMap.has(row.issue)) {
      valueMap.set(row.issue, {});
    }
    valueMap.get(row.issue)[row.project_name] = row.value ?? "";
  }

  const projects = (projectRows.results ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    sortOrder: Number(project.sort_order),
  }));

  const records = (recordRows.results ?? []).map((row) => ({
    issue: row.issue,
    date: row.draw_date,
    regular: JSON.parse(row.regular_json),
    special: Number(row.special),
    zodiacs: [...JSON.parse(row.regular_json), Number(row.special)].map((number) => getZodiac(number)),
    projectValues: valueMap.get(row.issue) ?? {},
  }));

  return { projects, records };
}

export async function createProject(env, name) {
  const normalizedName = String(name ?? "").trim();
  if (!normalizedName) {
    throw createError("项目名称不能为空。", 400);
  }

  const duplicate = await env.DB.prepare("SELECT id FROM projects WHERE name = ?").bind(normalizedName).first();
  if (duplicate) {
    throw createError("该统计项目名称已经存在。", 409);
  }

  const sortRow = await env.DB.prepare("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_sort_order FROM projects").first();
  const project = {
    id: crypto.randomUUID(),
    name: normalizedName,
    sortOrder: Number(sortRow?.next_sort_order ?? 1),
  };

  await env.DB.prepare("INSERT INTO projects (id, name, sort_order) VALUES (?, ?, ?)")
    .bind(project.id, project.name, project.sortOrder)
    .run();

  return project;
}

export async function deleteProject(env, projectId) {
  const project = await env.DB.prepare("SELECT id FROM projects WHERE id = ?").bind(projectId).first();
  if (!project) {
    throw createError("未找到要删除的项目。", 404);
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM project_values WHERE project_id = ?").bind(projectId),
    env.DB.prepare("DELETE FROM projects WHERE id = ?").bind(projectId),
  ]);
}

export async function createRecord(env, payload) {
  const record = normalizeRecordInput(payload);

  const exists = await env.DB.prepare("SELECT issue FROM records WHERE issue = ?").bind(record.issue).first();
  if (exists) {
    throw createError("该期号已经存在。", 409);
  }

  await env.DB.prepare(
    "INSERT INTO records (issue, draw_date, regular_json, special, zodiacs_json) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(record.issue, record.date, JSON.stringify(record.regular), record.special, JSON.stringify(record.zodiacs))
    .run();

  return record;
}

export async function deleteRecord(env, issue) {
  const existing = await env.DB.prepare("SELECT issue FROM records WHERE issue = ?").bind(issue).first();
  if (!existing) {
    throw createError("未找到要删除的记录。", 404);
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM project_values WHERE issue = ?").bind(issue),
    env.DB.prepare("DELETE FROM records WHERE issue = ?").bind(issue),
  ]);
}

export async function updateProjectValue(env, payload) {
  const issue = String(payload?.issue ?? "").trim();
  const projectName = String(payload?.projectName ?? "").trim();
  const value = String(payload?.value ?? "").trim();

  if (!issue || !projectName) {
    throw createError("缺少期号或项目名称。", 400);
  }

  const [record, project] = await Promise.all([
    env.DB.prepare("SELECT issue FROM records WHERE issue = ?").bind(issue).first(),
    env.DB.prepare("SELECT id FROM projects WHERE name = ?").bind(projectName).first(),
  ]);

  if (!record) {
    throw createError("未找到对应期号。", 404);
  }

  if (!project) {
    throw createError("未找到对应统计项目。", 404);
  }

  await env.DB.prepare(
    `
    INSERT INTO project_values (issue, project_id, value, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(issue, project_id)
    DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `,
  )
    .bind(issue, project.id, value)
    .run();
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}

export function errorResponse(error) {
  if (error instanceof Response) return error;
  return json({ error: error?.message || "服务器错误" }, { status: error?.status || 500 });
}

function createError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function setupDatabase(env) {
  await env.DB.batch(schemaStatements.map((statement) => env.DB.prepare(statement)));

  const imported = await env.DB.prepare("SELECT value FROM metadata WHERE key = ?").bind(officialImportKey).first();
  if (imported?.value === "1") {
    return;
  }

  const countRow = await env.DB.prepare("SELECT COUNT(*) AS total FROM records").first();
  const recordCount = Number(countRow?.total ?? 0);

  if (recordCount > 0) {
    await setMetadata(env, officialImportKey, "1");
    return;
  }

  const statements = officialRecords2026.map((record) =>
    env.DB.prepare(
      "INSERT INTO records (issue, draw_date, regular_json, special, zodiacs_json) VALUES (?, ?, ?, ?, ?)",
    ).bind(
      record.issue,
      record.date,
      JSON.stringify(record.regular),
      Number(record.special),
      JSON.stringify(record.zodiacs),
    ),
  );

  statements.push(
    env.DB.prepare("INSERT INTO metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(officialImportKey, "1"),
  );

  await env.DB.batch(statements);
}

async function setMetadata(env, key, value) {
  await env.DB.prepare(
    "INSERT INTO metadata (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  )
    .bind(key, value)
    .run();
}

function normalizeRecordInput(payload) {
  const issue = String(payload?.issue ?? "").trim();
  const date = String(payload?.date ?? "").trim();
  const regular = Array.isArray(payload?.regular) ? payload.regular.map((number) => Number(number)) : [];
  const special = Number(payload?.special);

  if (!issue) {
    throw createError("期号不能为空。", 400);
  }

  if (!/^\d{4,}$/.test(issue)) {
    throw createError("期号格式不正确。", 400);
  }

  if (!date || Number.isNaN(Date.parse(date))) {
    throw createError("开奖日期格式不正确。", 400);
  }

  if (regular.length !== 6 || !regular.every(isValidNumber) || !isValidNumber(special)) {
    throw createError("请填写 6 个平码和 1 个有效特码。", 400);
  }

  return {
    issue,
    date,
    regular,
    special,
    zodiacs: [...regular, special].map((number) => getZodiac(number)),
  };
}

function isValidNumber(number) {
  return Number.isInteger(number) && number >= 1 && number <= 49;
}

function getZodiac(number) {
  return zodiacByNumber2026[Number(number)] || "";
}
