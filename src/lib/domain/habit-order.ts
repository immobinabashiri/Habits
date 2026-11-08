// Pure helpers for the user's custom habit order. Shared by the server (sorting the
// dashboard) and the browser (moving one habit), so both always agree.

// Items in the saved order. Anything not in the list (a habit created after the
// last reorder) keeps its existing relative order and goes after the listed ones.
export function applyOrder<T>(items: readonly T[], order: readonly string[], idOf: (item: T) => string): T[] {
  const rank = new Map(order.map((id, index) => [id, index]));
  return items
    .map((item, index) => ({ item, index, rank: rank.get(idOf(item)) ?? order.length + index }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ item }) => item);
}

// Moves one id to a new index.
export function moveId(ids: readonly string[], from: number, to: number): string[] {
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, moved);
  return next;
}

// The dashboard only reorders habits due today. Writes that new order back into the
// slots those habits held in the full list, so habits not shown today keep their places.
export function mergeSubsetOrder(full: readonly string[], subset: readonly string[]): string[] {
  const inSubset = new Set(subset);
  let next = 0;
  return full.map((id) => (inSubset.has(id) ? subset[next++] : id));
}
