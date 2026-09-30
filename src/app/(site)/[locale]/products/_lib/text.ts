/** Longest meta description worth writing: search results cut off around this length. */
const META_DESCRIPTION_LIMIT = 200;

/** One line of plain text no longer than `limit`, cut at a word boundary with an ellipsis. */
export function toMetaDescription(text: string, limit = META_DESCRIPTION_LIMIT): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= limit) return flat;
  const cut = flat.slice(0, limit - 1);
  const boundary = cut.lastIndexOf(" ");
  // A cut inside the first words (or in unspaced Chinese text) keeps the hard limit.
  return `${(boundary > limit / 2 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}
