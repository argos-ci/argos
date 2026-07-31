/**
 * Human-readable names for the passkey providers we can recognise, keyed by
 * AAGUID (the Authenticator Attestation GUID an authenticator reports at
 * registration).
 *
 * Used only to give a freshly created passkey a name the user recognises — they
 * can rename it afterwards — so an AAGUID missing from this list is not a
 * problem, it just falls back to a generic label. AAGUIDs come from the
 * community registry at
 * https://github.com/passkeydeveloper/passkey-authenticator-aaguids.
 */
const AUTHENTICATOR_NAMES: Record<string, string> = {
  // Password managers
  "bada5566-a7aa-401f-bd96-45619a55120d": "1Password",
  "d548826e-79b4-db40-a3d8-11116f7e8349": "Bitwarden",
  "531126d6-e717-415c-9320-3d9aa6981239": "Dashlane",
  "f3809540-7f14-49c1-a8b3-8f813b225541": "Enpass",
  "0ea242b4-43c4-4a1b-8b17-dd6d0b6baec6": "Keeper",
  "b78a0a55-6ef8-d246-a042-ba0f6d55050c": "LastPass",
  "b84e4048-15dc-4dd0-8640-f4f60813c8af": "NordPass",
  "50726f74-6f6e-5061-7373-50726f746f6e": "Proton Pass",
  "cc45f64e-52a2-451b-831a-4edd8022a202": "ToothPic Passkey Provider",

  // Platform providers
  "fbfc3007-154e-4ecc-8c0b-6e020557d7bd": "iCloud Keychain",
  "dd4ec289-e01d-41c9-bb89-70fa845d4bf2": "iCloud Keychain (Managed)",
  "ea9b8d66-4d01-1d21-3ce4-b6b48cb575d4": "Google Password Manager",
  "adce0002-35bc-c60a-648b-0b25f1f05503": "Chrome on Mac",
  "b5397666-4885-aa6b-cebf-e52262a439a2": "Chromium Browser",
  "771b48fd-d3d4-4f74-9232-fc157ab0507a": "Edge on Mac",
  "08987058-cadc-4b81-b6e1-30de50dcbe96": "Windows Hello",
  "9ddd1817-af5a-4672-a2b9-3e3dd95000a9": "Windows Hello",
  "6028b017-b1d4-4c02-b4b3-afcdafc96bb2": "Windows Hello",

  // Security keys
  "cb69481e-8ff7-4039-93ec-0a2729a154a8": "YubiKey 5 Series",
  "ee882879-721c-4913-9775-3dfcce97072a": "YubiKey 5 Series",
  "fa2b99dc-9e39-4257-8f92-4a30d23c4118": "YubiKey 5 Series",
  "2fc0579f-8113-47ea-b116-bb5a8db9202a": "YubiKey 5 Series",
  "85203421-48f9-4355-9bc8-8a53846e5083": "YubiKey 5 FIPS Series",
  "d8522d9f-575b-4866-88a9-ba99fa02f35b": "YubiKey Bio Series",
  "f8a011f3-8c0a-4d15-8006-17111f9edc7d": "Security Key by Yubico",
  "de1e552d-db1d-4423-a619-566b625cdc84": "Security Key by Yubico",
};

/** AAGUID reported when the authenticator declines to identify itself. */
const EMPTY_AAGUID = "00000000-0000-0000-0000-000000000000";

/**
 * Default name for a newly registered passkey.
 *
 * Falls back to the device the browser is running on (e.g. "Chrome on macOS")
 * when the authenticator is unknown or anonymous, so the row still says
 * something useful about where the passkey lives.
 */
export function getDefaultPasskeyName(input: {
  aaguid: string | null;
  deviceLabel: string | null;
}): string {
  if (input.aaguid && input.aaguid !== EMPTY_AAGUID) {
    const name = AUTHENTICATOR_NAMES[input.aaguid];
    if (name) {
      return name;
    }
  }
  return input.deviceLabel ?? "Passkey";
}
