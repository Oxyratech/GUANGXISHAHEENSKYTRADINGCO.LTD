import { isDatabaseConfigured } from "@/server/db";

/**
 * Liveness probe for the platform. It reports only whether a database connection string exists,
 * not whether the database answers, and nothing else: no versions, hosts or environment values.
 */
export function GET() {
  return Response.json(
    { status: "ok", database: isDatabaseConfigured() ? "configured" : "not_configured" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
