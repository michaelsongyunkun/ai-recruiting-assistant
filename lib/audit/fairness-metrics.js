export function computeSelectionRates(rows, minimumSampleSize = 30) {
  const groups = rows.map((row) => ({
    group: row.group,
    total: row.total,
    selected: row.selected,
    selectionRate: row.total === 0 ? 0 : row.selected / row.total,
    impactRatio: 0,
    sampleTooSmall: row.total < minimumSampleSize
  }));

  const benchmarkGroups = groups.filter((group) => !group.sampleTooSmall);
  const highestRate = Math.max(0, ...benchmarkGroups.map((group) => group.selectionRate));
  for (const group of groups) {
    group.impactRatio = highestRate === 0 ? 0 : group.selectionRate / highestRate;
  }

  return {
    minimumSampleSize,
    groups
  };
}
