export const colorGroups = {
  red: new Set([1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46]),
  blue: new Set([3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48]),
  green: new Set([5, 6, 11, 16, 17, 21, 22, 27, 28, 32, 33, 38, 39, 43, 44, 49]),
};

export const zodiacByNumber2026 = {
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

export const homeZodiacs = new Set(["牛", "马", "羊", "鸡", "狗", "猪"]);

export const filterDefinitions = [
  {
    key: "zodiacs",
    label: "生肖",
    options: ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"].map((value) => ({
      value,
      label: value,
    })),
  },
];

export function createEmptyFilters() {
  return Object.fromEntries(filterDefinitions.map((definition) => [definition.key, []]));
}

export function createInitialState() {
  return {
    mode: "keep",
    filters: createEmptyFilters(),
    keep: [],
    exclude: [],
    latestRandom: [],
  };
}

export function buildCatalog() {
  return Array.from({ length: 49 }, (_, index) => getNumberProfile(index + 1));
}

export function getNumberProfile(number) {
  const normalized = Number(number);
  const zodiac = zodiacByNumber2026[normalized] || "";

  return {
    number: normalized,
    label: String(normalized).padStart(2, "0"),
    color: getColor(normalized),
    zodiac,
    size: normalized <= 25 ? "small" : "big",
    parity: normalized % 2 === 0 ? "even" : "odd",
    homeWild: homeZodiacs.has(zodiac) ? "home" : "wild",
    head: String(normalized === 49 ? 4 : Math.floor(normalized / 10)),
    tail: String(normalized % 10),
  };
}

export function getColor(number) {
  if (colorGroups.red.has(number)) return "red";
  if (colorGroups.blue.has(number)) return "blue";
  return "green";
}

export function matchesFilters(profile, filters) {
  return filterDefinitions.every((definition) => {
    const active = filters[definition.key] ?? [];
    if (!active.length) return true;

    const value = profileValueForFilter(profile, definition.key);
    return active.includes(value);
  });
}

function profileValueForFilter(profile, key) {
  switch (key) {
    case "colors":
      return profile.color;
    case "sizes":
      return profile.size;
    case "parities":
      return profile.parity;
    case "homeWilds":
      return profile.homeWild;
    case "heads":
      return profile.head;
    case "tails":
      return profile.tail;
    case "zodiacs":
      return profile.zodiac;
    default:
      return "";
  }
}

export function getMatchedNumbers(catalog, filters) {
  return catalog.filter((profile) => matchesFilters(profile, filters)).map((profile) => profile.number);
}

export function applyModeToNumbers(state, numbers, mode = state.mode) {
  const nextState = cloneState(state);
  const uniqueNumbers = uniqueNormalized(numbers);

  for (const number of uniqueNumbers) {
    if (mode === "keep") {
      nextState.keep = toggleInArray(nextState.keep, number, true);
      nextState.exclude = toggleInArray(nextState.exclude, number, false);
    } else if (mode === "exclude") {
      nextState.exclude = toggleInArray(nextState.exclude, number, true);
      nextState.keep = toggleInArray(nextState.keep, number, false);
    } else {
      nextState.keep = toggleInArray(nextState.keep, number, false);
      nextState.exclude = toggleInArray(nextState.exclude, number, false);
    }
  }

  return normalizeState(nextState);
}

export function clearFilterGroup(state, key) {
  const nextState = cloneState(state);
  nextState.filters[key] = [];
  return nextState;
}

export function toggleFilterValue(state, key, value) {
  const nextState = cloneState(state);
  const current = nextState.filters[key] ?? [];
  nextState.filters[key] = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
  return nextState;
}

export function excludeNumber(state, number) {
  const nextState = cloneState(state);
  const normalized = Number(number);
  nextState.exclude = toggleInArray(nextState.exclude, normalized, true);
  nextState.keep = toggleInArray(nextState.keep, normalized, false);
  return normalizeState(nextState);
}

export function clearFilters(state) {
  const nextState = cloneState(state);
  nextState.filters = createEmptyFilters();
  return nextState;
}

export function getCandidateNumbers(catalog, state) {
  const excluded = new Set(state.exclude);
  return catalog.filter((profile) => !excluded.has(profile.number)).map((profile) => profile.number);
}

export function buildSummary(catalog, state) {
  const candidates = getCandidateNumbers(catalog, state);
  const matched = getMatchedNumbers(catalog, state.filters);
  const keep = uniqueNormalized(state.keep);
  const exclude = uniqueNormalized(state.exclude);

  return {
    matched,
    candidates,
    keep,
    exclude,
    filteredCandidates: matched.filter((number) => !exclude.includes(number)),
  };
}

export function randomFill(catalog, state, targetCount, random = Math.random) {
  const summary = buildSummary(catalog, state);
  const keep = summary.keep.slice().sort((left, right) => left - right);
  const target = Math.max(keep.length, Number(targetCount) || 0);
  const source = summary.filteredCandidates.filter((number) => !keep.includes(number));
  const pool = source.slice();
  const picked = [];

  while (pool.length && keep.length + picked.length < target) {
    const index = Math.floor(random() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }

  return {
    base: keep,
    fill: picked.sort((left, right) => left - right),
    combined: [...keep, ...picked].sort((left, right) => left - right),
  };
}

export function normalizeState(state) {
  return {
    mode: ["keep", "exclude", "clear"].includes(state.mode) ? state.mode : "keep",
    filters: filterDefinitions.reduce((filters, definition) => {
      filters[definition.key] = uniqueStrings(state.filters?.[definition.key] ?? []);
      return filters;
    }, {}),
    keep: uniqueNormalized(state.keep),
    exclude: uniqueNormalized(state.exclude).filter((number) => !state.keep?.includes(number)),
    latestRandom: uniqueNormalized(state.latestRandom),
  };
}

function cloneState(state) {
  return {
    mode: state.mode,
    filters: Object.fromEntries(Object.entries(state.filters).map(([key, value]) => [key, [...value]])),
    keep: [...state.keep],
    exclude: [...state.exclude],
    latestRandom: [...(state.latestRandom ?? [])],
  };
}

function toggleInArray(values, value, shouldExist) {
  const uniqueValues = uniqueNormalized(values);
  const hasValue = uniqueValues.includes(value);

  if (shouldExist && !hasValue) return [...uniqueValues, value];
  if (!shouldExist && hasValue) return uniqueValues.filter((item) => item !== value);
  return uniqueValues;
}

function uniqueNormalized(values) {
  return [...new Set((values ?? []).map((value) => Number(value)).filter((value) => Number.isInteger(value) && value >= 1 && value <= 49))].sort(
    (left, right) => left - right,
  );
}

function uniqueStrings(values) {
  return [...new Set((values ?? []).map((value) => String(value)))];
}
