import { UnretryableError } from "../job-core";

export class AutomationActionFailureError extends UnretryableError {
  constructor(message: string) {
    super(message);
    this.name = "AutomationActionFailureError";
  }
}
