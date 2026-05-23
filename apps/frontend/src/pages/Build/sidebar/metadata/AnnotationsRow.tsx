import { InfoIcon, TriangleAlertIcon, type LucideIcon } from "lucide-react";

import { Linkify } from "@/containers/Linkify";
import type { ScreenshotMetadataTestAnnotation } from "@/gql/graphql";
import { Chip } from "@/ui/Chip";
import { Truncable } from "@/ui/Truncable";
import type { UIColor } from "@/util/colors";

import { MetadataRow } from "./MetadataRow";

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

export function AnnotationsRow(props: {
  annotations: ScreenshotMetadataTestAnnotation[] | null;
  repoUrl: string | null;
}) {
  const { annotations, repoUrl } = props;
  if (!annotations || annotations.length === 0) {
    return null;
  }
  return (
    <>
      {annotations.map((annotation, index) => {
        const descriptor = getAnnotationDescriptor(annotation.type);
        return (
          <MetadataRow key={index}>
            <Chip color={descriptor.color} icon={descriptor.icon}>
              {annotation.description ? (
                <span className="flex gap-1">
                  {annotation.type}:
                  <Truncable
                    className="max-w-3xs"
                    tooltipProps={{ disableHoverableContent: false }}
                  >
                    <Linkify repoUrl={repoUrl}>
                      {annotation.description}
                    </Linkify>
                  </Truncable>
                </span>
              ) : (
                annotation.type
              )}
            </Chip>
          </MetadataRow>
        );
      })}
    </>
  );
}
