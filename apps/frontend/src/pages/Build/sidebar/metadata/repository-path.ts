/**
 * A test file's path in the repository. A GitHub Action running in a
 * container reports it under the workspace mount.
 */
export function getRepositoryPath(file: string): string {
  return file.replace(/^\/github\/workspace\//, "");
}
