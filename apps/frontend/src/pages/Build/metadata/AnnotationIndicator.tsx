import { InfoIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react";

import type { ScreenshotMetadataTestAnnotation } from "@/gql/graphql";
import { Chip, type ChipProps } from "@/ui/Chip";
import type { UIColor } from "@/util/colors";

interface AnnotationIndicatorProps
  extends Omit<ChipProps, "children" | "scale" | "icon"> {
  annotation: ScreenshotMetadataTestAnnotation;
}

function getAnnotationDescriptor(type: string): {
  color: UIColor;
  icon: LucideIcon;
} {
  switch (type) {
    case "warning":
    case "notice":
      return { color: "warning", icon: TriangleAlertIcon };
    case "alert":
      return { color: "danger", icon: TriangleAlertIcon };
    default:
      return { color: "info", icon: InfoIcon };
  }
}

export function AnnotationIndicator(props: AnnotationIndicatorProps) {
  const { annotation, ...rest } = props;
  const descriptor = getAnnotationDescriptor(annotation.type);
  return (
    <Chip color={descriptor.color} icon={descriptor.icon} scale="xs" {...rest}>
      {annotation.description ? (
        <>
          {annotation.type}: {annotation.description}
        </>
      ) : (
        annotation.type
      )}
    </Chip>
  );
}
