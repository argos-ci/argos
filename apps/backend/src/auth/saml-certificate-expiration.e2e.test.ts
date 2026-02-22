import { beforeEach, describe, expect, it, vi } from "vitest";

import { TeamSamlConfig } from "@/database/models";
import { factory, setupDatabase } from "@/database/testing";
import { sendNotification } from "@/notification";

import { parseSamlSigningCertificate } from "./saml";
import { checkExpiringSamlCertificates } from "./saml-certificate-expiration";

vi.mock("@/notification", () => ({
  sendNotification: vi.fn(),
}));

vi.mock("./saml", async () => {
  const actual = await vi.importActual<typeof import("./saml")>("./saml");
  return {
    ...actual,
    parseSamlSigningCertificate: vi.fn(),
  };
});

const mockParseSamlSigningCertificate = vi.mocked(parseSamlSigningCertificate);
const mockSendNotification = vi.mocked(sendNotification);

describe("checkExpiringSamlCertificates", () => {
  beforeEach(async () => {
    await setupDatabase();
    vi.clearAllMocks();
  });

  it("sends notifications for due thresholds and updates next check date", async () => {
    const now = new Date("2026-03-02T10:00:00.000Z");
    const expirationDate = new Date("2026-04-01T10:00:00.000Z");

    const userAccount = await factory.UserAccount.create();
    const teamAccount = await factory.TeamAccount.create();
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: userAccount.userId!,
      userLevel: "owner",
    });

    const samlConfig = await TeamSamlConfig.query().insertAndFetch({
      accountId: teamAccount.id,
      idpEntityId: "https://idp.example.com/entity",
      ssoUrl: "https://idp.example.com/sso",
      signingCertificate: "fake-certificate",
      enabled: true,
      enforced: false,
      expirationCheckAt: new Date("2026-03-01T10:00:00.000Z").toISOString(),
    });

    mockParseSamlSigningCertificate.mockReturnValue({
      validTo: expirationDate,
    });

    await checkExpiringSamlCertificates(now);

    expect(mockSendNotification).toHaveBeenCalledTimes(1);
    expect(mockSendNotification).toHaveBeenCalledWith({
      type: "saml_certificate_expiration",
      data: {
        accountName: teamAccount.name,
        accountSlug: teamAccount.slug,
        daysBeforeExpiration: 30,
        expirationDate: expirationDate.toISOString(),
      },
      recipients: [userAccount.userId!],
    });

    const updated = await TeamSamlConfig.query().findById(samlConfig.id);
    expect(
      updated?.expirationCheckAt
        ? new Date(updated.expirationCheckAt).toISOString()
        : null,
    ).toBe("2026-03-25T10:00:00.000Z");
  });

  it("sends all due threshold notifications once when multiple checks were missed", async () => {
    const now = new Date("2026-03-31T10:00:00.000Z");
    const expirationDate = new Date("2026-04-01T10:00:00.000Z");

    const userAccount = await factory.UserAccount.create();
    const teamAccount = await factory.TeamAccount.create();
    await factory.TeamUser.create({
      teamId: teamAccount.teamId!,
      userId: userAccount.userId!,
      userLevel: "owner",
    });

    await TeamSamlConfig.query().insertAndFetch({
      accountId: teamAccount.id,
      idpEntityId: "https://idp.example.com/entity",
      ssoUrl: "https://idp.example.com/sso",
      signingCertificate: "fake-certificate",
      enabled: true,
      enforced: false,
      expirationCheckAt: new Date("2026-03-01T10:00:00.000Z").toISOString(),
    });

    mockParseSamlSigningCertificate.mockReturnValue({
      validTo: expirationDate,
    });

    await checkExpiringSamlCertificates(now);

    expect(mockSendNotification).toHaveBeenCalledTimes(4);
    expect(
      mockSendNotification.mock.calls.map(
        (call) => (call[0] as any).data.daysBeforeExpiration,
      ),
    ).toEqual([30, 7, 3, 1]);
  });
});
