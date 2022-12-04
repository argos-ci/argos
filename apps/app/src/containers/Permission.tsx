export type Permission = "read" | "write";

export const hasWritePermission = (ownerOrRepo: {
  permissions: Permission[];
}) => {
  return ownerOrRepo.permissions.includes("write");
};
