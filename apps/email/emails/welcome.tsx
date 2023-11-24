import * as React from "react";
import { WelcomeEmail } from "../../backend/src/email/welcome";

export function ArgosWelcomeExample() {
  return <WelcomeEmail baseUrl="https://app.argos-ci.dev:4002" />;
}

export default ArgosWelcomeExample;
