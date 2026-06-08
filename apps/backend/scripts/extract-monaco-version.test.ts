import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  generateMonacoVersionModule,
  getMonacoCdnUrl,
  parseMonacoVersionFromLock,
} from "./extract-monaco-version";

const buildLock = (
  reactEntry: { specifier: string; version: string } | null,
  { dev = false }: { dev?: boolean } = {},
) => `
lockfileVersion: '9.0'

importers:
  apps/frontend:
    ${dev ? "devDependencies" : "dependencies"}:
${
  reactEntry
    ? `      '@monaco-editor/react':
        specifier: ${reactEntry.specifier}
        version: ${reactEntry.version}`
    : `      react:
        specifier: ^19.0.0
        version: 19.2.6`
}
`;

describe("parseMonacoVersionFromLock", () => {
  it("extracts the version from the resolved react peer dependency", () => {
    const lock = buildLock({
      specifier: "^4.7.0",
      version:
        "4.7.0(monaco-editor@0.55.1)(react-dom@19.2.6(react@19.2.6))(react@19.2.6)",
    });
    expect(parseMonacoVersionFromLock(lock)).toBe("0.55.1");
  });

  it("supports the dependency being declared as a devDependency", () => {
    const lock = buildLock(
      {
        specifier: "^4.7.0",
        version: "4.7.0(monaco-editor@0.56.0)(react@19.2.6)",
      },
      { dev: true },
    );
    expect(parseMonacoVersionFromLock(lock)).toBe("0.56.0");
  });

  it("handles prerelease versions", () => {
    const lock = buildLock({
      specifier: "^4.7.0",
      version: "4.7.0(monaco-editor@0.56.0-rc.1)(react@19.2.6)",
    });
    expect(parseMonacoVersionFromLock(lock)).toBe("0.56.0-rc.1");
  });

  it("throws when the frontend importer is missing", () => {
    expect(() =>
      parseMonacoVersionFromLock("lockfileVersion: '9.0'\n"),
    ).toThrow(/Could not find importer "apps\/frontend"/);
  });

  it("throws when @monaco-editor/react is missing", () => {
    expect(() => parseMonacoVersionFromLock(buildLock(null))).toThrow(
      /Could not find "@monaco-editor\/react"/,
    );
  });

  it("throws when the version has no monaco-editor peer", () => {
    const lock = buildLock({ specifier: "^4.7.0", version: "4.7.0" });
    expect(() => parseMonacoVersionFromLock(lock)).toThrow(
      /Could not extract the monaco-editor version/,
    );
  });
});

describe("getMonacoCdnUrl", () => {
  it("builds the jsDelivr URL for a version", () => {
    expect(getMonacoCdnUrl("0.55.1")).toBe(
      "https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/",
    );
  });
});

describe("generateMonacoVersionModule", () => {
  it("emits both exports with the version baked in", () => {
    const module = generateMonacoVersionModule("0.55.1");
    expect(module).toContain('export const MONACO_EDITOR_VERSION = "0.55.1";');
    expect(module).toContain(
      '"https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/"',
    );
  });
});

describe("the repository pnpm-lock.yaml", () => {
  it("resolves to a valid monaco-editor version", () => {
    const lockPath = path.resolve(
      import.meta.dirname,
      "../../../pnpm-lock.yaml",
    );
    const version = parseMonacoVersionFromLock(readFileSync(lockPath, "utf8"));
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
