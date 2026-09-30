/**
 * Uploaded media is served at /media/<GUID>. That is the only local image address an article body
 * may use, so the same pattern decides which ids the repository looks up and which images the
 * renderer draws. Pure and isomorphic: no server-only imports.
 */
const GUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const MEDIA_PATH = new RegExp(`^/media/(${GUID})$`, "i");
const MEDIA_PATH_ANYWHERE = new RegExp(`/media/(${GUID})(?![0-9a-f-])`, "gi");

/** A body holds a handful of images; the cap keeps a pathological article from a huge IN list. */
const MAX_BODY_MEDIA = 50;

/** The lower-case asset id of a "/media/<GUID>" path, or null for any other string. */
export function mediaAssetIdFromPath(path: string): string | null {
  const match = MEDIA_PATH.exec(path);
  return match?.[1] ? match[1].toLowerCase() : null;
}

/** Canonical (lower-case) public address of an asset. */
export function mediaPath(id: string): string {
  return `/media/${id.toLowerCase()}`;
}

/** Distinct lower-case asset ids referenced anywhere in a Markdown body, in order of appearance. */
export function findMediaAssetIds(markdown: string): string[] {
  const ids = new Set<string>();
  for (const match of markdown.matchAll(MEDIA_PATH_ANYWHERE)) {
    if (match[1]) ids.add(match[1].toLowerCase());
    if (ids.size >= MAX_BODY_MEDIA) break;
  }
  return [...ids];
}
