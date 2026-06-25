import { createContext, use, type ReactNode } from "react";

/**
 * Whether the ignore feature is enabled for the current project.
 * Defaults to `true` so that consumers without a provider keep the feature
 * available.
 */
const ProjectIgnoreEnabledContext = createContext<boolean>(true);

export function ProjectIgnoreEnabledProvider(props: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <ProjectIgnoreEnabledContext value={props.enabled}>
      {props.children}
    </ProjectIgnoreEnabledContext>
  );
}

export function useProjectIgnoreEnabled() {
  return use(ProjectIgnoreEnabledContext);
}
