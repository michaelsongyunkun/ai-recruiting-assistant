const tests = [
  "../tests/credentials.test.mjs",
  "../tests/screening.test.mjs",
  "../tests/interviews.test.mjs",
  "../tests/final-results.test.mjs",
  "../tests/fairness-metrics.test.mjs",
  "../tests/provider.test.mjs",
  "../tests/product-resume-scorer.test.mjs",
  "../tests/model-connections.test.mjs",
  "../tests/prompts.test.mjs",
  "../tests/job-validation.test.mjs",
  "../tests/interview-store.test.mjs",
  "../tests/button-wiring.test.mjs",
  "../tests/deletion-store.test.mjs",
  "../tests/resume-parser.test.mjs",
  "../tests/resume-export.test.mjs",
  "../tests/resume-text-extractor.test.mjs",
  "../tests/recruiting-store.test.mjs",
  "../tests/ui-design.test.mjs"
];

let passed = 0;

for (const test of tests) {
  await import(test);
  passed += 1;
}

console.log(`Passed ${passed} test files.`);
