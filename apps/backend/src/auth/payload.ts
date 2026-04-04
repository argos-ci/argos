import type { Account, Project, User } from "@/database/models";

export type AuthProjectPayload = {
  type: "project";
  project: Project;
};

export type AuthJWTPayload = {
  type: "jwt";
  account: Account;
  user: User;
};

export type AuthPATPayload = {
  type: "pat";
  account: Account;
  user: User;
  scope: Account[];
};

export type AuthPayload = AuthProjectPayload | AuthJWTPayload | AuthPATPayload;
