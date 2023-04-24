export type Permission = "read" | "write";

export const hasWritePermission = (object: { permissions: Permission[] }) => {
  return object.permissions.includes("write");
};
