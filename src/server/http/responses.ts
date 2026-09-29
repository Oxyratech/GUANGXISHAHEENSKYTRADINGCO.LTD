import "server-only";

/** Bare-status responses for file routes. Bodies carry no detail, so nothing can be learned from them. */
function plain(status: number, extraHeaders: Record<string, string> = {}): Response {
  return new Response(null, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders },
  });
}

export const notFoundResponse = () => plain(404);
export const unauthorizedResponse = () => plain(401);
export const forbiddenResponse = () => plain(403);
export const serviceUnavailableResponse = () => plain(503, { "Retry-After": "30" });
export const serverErrorResponse = () => plain(500);

/** Does an If-None-Match header (a list of entity tags, possibly weak, or `*`) match `etag`? */
export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  if (ifNoneMatch.trim() === "*") return true;
  return ifNoneMatch.split(",").some((candidate) => candidate.trim().replace(/^W\//, "") === etag);
}
