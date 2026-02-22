import { beforeEach, describe, expect, it, vi } from "vitest";
import cron from "node-cron";
import { redisLock } from "@/util/redis";
import { checkExpiringSamlCertificates } from "./saml-certificate-expiration";

import { startSamlCertificateExpirationCron } from "./saml-certificate-expiration-cron";

vi.mock("node-cron", () => ({
  default: {
    schedule: vi.fn(),
  },
}));

vi.mock("@/util/redis", () => ({
  redisLock: {
    acquire: vi.fn(),
  },
}));

vi.mock("./saml-certificate-expiration", () => ({
  checkExpiringSamlCertificates: vi.fn(),
}));

describe("startSamlCertificateExpirationCron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("schedules an hourly cron job and runs under redis lock", async () => {
    let onTick: (() => Promise<void>) | null = null;
    vi.mocked(cron.schedule).mockImplementation((_expression, fn) => {
      onTick = fn as () => Promise<void>;
      return {} as any;
    });
    const acquireMock = vi.mocked(redisLock.acquire).mockImplementation(
      async (_key, task) => task(),
    );
    startSamlCertificateExpirationCron();
    expect(vi.mocked(cron.schedule)).toHaveBeenCalledWith(
      "0 * * * *",
      expect.any(Function),
    );

    expect(onTick).toBeTypeOf("function");
    if (!onTick) {
      throw new Error("Cron callback not captured");
    }
    await (onTick as () => Promise<void>)();

    expect(acquireMock).toHaveBeenCalledWith(
      ["cron", "saml-certificate-expiration"],
      expect.any(Function),
      { timeout: 55 * 60 * 1000 },
    );
    expect(vi.mocked(checkExpiringSamlCertificates)).toHaveBeenCalledTimes(1);
  });
});
