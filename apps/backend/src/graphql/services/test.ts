import { sqids } from "@/util/sqids";

/**
 * Encodes a test ID string into a format that includes the project name.
 */
export function formatTestId(input: { projectName: string; testId: string }) {
  const { projectName, testId } = input;
  return `${projectName.toUpperCase()}-${sqids.encode([Number(testId)])}`;
}

/**
 * Parses a test ID string into an object containing the project name and test ID.
 */
export function parseTestId(input: string) {
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
 * Encodes a test change ID string into a format that includes the project name.
 */
export function formatTestChangeId(input: {
  projectName: string;
  fileId: string;
}) {
  const { projectName, fileId } = input;
  return `${projectName.toUpperCase()}-VAR-${sqids.encode([Number(fileId)])}`;
}

/**
 * Parses a test change ID string into an object containing the project name and test ID.
 */
// export function parseTestChangeId(input: string) {
//   const parts = input.split("-");
//   const fileIdPart = parts.pop();
//   const variantPart = parts.pop();
//   const projectName = parts.join("-");
//   if (!projectName || variantPart !== "VAR" || !fileIdPart) {
//     throw new Error("Invalid test change ID format");
//   }
//   const decoded = sqids.decode(fileIdPart)[0];
//   if (decoded === undefined) {
//     throw new Error("Invalid test change ID format");
//   }
//   return {
//     projectName,
//     fileId: String(decoded),
//   };
// }
