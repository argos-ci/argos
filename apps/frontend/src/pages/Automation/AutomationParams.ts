import { useMemo } from "react";
import { useParams } from "react-router-dom";

import {
  getProjectURL,
  useProjectParams,
  type ProjectParams,
} from "../Project/ProjectParams";

export interface AutomationParams extends ProjectParams {
  automationId: string;
}

/**
 * Returns parameters for an automation page.
 */
export function useAutomationParams(): AutomationParams | null {
  const { automationId } = useParams();
  const projectParams = useProjectParams();
  const params = useMemo(() => {
    if (!projectParams || !automationId) {
      return null;
    }
    return {
      ...projectParams,
      automationId,
    };
  }, [projectParams, automationId]);
  return params;
}

export function getAutomationURL(params: AutomationParams): string {
  return `${getProjectURL(params)}/automations/${params.automationId}`;
}
