import type { Build } from "./Build";
import type { Owner } from "./Owner";
import type { Permission } from "./Permission";

export interface Repository {
  id: string;
  name: string;
  referenceBranch: string;
  owner: Owner;
  build: Build | null;
  permissions: Permission[];
  private: boolean;
}
