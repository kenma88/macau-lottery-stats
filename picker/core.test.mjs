import assert from "node:assert/strict";
import {
  applyModeToNumbers,
  buildCatalog,
  buildSummary,
  createInitialState,
  excludeNumber,
  getMatchedNumbers,
  getNumberProfile,
  randomFill,
  toggleFilterValue,
} from "./core.mjs";

const catalog = buildCatalog();

const six = getNumberProfile(6);
assert.equal(six.zodiac, "牛");
assert.equal(six.homeWild, "home");
assert.equal(six.size, "small");
assert.equal(six.parity, "even");

const seven = getNumberProfile(7);
assert.equal(seven.zodiac, "鼠");
assert.equal(seven.homeWild, "wild");

let state = createInitialState();
state = toggleFilterValue(state, "zodiacs", "牛");
const matched = getMatchedNumbers(catalog, state.filters);
assert.deepEqual(matched, [6, 18, 30, 42]);

state = excludeNumber(state, 18);
const filteredSummary = buildSummary(catalog, state);
assert.deepEqual(filteredSummary.filteredCandidates, [6, 30, 42]);

state = applyModeToNumbers(state, [1, 8], "keep");
state = applyModeToNumbers(state, [2], "exclude");
const summary = buildSummary(catalog, state);
assert.deepEqual(summary.keep, [1, 8]);
assert.deepEqual(summary.exclude, [2, 18]);
assert(!summary.candidates.includes(2));

const random = randomFill(catalog, state, 5, () => 0);
assert.equal(random.combined.length, 5);
assert(random.combined.includes(1));
assert(random.combined.includes(8));

console.log("picker core tests passed");
