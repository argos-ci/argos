import { Deployment } from "@/database/models";

export async function listProjectDeployments(args: {
  projectId: string;
  after: number;
  first: number;
}) {
  const { projectId, after, first } = args;

  return Deployment.query()
    .where("projectId", projectId)
    .orderBy([
      { column: "createdAt", order: "desc" },
      { column: "id", order: "desc" },
    ])
    .range(after, after + first - 1);
}
