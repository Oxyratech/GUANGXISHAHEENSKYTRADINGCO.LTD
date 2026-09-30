export interface StatusCount {
  status: string;
  count: number;
}

/**
 * Turns the rows of a `groupBy` into one entry per status of the vocabulary, in its order, with a real
 * zero for statuses that have no rows (a missing row and "none yet" mean the same thing). A status the
 * vocabulary does not know is kept after the known ones rather than hidden, so totals stay honest.
 */
export function mergeStatusCounts(
  rows: readonly StatusCount[],
  vocabulary: readonly string[],
): StatusCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.status, (counts.get(row.status) ?? 0) + row.count);

  const known = vocabulary.map((status) => ({ status, count: counts.get(status) ?? 0 }));
  const unknown = [...counts]
    .filter(([status]) => !vocabulary.includes(status))
    .map(([status, count]) => ({ status, count }));
  return [...known, ...unknown];
}

export function totalOf(counts: readonly StatusCount[]): number {
  return counts.reduce((sum, entry) => sum + entry.count, 0);
}

export function countFor(counts: readonly StatusCount[], status: string): number {
  return counts.find((entry) => entry.status === status)?.count ?? 0;
}
