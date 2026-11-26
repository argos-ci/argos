import { FactoryGirl } from "factory-girl-ts";

/**
 * Restart the counters factories number what they create with (slugs, commit
 * SHAs), as a fresh worker would. It imports nothing that reads the
 * configuration, so the integration setup file can call it.
 */
export function resetFactorySequences(): void {
  FactoryGirl.cleanUp();
}
