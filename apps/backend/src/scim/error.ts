import { HTTPError } from "@/util/error";

/**
 * The `scimType` detail error keywords of RFC 7644 §3.12.
 */
type ScimErrorType =
  | "invalidFilter"
  | "invalidSyntax"
  | "invalidPath"
  | "invalidValue"
  | "noTarget"
  | "mutability"
  | "uniqueness";

export class ScimError extends HTTPError {
  public scimType: ScimErrorType | undefined;

  constructor(statusCode: number, detail: string, scimType?: ScimErrorType) {
    super(statusCode, detail);
    this.scimType = scimType;
  }
}

export function invalidValue(detail: string) {
  return new ScimError(400, detail, "invalidValue");
}
