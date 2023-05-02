import axios from "axios";

import config from "@argos-ci/config";

type VercelTokenResponse = {
  token_type: "Bearer";
  access_token: string;
  installation_id: string;
  user_id: string;
  team_id: null;
};

export const retrieveToken = async (code: string) => {
  const params = new URLSearchParams();
  params.append("client_id", config.get("vercel.clientId"));
  params.append("client_secret", config.get("vercel.clientSecret"));
  params.append("code", code);
  params.append(
    "redirect_uri",
    new URL("/vercel/callback", config.get("server.url")).href
  );
  const result = await axios.post<VercelTokenResponse>(
    "https://api.vercel.com/v2/oauth/access_token",
    params
  );
  return result.data;
};

export type VercelTeam = {
  id: string;
  slug: string;
  name: string | null;
};

export type VercelGetTeamResponse = VercelTeam;

export type VercelProject = {
  id: string;
  name: string;
  link?:
    | {
        org?: string;
        repo?: string;
        repoId?: number;
        type?: "github";
      }
    | {
        type?: "gitlab";
      }
    | {
        type?: "bitbucket";
      };
};

export type VercelListProjectsResponse = {
  projects: VercelProject[];
  pagination: {
    count: number;
    next: string | null;
    prev: string | null;
  };
};

export type VercelFindProjectResponse = VercelProject;

export type VercelClientParams = {
  accessToken: string;
};

export type VercelGetConfigurationResponse = {
  id: string;
};

export const createVercelClient = (params: VercelClientParams) => {
  const request = axios.create({
    baseURL: "https://api.vercel.com",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
    },
  });
  return {
    getTeam: async (id: string) => {
      const result = await request.get<VercelGetTeamResponse>(
        `/v2/teams/${id}`
      );
      return result.data;
    },
    findProject: async (idOrName: string) => {
      const result = await request.get<VercelFindProjectResponse>(
        `/v9/projects/${idOrName}`
      );
      return result.data;
    },
    listProjects: async (
      options: {
        teamId?: string | undefined | null;
        limit?: number | undefined | null;
      } = {}
    ) => {
      const result = await request.get<VercelListProjectsResponse>(
        `/v9/projects`,
        {
          params: {
            teamId: options.teamId,
            limit: options.limit,
          },
        }
      );
      return result.data;
    },
    getConfiguration: async (id: string, teamId: string | null) => {
      const result = await request.get<VercelGetConfigurationResponse>(
        `/v1/integrations/configuration/${id}`,
        {
          params: {
            teamId: teamId,
          },
        }
      );
      return result.data;
    },
  };
};