import { InfoIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react";

import { Linkify } from "@/containers/Linkify";
import type { ScreenshotMetadataTestAnnotation } from "@/gql/graphql";
import { Chip, type ChipProps } from "@/ui/Chip";
import { Truncable } from "@/ui/Truncable";
import type { UIColor } from "@/util/colors";

interface AnnotationIndicatorProps
  extends Omit<ChipProps, "children" | "scale" | "icon"> {
  annotation: ScreenshotMetadataTestAnnotation;
  repoUrl: string | null | undefined;
}

function getAnnotationDescriptor(type: string): {
  color: UIColor;
  icon: LucideIcon;
} {
  switch (type) {
    case "alert":
      return { color: "danger", icon: TriangleAlertIcon };
    case "warning":
      return { color: "warning", icon: TriangleAlertIcon };
    default:
      return { color: "info", icon: InfoIcon };
  }
}

export function AnnotationIndicator(props: AnnotationIndicatorProps) {
  const { annotation, repoUrl, ...rest } = props;
  const descriptor = getAnnotationDescriptor(annotation.type);
  return (
    <Chip color={descriptor.color} icon={descriptor.icon} scale="xs" {...rest}>
      {annotation.description ? (
        <span className="flex gap-1">
          {annotation.type}:
          <Truncable
            className="max-w-3xs"
            tooltipProps={{ disableHoverableContent: false }}
          >
            <Linkify repoUrl={repoUrl}>{annotation.description}</Linkify>
          </Truncable>
        </span>
      ) : (
        annotation.type
      )}
    </Chip>
  );
}
