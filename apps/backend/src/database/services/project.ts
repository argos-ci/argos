import { Project } from "../models/Project.js";

const RESERVED_PROJECT_NAMES = ["new", "settings"];

export const checkProjectName = async (args: {
  name: string;
  accountId: string;
}) => {
  if (RESERVED_PROJECT_NAMES.includes(args.name)) {
    throw new Error("Name is reserved for internal usage");
  }

  const sameName = await Project.query()
    .select("id")
    .findOne({ name: args.name, accountId: args.accountId })
    .first();

  if (sameName) {
    throw new Error("Name is already used by another project");
  }
};

export const resolveProjectName = async (args: {
  name: string;
  accountId: string;
  index?: number;
}): Promise<string> => {
  const index = args.index || 0;
  const name = args.index ? `${args.name}-${index}` : args.name;
  try {
    await checkProjectName({ ...args, name });
  } catch {
    return resolveProjectName({ ...args, index: index + 1 });
  }

  return name;
};
