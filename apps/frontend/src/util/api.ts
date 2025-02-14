import type { ErrorCode } from "@argos/error-types";

import { config } from "@/config";

/**
 * Extract error information from an API response.
 */
function extractErrorInfos(data: unknown): {
  message: string;
  code: ErrorCode | null;
} {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    data.error &&
    typeof data.error === "object"
  ) {
    const message =
      "message" in data.error && typeof data.error.message === "string"
        ? data.error.message
        : "Unknown API error";
    const code =
      "code" in data.error && typeof data.error.code === "string"
        ? data.error.code
        : null;
    return { message, code: code as ErrorCode | null };
  }
  return { message: "Unknown API error", code: null };
}

export class APIError<TData> extends Error {
  public readonly status: number;
  public readonly data: unknown;
  public readonly code: ErrorCode | null;

  constructor(options: { status: number; data: TData }) {
    const infos = extractErrorInfos(options.data);
    super(infos.message);
    this.name = "APIError";
    this.status = options.status;
    this.data = options.data;
    this.code = infos.code;
  }
}

/**
 * Fetch the internal API.
 */
export async function fetchApi<TData, TErrorData = unknown>(
  pathname: string,
  options: { token?: string | undefined; data: unknown },
): Promise<TData> {
  const url = new URL(pathname, config.api.baseUrl);
  const headers = new Headers();
  headers.append("Content-Type", "application/json");
  if (options.token) {
    headers.append("Authorization", `Bearer ${options.token}`);
  }
  const result = await fetch(url.toString(), {
    method: "POST",
    headers,
    body: JSON.stringify(options.data),
  });
  const json = await result.json();
  if (!result.ok) {
    throw new APIError<TErrorData>({
      status: result.status,
      data: json,
    });
  }
  return json;
}
