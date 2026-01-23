import { sqids } from "@/util/sqids";

import { decodeFingerprint, encodeFingerprint } from "./fingerprint";

interface TestIdPayload {
  projectName: string;
  testId: string;
}

/**
 * Encodes a test ID string into a format that includes the project name.
 */
export function formatTestId(input: TestIdPayload) {
  const { projectName, testId } = input;
  return `${projectName.toUpperCase()}-${sqids.encode([Number(testId)])}`;
}

/**
 * Parses a test ID string into an object containing the project name and test ID.
 */
function parseTestId(input: string): TestIdPayload {
  const parts = input.split("-");
  const testId = parts.pop();
  const projectName = parts.join("-");
  if (!projectName || !testId) {
    throw new Error("Invalid test ID format");
  }
  const decoded = sqids.decode(testId)[0];
  if (decoded === undefined) {
    throw new Error("Invalid test ID format");
  }
  return {
    projectName,
    testId: String(decoded),
  };
}

/**
 * Parses a test ID string, returns null if it fails.
 */
export function safeParseTextId(input: string): TestIdPayload | null {
  try {
    return parseTestId(input);
  } catch {
    return null;
  }
}

export interface TestChangeIdPayload extends TestIdPayload {
  fingerprint: string;
}

/**
 * Encodes a test change ID string into a format that includes the project name.
 */
export function formatTestChangeId(input: TestChangeIdPayload): string {
  return `${formatTestId(input)}-${encodeFingerprint(input.fingerprint)}`;
}

/**
 * Parses a test change ID string into an object containing the project name and test ID.
 */
function parseTestChangeId(input: string): TestChangeIdPayload {
  const parts = input.split("-");
  const fingerprint = parts.pop();
  const testId = parts.join("-");
  if (!testId || !fingerprint) {
    throw new Error("Invalid test change ID format");
  }
  const testIdPayload = parseTestId(testId);
  const decodedFingerprint = decodeFingerprint(fingerprint);
  return {
    ...testIdPayload,
    fingerprint: decodedFingerprint,
  };
}

/**
 * Safely parses a change ID string, returning null if parsing fails.
 */
export function safeParseTestChangeId(
  input: string,
): TestChangeIdPayload | null {
  try {
    return parseTestChangeId(input);
  } catch (error) {
    console.error("Failed to parse test change ID:", input, error);
    return null;
  }
}
