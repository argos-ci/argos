import { Chip } from "@/ui/Chip";

import { AutomationLibraryIcon } from "../../metadata/automationLibrary/AutomationLibraryIcon";
import { MetadataRow } from "./MetadataRow";
import type { AutomationLibrary } from "./utils";

export function AutomationLibraryRow(props: {
  automationLibrary: AutomationLibrary | null;
}) {
  const { automationLibrary } = props;
  if (!automationLibrary) {
    return null;
  }
  return (
    <MetadataRow>
      <Chip icon={<AutomationLibraryIcon name={automationLibrary.name} />}>
        {automationLibrary.name}
        <span className="text-low ml-1">v{automationLibrary.version}</span>
      </Chip>
    </MetadataRow>
  );
}
