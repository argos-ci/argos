import { afterEach, describe, expect, it, vi } from "vitest";

import * as redisClientModule from "@/util/redis/client";

import {
  extractEmailFromSaml,
  getTeamSamlPublicValues,
  parseIdpMetadataXml,
  parseSamlSigningCertificate,
  samlTestUtils,
} from "./saml";

describe("saml", () => {
  describe("parseSamlSigningCertificate", () => {
    const certificatePem = `-----BEGIN CERTIFICATE-----
MIIDCzCCAfOgAwIBAgIUHy2hUrLCQv9m+KulRAqStlhVKxEwDQYJKoZIhvcNAQEL
BQAwFTETMBEGA1UEAwwKYXJnb3MtdGVzdDAeFw0yNjAyMjIyMTI5MTFaFw0yNzAy
MjIyMTI5MTFaMBUxEzARBgNVBAMMCmFyZ29zLXRlc3QwggEiMA0GCSqGSIb3DQEB
AQUAA4IBDwAwggEKAoIBAQCkUJUrFDC0Az6VZ+Is4m9OXSY69x/J0ad876c7NXCh
edbrFWBNzeiGO5T953Jjmxzbsf+1gfaGZxRSuByCb3iDfOpYE71lxSmQRnmZhXOz
sFc93c74mwPTdmilwvafip8OOIShM4CLor3A776lM7Lrndug55q88K28vJ6/OWTz
btjurjSBU8oTgclj1YYzmgwmGmZfF7AcwvAtY/I29TztVF9GtZo0O1wRDL3e2iOO
rwZNFxfP1JLBNKR0K96HAkq2AOOcPrFeRxqKLysL1p7EIC3eLvEBoWrJ8WPsvC7w
GJLAyutw05FD2xE/XKBifjI7htYUbKMckafjn49MVOdfAgMBAAGjUzBRMB0GA1Ud
DgQWBBQ2DSE9aknaZF+U6h4v6oGs3GkOpTAfBgNVHSMEGDAWgBQ2DSE9aknaZF+U
6h4v6oGs3GkOpTAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3DQEBCwUAA4IBAQBi
5UeDEoplOx0Q6gkDEwU0LCiZXp2qsICEIVWw4LkNjxFFmm5mqld0o6h9KbBOiHCO
vja10U1oHmGik+7ue2XnCTuhP1UJC/iAusobSmW7NZKi06l59cQFcwCO4KHH8sK3
hfbzEkhBBHSvyfRvAMYKxglJsjftVHqb5HUE6H7pWPPqFfwxPeG4J11JEf05LI+8
SU5PCgkblPIkiQ2wjOdQQswFROGflNnxKvxIz/cRUm1pQsahD8LlSicLt4okSAAE
EyVdxIQnWw2OnQzi8v2ikUrIsxKvlWUvHFmTIeYEfWF2J7rITon4FZkuGf1LKiIr
/hfeaix7+0zIf8esyXrL
-----END CERTIFICATE-----`;
    const certificateBase64 = certificatePem
      .replace("-----BEGIN CERTIFICATE-----", "")
      .replace("-----END CERTIFICATE-----", "")
      .replace(/\s+/g, "");

    it("parses a PEM certificate and extracts expiration date", () => {
      const parsed = parseSamlSigningCertificate(certificatePem);
      expect(parsed.validTo.toISOString()).toBe("2027-02-22T21:29:11.000Z");
    });

    it("parses a base64 certificate without PEM headers", () => {
      const parsed = parseSamlSigningCertificate(certificateBase64);
      expect(parsed.validTo.toISOString()).toBe("2027-02-22T21:29:11.000Z");
    });

    it("throws on invalid certificate input", () => {
      expect(() => parseSamlSigningCertificate("not-a-certificate")).toThrow(
        "Invalid signing certificate.",
      );
    });
  });

  describe("extractEmailFromSaml", () => {
    it("extracts email from configured keys", () => {
      const email = extractEmailFromSaml({
        other: "fallback@example.com",
        mail: "configured@example.com",
      });
      expect(email).toBe("configured@example.com");
    });
  });

  describe("parseIdpMetadataXml", () => {
    it("parses entity id, sso url and signing certificate", () => {
      const certificate =
        "MIIC2DCCAcCgAwIBAgIBADANBgkqhkiG9w0BAQsFADAhMR8wHQYDVQQDDBZleGFtcGxlLWlkcC5hcmdvcy10ZXN0MB4XDTI2MDIxNTEyMDAwMFoXDTM2MDIxMjEyMDAwMFowITEfMB0GA1UEAwwWZXhhbXBsZS1pZHAuYXJnb3MtdGVzdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALQw0cEJ4Q2Ywd4HxkV3vOe4DODaGbfgJAEz5ECfL2N6CzWkR7N+6ZQhGv1Z2gqvAf4Q+b5aRz8Kc2e5w3TRfpp5j6p1jJbS9W9cgikmYHF8ej56iq2Q6mQf2B8a4gqQw8MF1fNfWwWq9MLJiz9eRrp8OaYxR6WfWE6t8m9N5kOP0Y7M2n8EjaZkFLeC8kprwQ6U2X4f6k0kR1qS1j1nq4E5V9nMWB4Kc7zblux2K8zI8C4NfN7UdQH8WRm/7aWq8T1R9v0v2kSLP7W7X6x5M7w6iJ6f0w6jR0T0k3kU2X6fW8y5+2tUdP6hQ2N5fB2Vn8q8K8f7Qh6P3nq8kzvO5Y1mQ8CAwEAAaNTMFEwHQYDVR0OBBYEFDwX3l3k5k8W5WqX7H0V2a0Q2YQ2MB8GA1UdIwQYMBaAFDwX3l3k5k8W5WqX7H0V2a0Q2YQ2MA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBAH6i8r8Yp8w8S6G5Y4vVv2hTn8wF1f8qk8bqfA8B0gQ2c4gX4o4Jx8GkQ6H5Q5R4nQ5sVJ4aQjvP7bQ5m9P3y7gGQ6A4X7l8b3Q5g6W9X2m8H8d4H6W7L8X4Q5P6l8Q2p8x9F5Q4m7Q8W3l8b9m6d3G9M4Q8W7k9Q4W8b9P6m2G8Q4l6W9m7H3Q5W8b6Q8m4F9Q6l8H3m7Q5W8b6Q8m4F9Q6l8H3m7Q5W8b6Q8m4F9Q6l8H3m7Q5W8b6Q8m4F9Q6l8H3m7Q5W8b6Q8m4F9Q6l8H3m7Q4=";
      const metadata = `
<EntityDescriptor entityID="https://idp.example.com/entity" xmlns="urn:oasis:names:tc:SAML:2.0:metadata">
  <IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <KeyDescriptor use="signing">
      <KeyInfo xmlns="http://www.w3.org/2000/09/xmldsig#">
        <X509Data>
          <X509Certificate>${certificate}</X509Certificate>
        </X509Data>
      </KeyInfo>
    </KeyDescriptor>
    <SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect" Location="https://idp.example.com/sso"/>
  </IDPSSODescriptor>
</EntityDescriptor>`;

      const parsed = parseIdpMetadataXml(metadata);
      expect(parsed.idpEntityId).toBe("https://idp.example.com/entity");
      expect(parsed.ssoUrl).toBe("https://idp.example.com/sso");
      expect(parsed.signingCertificate).toEqual(certificate);
    });
  });

  describe("security assertions", () => {
    it("enforces audience and destination", () => {
      const values = getTeamSamlPublicValues("acme");
      expect(() =>
        samlTestUtils.assertSamlAudienceAndRecipient({
          extract: {
            issuer: "https://idp.example.com/entity",
            audience: values.entityId,
            nameId: null,
            response: {
              destination: values.acsUrl,
              inResponseTo: null,
            },
            conditions: {
              notBefore: null,
              notOnOrAfter: null,
            },
            attributes: {},
          },
          teamSlug: "acme",
          idpEntityId: "https://idp.example.com/entity",
        }),
      ).not.toThrow();
    });

    it("rejects an invalid recipient", () => {
      expect(() =>
        samlTestUtils.assertSamlRecipientInXml({
          samlContent: '<Response Recipient="https://example.com/other" />',
          acsUrl: "https://example.com/acs",
        }),
      ).toThrow();
    });

    it("extracts assertion id from saml xml", () => {
      expect(
        samlTestUtils.extractAssertionIdFromXml(
          '<saml:Assertion ID="_assertion-id"></saml:Assertion>',
        ),
      ).toBe("_assertion-id");
    });

    it("rejects missing assertion id", () => {
      expect(() =>
        samlTestUtils.extractAssertionIdFromXml(
          "<saml:Assertion></saml:Assertion>",
        ),
      ).toThrow("Invalid SAML assertion.");
    });

    it("allows idp-initiated response without inResponseTo", () => {
      expect(() =>
        samlTestUtils.assertSamlRequestBinding({
          inResponseTo: null,
          loginState: null,
        }),
      ).not.toThrow();
    });

    it("rejects inResponseTo when relay state was not initiated by sp", () => {
      expect(() =>
        samlTestUtils.assertSamlRequestBinding({
          inResponseTo: "_request-id",
          loginState: null,
        }),
      ).toThrow("Invalid SAML InResponseTo.");
    });

    it("rejects mismatched inResponseTo and loginState.requestId", () => {
      expect(() =>
        samlTestUtils.assertSamlRequestBinding({
          inResponseTo: "_wrong-id",
          loginState: {
            nonce: "nonce",
            requestId: "_correct-id",
            teamSlug: "acme",
            redirect: "/",
          },
        }),
      ).toThrow("Invalid SAML InResponseTo.");
    });

    it("rejects replayed assertions and allows reuse after expiry", async () => {
      const assertionValues = new Map<string, string>();
      const redisSet = vi.fn(
        async (
          key: string,
          value: string,
          options: unknown,
        ): Promise<"OK" | null> => {
          expect(options).toEqual({
            expiration: {
              type: "PX",
              value: 10 * 60 * 1000,
            },
            condition: "NX",
          });
          if (assertionValues.has(key)) {
            return null;
          }
          assertionValues.set(key, value);
          return "OK";
        },
      );

      vi.spyOn(redisClientModule, "getRedisClient").mockResolvedValue({
        set: redisSet,
      } as unknown as Awaited<
        ReturnType<typeof redisClientModule.getRedisClient>
      >);

      await expect(
        samlTestUtils.assertSamlAssertionNotReplayed({
          teamSlug: "acme",
          assertionId: "_assertion-id",
        }),
      ).resolves.toBeUndefined();

      await expect(
        samlTestUtils.assertSamlAssertionNotReplayed({
          teamSlug: "acme",
          assertionId: "_assertion-id",
        }),
      ).rejects.toThrow("SAML assertion was already used for team acme.");

      assertionValues.clear();

      await expect(
        samlTestUtils.assertSamlAssertionNotReplayed({
          teamSlug: "acme",
          assertionId: "_assertion-id",
        }),
      ).resolves.toBeUndefined();
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
