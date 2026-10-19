import { describe, expect, it } from "vitest";
import { selectAdapterKind } from "../../src/prisma/create-prisma-client.js";

describe("selectAdapterKind", () => {
  it.each([
    "postgresql://kuorum:kuorum@localhost:54329/kuorum",
    "postgresql://kuorum:kuorum@127.0.0.1:5432/kuorum",
    "postgresql://kuorum:kuorum@[::1]:5432/kuorum",
  ])("usa pg para %s", (url) => {
    expect(selectAdapterKind(url)).toBe("pg");
  });

  it("usa neon para un host remoto", () => {
    const url = "postgresql://u:p@ep-cool-123.us-east-2.aws.neon.tech/db?sslmode=require";
    expect(selectAdapterKind(url)).toBe("neon");
  });

  it("no confunde un host que solo contiene localhost", () => {
    expect(selectAdapterKind("postgresql://u:p@localhost.example.com/db")).toBe("neon");
  });
});
