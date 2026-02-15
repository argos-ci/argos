import { describe, expect, it } from "vitest";

import {
  extractEmailFromSaml,
  getTeamSamlPublicValues,
  parseIdpMetadataXml,
  samlTestUtils,
} from "./saml";

describe("saml", () => {
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
  });
});
