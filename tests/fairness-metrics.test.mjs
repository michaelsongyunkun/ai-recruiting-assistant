import assert from "node:assert/strict";
import { computeSelectionRates } from "../lib/audit/fairness-metrics.js";

const snapshot = computeSelectionRates([
  { group: "A", total: 100, selected: 40 },
  { group: "B", total: 80, selected: 20 },
  { group: "C", total: 12, selected: 5 }
]);

assert.equal(snapshot.groups[0].selectionRate, 0.4);
assert.equal(snapshot.groups[1].impactRatio, 0.625);
assert.equal(snapshot.groups[2].sampleTooSmall, true);
assert.equal(snapshot.minimumSampleSize, 30);

console.log("fairness-metrics.test.mjs passed");
