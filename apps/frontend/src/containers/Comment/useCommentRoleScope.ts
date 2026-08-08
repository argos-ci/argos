import { useProjectParams } from "@/pages/Project/ProjectParams";

/**
 * The project a comment's author is looked up in, to label them with their team
 * role.
 *
 * `UserCard_user` selects `role(accountSlug:, projectName:)`, so every query and
 * mutation that renders a comment has to supply the pair. On a project route it
 * comes from the URL. The media share page is reached at `/m/:shareToken`, which
 * names no project — and a visitor following a public link may not be allowed to
 * know which project it belongs to — so the pair falls back to empty strings.
 *
 * The `role` resolver answers an unknown project with `null`, so the only cost is
 * the role label beside the author's name. Nothing else reads these variables.
 */
export function useCommentRoleScope(): {
  accountSlug: string;
  projectName: string;
} {
  const projectParams = useProjectParams();
  return {
    accountSlug: projectParams?.accountSlug ?? "",
    projectName: projectParams?.projectName ?? "",
  };
}
