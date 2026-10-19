import { describe, expect, it, vi } from "vitest";
import { VerificationStep } from "../../src/steps/verification-step.js";
import { makeContext } from "../doubles.js";

const state = { completedSteps: [], productionUrl: "https://kuorum-x.vercel.app" };

function sequence(...statuses: number[]) {
  const queue = [...statuses];
  return vi.fn<typeof fetch>(async () => new Response("{}", { status: queue.shift() ?? 503 }));
}

describe("verificacion", () => {
  it("termina bien en el tercer intento tras 503, 503, 200", async () => {
    const fetchFake = sequence(503, 503, 200);
    const sleep = vi.fn(async () => {});
    await new VerificationStep().run(makeContext({ state, fetch: fetchFake, sleep }));
    expect(fetchFake).toHaveBeenCalledTimes(3);
    expect(fetchFake.mock.calls[0]?.[0]).toBe("https://kuorum-x.vercel.app/api/salud");
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(5000);
  });

  it("con 12 respuestas 503 falla e informa la última", async () => {
    const fetchFake = sequence(...Array<number>(12).fill(503));
    await expect(
      new VerificationStep().run(makeContext({ state, fetch: fetchFake })),
    ).rejects.toThrow(/503/);
    expect(fetchFake).toHaveBeenCalledTimes(12);
  });

  it("trata un error de red como intento fallido", async () => {
    let calls = 0;
    const fetchFake = async () => {
      calls += 1;
      if (calls === 1) throw new Error("ECONNRESET");
      return new Response("{}", { status: 200 });
    };
    await new VerificationStep().run(makeContext({ state, fetch: fetchFake }));
    expect(calls).toBe(2);
  });

  it("falla si no hay productionUrl", async () => {
    await expect(new VerificationStep().run(makeContext())).rejects.toThrow(/URL/);
  });
});
