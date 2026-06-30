import {
  buildCatalog,
  buildSummary,
  clearFilterGroup,
  createInitialState,
  excludeNumber,
  filterDefinitions,
  getNumberProfile,
  toggleFilterValue,
} from "./core.mjs";

const filterGroups = document.querySelector("#filterGroups");
const resultBoard = document.querySelector("#resultBoard");
const zodiacOrder = ["鼠", "马", "牛", "羊", "虎", "猴", "兔", "鸡", "龙", "狗", "蛇", "猪"];

const catalog = buildCatalog();
let state = createInitialState();
let isMounted = false;

export function mountPicker() {
  if (!filterGroups || !resultBoard || isMounted) {
    return;
  }

  isMounted = true;
  render();
}

function render() {
  renderFilters();
  renderResults();
  bindResultActions();
}

function renderFilters() {
  filterGroups.innerHTML = filterDefinitions
    .map((definition) => {
      const values = state.filters[definition.key] ?? [];
      return `
        <div class="filter-group">
          <div class="filter-group-head">
            <strong>${escapeHtml(definition.label)}</strong>
            <button type="button" class="filter-clear-button" data-clear-filter="${definition.key}">清空</button>
          </div>
          <div class="filter-option-row">
            ${definition.options
              .map(
                (option) => `
                  <button
                    type="button"
                    class="filter-option ${values.includes(option.value) ? "active" : ""}"
                    data-filter-key="${definition.key}"
                    data-filter-value="${escapeAttribute(option.value)}"
                  >${escapeHtml(option.label)}</button>
                `,
              )
              .join("")}
          </div>
        </div>
      `;
    })
    .join("");

  filterGroups.querySelectorAll("[data-filter-key]").forEach((button) => {
    button.addEventListener("click", () => {
      state = toggleFilterValue(state, button.dataset.filterKey, button.dataset.filterValue);
      render();
    });
  });

  filterGroups.querySelectorAll("[data-clear-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state = clearFilterGroup(state, button.dataset.clearFilter);
      state.exclude = [];
      render();
    });
  });
}

function renderResults() {
  const summary = buildSummary(catalog, state);
  resultBoard.innerHTML = buildResultMarkup(summary);
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

function buildResultMarkup(summary) {
  const hasFilters = Object.values(state.filters).some((values) => values.length > 0);
  const hasSelection = summary.keep.length > 0 || summary.exclude.length > 0;

  if (!hasFilters && !hasSelection) {
    return buildZodiacGrid();
  }

  const grouped = groupNumbersByZodiac(summary.filteredCandidates);
  return buildZodiacGrid(grouped);
}

function buildNumberChips(numbers) {
  if (!numbers.length) {
    return `<span class="result-empty-line" aria-hidden="true"></span>`;
  }

  return numbers
    .map((number) => {
      const profile = getNumberProfile(number);
      return `
        <button
          type="button"
          class="result-chip ${profile.color}"
          title="排除${profile.label} ${escapeAttribute(profile.zodiac)}"
          data-exclude-number="${profile.number}"
          aria-label="排除${profile.label}号"
        >
          <span class="result-chip-label">${profile.label}</span>
          <span class="result-chip-remove" aria-hidden="true">×</span>
        </button>
      `;
    })
    .join("");
}

function bindResultActions() {
  resultBoard.querySelectorAll("[data-exclude-number]").forEach((button) => {
    button.addEventListener("click", () => {
      state = excludeNumber(state, button.dataset.excludeNumber);
      render();
    });
  });
}

function groupNumbersByZodiac(numbers) {
  const groups = Object.fromEntries(zodiacOrder.map((zodiac) => [zodiac, []]));

  numbers.forEach((number) => {
    const profile = getNumberProfile(number);
    if (groups[profile.zodiac]) {
      groups[profile.zodiac].push(number);
    }
  });

  return groups;
}

function buildZodiacGrid(grouped = {}) {
  return `
    <div class="zodiac-grid">
      ${zodiacOrder
        .map((zodiac) => {
          const numbers = grouped[zodiac] ?? [];
          const zodiacColor = zodiacColorClass(zodiac);
          return `
            <section class="zodiac-cell">
              <div class="zodiac-name ${zodiacColor}">${zodiac}</div>
              <div class="zodiac-values">${buildNumberChips(numbers)}</div>
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}

function zodiacColorClass(zodiac) {
  if (["鼠", "马", "兔", "鸡"].includes(zodiac)) return "zodiac-red";
  if (["牛", "羊", "龙", "狗"].includes(zodiac)) return "zodiac-blue";
  return "zodiac-green";
}
