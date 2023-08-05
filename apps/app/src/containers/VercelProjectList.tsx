import config from "@/config";
import { FragmentType, graphql, useFragment } from "@/gql";
import { Button } from "@/ui/Button";
import { Anchor } from "@/ui/Link";
import { List, ListRow } from "@/ui/List";

const VercelProjectFragment = graphql(`
  fragment VercelProjectList_VercelApiProject on VercelApiProject {
    id
    name
    link {
      __typename
      type
      ... on VercelApiProjectLinkGithub {
        org
        repo
        repoId
      }
    }
    project {
      id
      name
    }
  }
`);

export const VercelProjectList = (props: {
  onSelectProject: (projectId: string) => void;
  disabled?: boolean;
  projects: FragmentType<typeof VercelProjectFragment>[];
}) => {
  const projects = useFragment(VercelProjectFragment, props.projects);
  return (
    <List className="overflow-auto">
      {projects.map((project) => (
        <ListRow key={project.id} className="justify-between p-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold">{project.name}</div>
            </div>
            {project.link && (
              <div className="text-xs text-low">{project.link.type}</div>
            )}
          </div>
          {project.project ? (
            `Linked to another project (${project.project.name})`
          ) : (
            <Button
              onClick={() => {
                props.onSelectProject(project.id);
              }}
              disabled={props.disabled}
            >
              Link
            </Button>
          )}
        </ListRow>
      ))}
      <ListRow className="p-4">
        Don't see your project?{" "}
        <Anchor href={config.get("vercel.integrationUrl")} external>
          Manage permissions on Vercel
        </Anchor>
      </ListRow>
    </List>
  );
};
