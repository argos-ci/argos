export type UserLevel = "admin" | "reviewer" | "viewer";

export const UserLevelJsonSchema = {
  type: "string",
  enum: ["admin", "reviewer", "viewer"],
};
