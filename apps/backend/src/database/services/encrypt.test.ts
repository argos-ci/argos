import { describe, expect, it } from "vitest";

import { decrypt, encrypt, encryptDeterministic } from "./encrypt";

describe("encrypt / decrypt", () => {
  it("round-trips a value", () => {
    const value = "argos_super-secret-token";
    const encrypted = encrypt(value);
    expect(encrypted).not.toBe(value);
    expect(decrypt(encrypted)).toBe(value);
    console.log(
      decrypt(
        "TFC4pH6ob4Na3GNOBWRF0hKN4sdCaF6HlRbj2el9TMyM1sayWJbHpqTpZUmjTD8es7TobiJZzFufjIdIiHMaalnR4tA=",
      ),
    );
  });

  it("uses a random IV so equal plaintexts produce different ciphertexts", () => {
    const value = "same-value";
    expect(encrypt(value)).not.toBe(encrypt(value));
  });

  it("round-trips unicode and empty strings", () => {
    for (const value of ["", "héllo 🌍", "multi\nline\tvalue"]) {
      expect(decrypt(encrypt(value))).toBe(value);
    }
  });
});

describe("encryptDeterministic", () => {
  it("produces stable ciphertext for the same plaintext", () => {
    const value = "argos_lookup-token";
    expect(encryptDeterministic(value)).toBe(encryptDeterministic(value));
  });

  it("produces different ciphertext for different plaintexts", () => {
    expect(encryptDeterministic("a")).not.toBe(encryptDeterministic("b"));
  });

  it("round-trips through decrypt", () => {
    const value = "argos_lookup-token";
    expect(decrypt(encryptDeterministic(value))).toBe(value);
  });
});

describe("decrypt fallback", () => {
  it("returns legacy plaintext unchanged", () => {
    expect(decrypt("argos_plaintext-legacy-token")).toBe(
      "argos_plaintext-legacy-token",
    );
  });

  it("rejects tampered ciphertext by returning the input unchanged", () => {
    const encrypted = encrypt("secret");
    const buffer = Buffer.from(encrypted, "base64");
    const lastIndex = buffer.length - 1;
    buffer[lastIndex] = (buffer[lastIndex] ?? 0) ^ 0xff;
    const tampered = buffer.toString("base64");
    expect(decrypt(tampered)).toBe(tampered);
  });
});
