// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/health", () => {
  it("reports ok and that no database is configured", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const response = GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", database: "not_configured" });
  });

  it("reports that a database is configured without revealing anything about it", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "sqlserver://db.internal:1433;database=x;user=sa;password=SuperSecret1!",
    );

    const response = GET();
    const body = await response.json();

    expect(body).toEqual({ status: "ok", database: "configured" });
    expect(JSON.stringify(body)).not.toMatch(/SuperSecret|db\.internal|sqlserver/);
  });

  it("exposes exactly two fields and is never cached", async () => {
    const response = GET();

    expect(Object.keys(await response.json()).sort()).toEqual(["database", "status"]);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
