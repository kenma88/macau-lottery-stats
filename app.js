const storageKeys = {
  records: "macauLotteryRecords",
  projects: "macauLotteryProjects",
  imported2026: "macauLotteryImported2026_001_171",
};

const loginEntryParam = "login_entry";

const colorGroups = {
  red: [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46],
  blue: [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48],
  green: [5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49],
};

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
const officialRecords2026 = Array.isArray(window.OFFICIAL_RECORDS_2026) ? window.OFFICIAL_RECORDS_2026 : [];

const todayLabel = document.querySelector("#todayLabel");
const recordForm = document.querySelector("#recordForm");
const projectForm = document.querySelector("#projectForm");
const recordColGroup = document.querySelector("#recordColGroup");
const recordHeadRow = document.querySelector("#recordHeadRow");
const recordBody = document.querySelector("#recordBody");
const projectList = document.querySelector("#projectList");
const recordPaginationTop = document.querySelector("#recordPaginationTop");
const recordPagination = document.querySelector("#recordPagination");
const issueInput = document.querySelector("#issueInput");
const dateInput = document.querySelector("#dateInput");
const regularInput = document.querySelector("#regularInput");
const specialInput = document.querySelector("#specialInput");
const projectInput = document.querySelector("#projectInput");
const projectValueModal = document.querySelector("#projectValueModal");
const projectValueForm = document.querySelector("#projectValueForm");
const modalTitle = document.querySelector("#modalTitle");
const modalMeta = document.querySelector("#modalMeta");
const modalValueInput = document.querySelector("#modalValueInput");
const markInputs = [...document.querySelectorAll("input[name='projectMark']")];
const closeModalBtn = document.querySelector("#closeModalBtn");
const cancelModalBtn = document.querySelector("#cancelModalBtn");
const clearModalBtn = document.querySelector("#clearModalBtn");
const logoutButton = document.querySelector("#logoutButton");

const pageSize = 20;
let currentPage = 1;
let editingProjectCell = null;
let records = [];
let projects = [];
let dataMode = "local";
let statusTimer = null;
let startupError = "";

logoutButton?.addEventListener("click", async () => {
  try {
    if (isRemoteMode()) {
      await api.logout();
    }
  } catch (error) {
    console.warn("Logout request failed:", error);
  } finally {
    redirectToLogin();
  }
});

todayLabel.textContent = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "long",
}).format(new Date());

dateInput.valueAsDate = new Date();

recordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const issue = issueInput.value.trim();
  const regular = parseNumbers(regularInput.value);
  const special = Number(specialInput.value);

  if (!issue) {
    alert("请填写期号。");
    return;
  }

  if (regular.length !== 6 || !regular.every(isValidNumber) || !isValidNumber(special)) {
    alert("请填写 6 个平码和 1 个 01-49 的特码。");
    return;
  }

  const record = {
    issue,
    date: dateInput.value,
    regular,
    special,
    zodiacs: [...regular, special].map((number) => getZodiac(number)),
    projectValues: createEmptyProjectValues(),
  };

  try {
    if (isRemoteMode()) {
      await api.createRecord(record);
      await reloadRemoteData({ keepPage: false });
    } else {
      records.unshift(record);
      saveLocalState();
      currentPage = 1;
      render();
    }

    recordForm.reset();
    dateInput.valueAsDate = new Date();
  } catch (error) {
    handleOperationError(error, "新增记录失败");
  }
});

projectForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = projectInput.value.trim();
  if (!name) return;

  if (projects.some((project) => project.name === name)) {
    alert("该统计项目名称已经存在。");
    return;
  }

  try {
    if (isRemoteMode()) {
      await api.createProject(name);
      await reloadRemoteData({ keepPage: true });
    } else {
      projects.push({
        id: crypto.randomUUID(),
        name,
      });
      records = records.map((record) => ({
        ...record,
        projectValues: {
          ...ensureProjectValues(record.projectValues),
          [name]: "",
        },
      }));
      saveLocalState();
      render();
    }

    projectInput.value = "";
  } catch (error) {
    handleOperationError(error, "新增项目失败");
  }
});

projectValueForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!editingProjectCell) return;

  const nextValue = modalValueInput.value.trim();
  const nextMark = getSelectedProjectMark();
  const serializedValue = serializeProjectValue({
    text: nextValue,
    mark: nextMark,
  });
  const { recordIndex, projectName } = editingProjectCell;
  const record = records[recordIndex];
  if (!record) return;

  try {
    if (isRemoteMode()) {
      await api.updateProjectValue(record.issue, projectName, serializedValue);
      await reloadRemoteData({ keepPage: true });
    } else {
      records[recordIndex].projectValues = {
        ...ensureProjectValues(record.projectValues),
        [projectName]: serializedValue,
      };
      saveLocalState();
      render();
    }

    closeProjectValueModal();
  } catch (error) {
    handleOperationError(error, "保存项目值失败");
  }
});

closeModalBtn.addEventListener("click", closeProjectValueModal);
cancelModalBtn.addEventListener("click", closeProjectValueModal);

clearModalBtn.addEventListener("click", () => {
  modalValueInput.value = "";
  setSelectedProjectMark("");
  modalValueInput.focus();
});

projectValueModal.addEventListener("click", (event) => {
  if (event.target === projectValueModal) closeProjectValueModal();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !projectValueModal.hidden) {
    closeProjectValueModal();
  }
});

async function initializeApp() {
  if (location.protocol !== "file:" && !hasLoginEntry()) {
    redirectToLogin();
    return;
  }

  const remoteLoaded = await tryInitializeRemote();
  if (remoteLoaded === "redirect") {
    return;
  }

  if (!remoteLoaded) {
    if (location.protocol === "file:") {
      initializeLocal();
    } else {
      renderStartupError();
      return;
    }
  }

  logoutButton.hidden = !isRemoteMode();

  render();
}

async function tryInitializeRemote() {
  if (!window.isSecureContext && location.protocol === "file:") {
    return false;
  }

  try {
    const dataset = await api.getState();
    applyRemoteDataset(dataset);
    dataMode = "remote";
    setModeHint("云端共享模式");
    return true;
  } catch (error) {
    if (error?.status === 401) {
      redirectToLogin();
      return "redirect";
    }
    console.error("Remote API unavailable:", error);
    startupError = error?.message || "云端数据连接失败。";
    return false;
  }
}

function initializeLocal() {
  records = load(storageKeys.records, []);
  projects = load(storageKeys.projects, []);
  importOfficialRecords2026Local();
  ensureDataShape();
  dataMode = "local";
  setModeHint("本地模式");
}

function applyRemoteDataset(dataset) {
  records = Array.isArray(dataset?.records) ? dataset.records.map(normalizeRecord) : [];
  projects = Array.isArray(dataset?.projects) ? dataset.projects.map(normalizeProject) : [];
  ensureDataShape(false);
}

async function reloadRemoteData({ keepPage }) {
  const dataset = await api.getState();
  applyRemoteDataset(dataset);
  if (!keepPage) currentPage = 1;
  render();
}

function render() {
  ensureDataShape(!isRemoteMode());
  renderRecordHead();
  renderRecords();
  renderProjects();
}

function renderStartupError() {
  recordHeadRow.innerHTML = "";
  recordColGroup.innerHTML = "";
  projectList.innerHTML = `<div class="empty-state compact">云端未连接</div>`;
  clearPagination();
  recordBody.innerHTML = `
    <tr>
      <td colspan="1">
        <div class="empty-state">
          ${escapeHtml(startupError || "云端数据连接失败，请稍后刷新重试。")}
        </div>
      </td>
    </tr>
  `;
}

function renderRecords() {
  if (!records.length) {
    currentPage = 1;
    recordBody.innerHTML = `
      <tr>
        <td colspan="${getColumnCount()}">暂无开奖记录，请先新增一条记录。</td>
      </tr>
    `;
    renderPagination();
    return;
  }

  const totalPages = getTotalPages();
  if (currentPage > totalPages) currentPage = totalPages;

  recordBody.innerHTML = getCurrentPageRecords()
    .map((record) => {
      const index = records.findIndex((item) => item.issue === record.issue);
      const special = normalizeNumber(record.special);
      return `
        <tr>
          <td>${escapeHtml(record.issue)}</td>
          <td>${escapeHtml(record.date)}</td>
          <td>
            <div class="balls">${record.regular.map((number) => renderBall(number)).join("")}</div>
          </td>
          <td class="special-cell">${renderBall(special)}</td>
          <td><span class="badge">${special % 2 === 0 ? "双" : "单"}</span></td>
          <td><span class="badge">${special >= 26 ? "大" : "小"}</span></td>
          <td><span class="badge">${getDigitSumParity(special)}</span></td>
          ${projects.map((project) => renderProjectValueCell(record, index, project)).join("")}
          <td>
            <button class="danger-button" type="button" data-delete-record="${index}">删除</button>
          </td>
        </tr>
      `;
    })
    .join("");

  document.querySelectorAll("[data-delete-record]").forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.deleteRecord);
      const record = records[index];
      if (!record) return;

      try {
        if (isRemoteMode()) {
          await api.deleteRecord(record.issue);
          await reloadRemoteData({ keepPage: true });
        } else {
          records.splice(index, 1);
          saveLocalState();
          render();
        }
      } catch (error) {
        handleOperationError(error, "删除记录失败");
      }
    });
  });

  document.querySelectorAll("[data-edit-project]").forEach((button) => {
    button.addEventListener("click", () => {
      openProjectValueModal(Number(button.dataset.recordIndex), button.dataset.editProject);
    });
  });

  renderPagination();
}

function renderProjects() {
  if (!projects.length) {
    projectList.innerHTML = `<div class="empty-state compact">暂无项目</div>`;
    return;
  }

  projectList.innerHTML = projects
    .map(
      (project) => `
        <div class="project-chip">
          <strong>${escapeHtml(project.name)}</strong>
          <button class="chip-remove-button" type="button" data-delete-project="${project.id}" aria-label="删除 ${escapeHtml(project.name)}">×</button>
        </div>
      `,
    )
    .join("");

  document.querySelectorAll("[data-delete-project]").forEach((button) => {
    button.addEventListener("click", async () => {
      const projectId = button.dataset.deleteProject;
      const target = projects.find((project) => project.id === projectId);
      if (!target) return;

      try {
        if (isRemoteMode()) {
          await api.deleteProject(projectId);
          await reloadRemoteData({ keepPage: true });
        } else {
          projects = projects.filter((project) => project.id !== projectId);
          records = records.map((record) => {
            const projectValues = { ...ensureProjectValues(record.projectValues) };
            delete projectValues[target.name];
            return {
              ...record,
              projectValues,
            };
          });
          saveLocalState();
          render();
        }
      } catch (error) {
        handleOperationError(error, "删除项目失败");
      }
    });
  });
}

function renderRecordHead() {
  recordColGroup.innerHTML = [
    `<col class="col-issue" />`,
    `<col class="col-date" />`,
    `<col class="col-regular" />`,
    `<col class="col-special" />`,
    `<col class="col-tag" />`,
    `<col class="col-tag" />`,
    `<col class="col-sum" />`,
    ...projects.map(() => `<col class="col-project" />`),
    `<col class="col-action" />`,
  ].join("");

  recordHeadRow.innerHTML = [
    `<th>期号</th>`,
    `<th>开奖日期</th>`,
    `<th>平码</th>`,
    `<th>特码</th>`,
    `<th>单双</th>`,
    `<th>大小</th>`,
    `<th>特码相加</th>`,
    ...projects.map((project) => `<th>${escapeHtml(project.name)}</th>`),
    `<th>操作</th>`,
  ].join("");
}

function renderPagination() {
  const totalPages = getTotalPages();

  if (totalPages <= 1 || !records.length) {
    clearPagination();
    return;
  }

  const pages = [];
  for (let page = 1; page <= totalPages; page += 1) {
    pages.push(`
      <button
        type="button"
        class="page-button ${page === currentPage ? "active" : ""}"
        data-page="${page}"
      >${page}</button>
    `);
  }

  const paginationHtml = `
    <button type="button" class="page-button nav" data-page-nav="prev" ${currentPage === 1 ? "disabled" : ""}>上一页</button>
    <span class="page-summary">第 ${currentPage} / ${totalPages} 页，${getCurrentPageRangeLabel()}</span>
    <div class="page-numbers">${pages.join("")}</div>
    <button type="button" class="page-button nav" data-page-nav="next" ${currentPage === totalPages ? "disabled" : ""}>下一页</button>
  `;

  getPaginationContainers().forEach((container) => {
    container.innerHTML = paginationHtml;
    bindPagination(container);
  });
}

function bindPagination(container) {
  container.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      currentPage = Number(button.dataset.page);
      renderRecords();
    });
  });

  container.querySelectorAll("[data-page-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      const totalPages = getTotalPages();
      const direction = button.dataset.pageNav === "prev" ? -1 : 1;
      currentPage = Math.min(totalPages, Math.max(1, currentPage + direction));
      renderRecords();
    });
  });
}

function clearPagination() {
  getPaginationContainers().forEach((container) => {
    container.innerHTML = "";
  });
}

function getPaginationContainers() {
  return [recordPaginationTop, recordPagination].filter(Boolean);
}

function renderBall(value) {
  const number = normalizeNumber(value);
  const zodiac = getZodiac(number);
  return `
    <span class="ball-pair">
      <span class="ball ${getColor(number)}">${String(number).padStart(2, "0")}</span>
      <span class="zodiac ${getZodiacColor(zodiac)}">${zodiac}</span>
    </span>
  `;
}

function renderProjectValueCell(record, index, project) {
  const projectValues = ensureProjectValues(record.projectValues);
  const parsedValue = parseProjectValue(projectValues[project.name] ?? "");
  const value = parsedValue.text;
  const mark = parsedValue.mark;
  return `
    <td>
      <button
        class="project-value-button ${value || mark ? "filled" : "empty"}"
        type="button"
        data-record-index="${index}"
        data-edit-project="${escapeAttribute(project.name)}"
      >
        <span class="project-value-text">${escapeHtml(value || "填写")}</span>
        ${renderProjectMark(mark)}
      </button>
    </td>
  `;
}

function openProjectValueModal(recordIndex, projectName) {
  const record = records[recordIndex];
  if (!record) return;

  editingProjectCell = { recordIndex, projectName };
  const projectValues = ensureProjectValues(record.projectValues);
  const parsedValue = parseProjectValue(projectValues[projectName] ?? "");

  modalTitle.textContent = projectName;
  modalMeta.textContent = `${record.issue} 期开奖`;
  modalValueInput.value = parsedValue.text;
  setSelectedProjectMark(parsedValue.mark);
  projectValueModal.hidden = false;
  modalValueInput.focus();
  modalValueInput.select();
}

function closeProjectValueModal() {
  editingProjectCell = null;
  projectValueModal.hidden = true;
  projectValueForm.reset();
}

function ensureDataShape(shouldPersist) {
  let didChange = false;

  records = records.map((record) => {
    const normalizedProjectValues = ensureProjectValues(record.projectValues);
    const nextRecord = normalizeRecord({
      ...record,
      projectValues: normalizedProjectValues,
    });

    if (JSON.stringify(nextRecord) !== JSON.stringify(record)) {
      didChange = true;
    }

    return nextRecord;
  });

  if (didChange && shouldPersist) {
    saveLocalState();
  }
}

function importOfficialRecords2026Local() {
  const alreadyImported = localStorage.getItem(storageKeys.imported2026) === "1";
  if (alreadyImported || !officialRecords2026.length) return;

  const existingByIssue = new Map(records.map((record) => [record.issue, record]));
  records = officialRecords2026.map((record) => {
    const existing = existingByIssue.get(record.issue);
    return normalizeRecord({
      issue: record.issue,
      date: record.date,
      regular: record.regular,
      special: record.special,
      zodiacs: record.zodiacs,
      projectValues: existing ? ensureProjectValues(existing.projectValues) : createEmptyProjectValues(),
    });
  });

  save(storageKeys.records, records);
  localStorage.setItem(storageKeys.imported2026, "1");
}

function createEmptyProjectValues() {
  return Object.fromEntries(projects.map((project) => [project.name, ""]));
}

function ensureProjectValues(projectValues = {}) {
  return Object.fromEntries(projects.map((project) => [project.name, projectValues?.[project.name] ?? ""]));
}

function parseProjectValue(value) {
  const rawValue = String(value ?? "");
  if (!rawValue.startsWith("{")) {
    return {
      text: rawValue,
      mark: "",
    };
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (parsed?.kind !== "project-value-mark") {
      return {
        text: rawValue,
        mark: "",
      };
    }

    return {
      text: String(parsed?.text ?? ""),
      mark: normalizeProjectMark(parsed?.mark),
    };
  } catch {
    return {
      text: rawValue,
      mark: "",
    };
  }
}

function serializeProjectValue({ text, mark }) {
  const normalizedText = String(text ?? "").trim();
  const normalizedMark = normalizeProjectMark(mark);
  if (!normalizedMark) {
    return normalizedText;
  }

  return JSON.stringify({
    kind: "project-value-mark",
    text: normalizedText,
    mark: normalizedMark,
  });
}

function normalizeProjectMark(mark) {
  return ["right", "wrong"].includes(mark) ? mark : "";
}

function renderProjectMark(mark) {
  if (mark === "right") {
    return `<span class="project-mark right">对</span>`;
  }

  if (mark === "wrong") {
    return `<span class="project-mark wrong">错</span>`;
  }

  return "";
}

function getSelectedProjectMark() {
  return normalizeProjectMark(markInputs.find((input) => input.checked)?.value ?? "");
}

function setSelectedProjectMark(mark) {
  const normalizedMark = normalizeProjectMark(mark);
  markInputs.forEach((input) => {
    input.checked = input.value === normalizedMark;
  });
}

function getColumnCount() {
  return 8 + projects.length;
}

function getCurrentPageRecords() {
  const { start, end } = getCurrentPageIssueRange();
  return records
    .filter((record) => {
      const ordinal = getIssueOrdinal(record.issue);
      return ordinal >= start && ordinal <= end;
    })
    .sort((left, right) => getIssueOrdinal(right.issue) - getIssueOrdinal(left.issue));
}

function getTotalPages() {
  const maxIssueOrdinal = getMaxIssueOrdinal();
  return Math.max(1, Math.ceil(maxIssueOrdinal / pageSize));
}

function getCurrentPageIssueRange() {
  const totalPages = getTotalPages();
  const pageFromOldest = totalPages - currentPage;
  const start = pageFromOldest * pageSize + 1;
  const end = Math.min(getMaxIssueOrdinal(), start + pageSize - 1);
  return { start, end };
}

function getCurrentPageRangeLabel() {
  const { start, end } = getCurrentPageIssueRange();
  return `${formatIssueLabel(start)}-${formatIssueLabel(end)}`;
}

function getMaxIssueOrdinal() {
  return records.reduce((max, record) => Math.max(max, getIssueOrdinal(record.issue)), 0);
}

function getIssueOrdinal(issue) {
  const value = String(issue ?? "").trim();
  const match = value.match(/(\d{3})$/);
  if (match) {
    return Number(match[1]);
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatIssueLabel(ordinal) {
  const prefix = getIssuePrefix();
  return `${prefix}${String(ordinal).padStart(3, "0")}`;
}

function getIssuePrefix() {
  const issueWithPrefix = records
    .map((record) => String(record.issue ?? "").trim())
    .find((issue) => /^\d{4,}\d{3}$/.test(issue));

  return issueWithPrefix ? issueWithPrefix.slice(0, -3) : "";
}

function parseNumbers(value) {
  return value
    .split(/[\s,，、]+/)
    .map((number) => Number(number))
    .filter((number) => Number.isFinite(number));
}

function normalizeNumber(number) {
  return Number(number);
}

function isValidNumber(number) {
  return Number.isInteger(number) && number >= 1 && number <= 49;
}

function getColor(number) {
  if (colorGroups.red.includes(number)) return "red";
  if (colorGroups.blue.includes(number)) return "blue";
  return "green";
}

function getZodiac(number) {
  return zodiacByNumber2026[normalizeNumber(number)] || "";
}

function getZodiacColor(zodiac) {
  if (["鼠", "马", "兔", "鸡"].includes(zodiac)) return "red";
  if (["牛", "羊", "龙", "狗"].includes(zodiac)) return "blue";
  return "green";
}

function getDigitSumParity(number) {
  const sum = String(number)
    .padStart(2, "0")
    .split("")
    .reduce((total, digit) => total + Number(digit), 0);

  return sum % 2 === 0 ? "合双" : "合单";
}

function normalizeRecord(record) {
  const regular = Array.isArray(record.regular) ? record.regular.map(normalizeNumber) : [];
  const special = normalizeNumber(record.special);
  const normalized = {
    issue: String(record.issue ?? "").trim(),
    date: String(record.date ?? ""),
    regular,
    special,
    zodiacs: [...regular, special].map((number) => getZodiac(number)),
    projectValues: { ...(record.projectValues ?? {}) },
  };
  return normalized;
}

function normalizeProject(project) {
  return {
    id: String(project.id),
    name: String(project.name).trim(),
  };
}

function load(key, fallback) {
  const value = localStorage.getItem(key);
  if (!value) return structuredClone(fallback);

  try {
    return JSON.parse(value);
  } catch {
    return structuredClone(fallback);
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function saveLocalState() {
  save(storageKeys.records, records);
  save(storageKeys.projects, projects);
}

function isRemoteMode() {
  return dataMode === "remote";
}

function setModeHint(modeText) {
  document.body.dataset.dataMode = modeText;

  if (statusTimer) {
    clearTimeout(statusTimer);
    statusTimer = null;
  }
}

function handleOperationError(error, fallbackMessage) {
  console.error(error);
  if (error?.status === 401) {
    redirectToLogin();
    return;
  }
  alert(error?.message || fallbackMessage);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const api = {
  async getState() {
    return request("/api/state");
  },
  async createRecord(record) {
    return request("/api/records", {
      method: "POST",
      body: JSON.stringify(record),
    });
  },
  async deleteRecord(issue) {
    return request(`/api/records/${encodeURIComponent(issue)}`, {
      method: "DELETE",
    });
  },
  async createProject(name) {
    return request("/api/projects", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },
  async deleteProject(projectId) {
    return request(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "DELETE",
    });
  },
  async updateProjectValue(issue, projectName, value) {
    return request("/api/project-values", {
      method: "PUT",
      body: JSON.stringify({ issue, projectName, value }),
    });
  },
  async logout() {
    return request("/api/auth/logout", {
      method: "POST",
    });
  },
};

async function request(url, options = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload?.error || `请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function redirectToLogin() {
  if (location.protocol === "file:") {
    return;
  }

  const next = `${location.pathname}${location.search}${location.hash}`;
  const loginUrl = new URL("/login/", location.origin);
  if (next && next !== "/") {
    loginUrl.searchParams.set("next", next);
  }
  window.location.replace(loginUrl.toString());
}

function hasLoginEntry() {
  const url = new URL(window.location.href);
  return url.searchParams.has(loginEntryParam);
}

initializeApp();
