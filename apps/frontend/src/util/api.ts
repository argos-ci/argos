import config from "@/config";

export class APIError<TData> extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor(message: string, options: { status: number; data: TData }) {
    super(message);
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
  const apiBaseUrl = config.get("api.baseUrl");
  if (!apiBaseUrl) {
    throw new Error("api.baseUrl is not set");
  }
  const url = new URL(pathname, apiBaseUrl);
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
    throw new APIError<TErrorData>("API request failed", {
      status: result.status,
      data: json,
    });
  }
  return json;
}
