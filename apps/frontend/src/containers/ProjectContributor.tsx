import { ProjectUserLevel } from "@/gql/graphql";
import {
  ListBox,
  ListBoxItem,
  ListBoxItemDescription,
  ListBoxItemLabel,
} from "@/ui/ListBox";

export const ProjectContributorLevelLabel: Record<ProjectUserLevel, string> = {
  admin: "Admin",
  viewer: "Viewer",
  reviewer: "Reviewer",
};

export function ProjectContributorLevelListBox(props: { clearable?: boolean }) {
  return (
    <ListBox>
      {props.clearable && (
        <ListBoxItem id="none" textValue="None">
          <ListBoxItemLabel>No default level</ListBoxItemLabel>
          <ListBoxItemDescription>
            Contributors does not have access to the project by default
          </ListBoxItemDescription>
        </ListBoxItem>
      )}
      <ListBoxItem id="viewer" textValue={ProjectContributorLevelLabel.viewer}>
        <ListBoxItemLabel>
          {ProjectContributorLevelLabel.viewer}
        </ListBoxItemLabel>
        <ListBoxItemDescription>
          See builds and screenshots
        </ListBoxItemDescription>
      </ListBoxItem>
      <ListBoxItem
        id="reviewer"
        textValue={ProjectContributorLevelLabel.reviewer}
      >
        <ListBoxItemLabel>
          {ProjectContributorLevelLabel.reviewer}
        </ListBoxItemLabel>
        <ListBoxItemDescription>See and review builds</ListBoxItemDescription>
      </ListBoxItem>
      <ListBoxItem id="admin" textValue={ProjectContributorLevelLabel.admin}>
        <ListBoxItemLabel>
          {ProjectContributorLevelLabel.admin}
        </ListBoxItemLabel>
        <ListBoxItemDescription>
          Admin level access to the entire project
        </ListBoxItemDescription>
      </ListBoxItem>
    </ListBox>
  );
}
