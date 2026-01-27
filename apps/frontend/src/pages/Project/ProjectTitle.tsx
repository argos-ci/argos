import { Helmet } from "react-helmet";

import type { ProjectParams } from "./ProjectParams";

/**
 * Get a title of a page in a project.
 */
function getProjectTitle(params: ProjectParams, title: string) {
  return `${title} • ${params.accountSlug}/${params.projectName}`;
}

/**
 * Component to display the project title.
 */
export function ProjectTitle(props: {
  params: ProjectParams;
  children: string;
}) {
  return (
    <Helmet>
      <title>{getProjectTitle(props.params, props.children)}</title>
    </Helmet>
  );
}
