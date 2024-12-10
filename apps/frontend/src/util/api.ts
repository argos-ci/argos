import { config } from "@/config";

function extractErrorMessageFromData(data: unknown) {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    data.error &&
    typeof data.error === "object" &&
    "message" in data.error &&
    typeof data.error.message === "string"
  ) {
    return data.error.message;
  }
  return "Unknown API error";
}

export class APIError<TData> extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor(options: { status: number; data: TData }) {
    super(extractErrorMessageFromData(options.data));
    this.name = "APIError";
    this.status = options.status;
    this.data = options.data;
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
