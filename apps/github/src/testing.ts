/* eslint-disable import/no-extraneous-dependencies */
import nock from "nock";
import { afterAll, beforeAll } from "vitest";

export const TEST_GITHUB_USER_ACCESS_TOKEN =
  process.env["TEST_GITHUB_USER_ACCESS_TOKEN"] || "TEST_GITHUB_ACCESS_TOKEN";

export function usePlayback({
  fixtures,
  name,
  mode,
}: {
  fixtures: string;
  name: string;
  mode: "record" | "dryrun";
}) {
  let nockDoneSaved: () => void;

  beforeAll(() => {
    return new Promise((resolve) => {
      nock.back.fixtures = fixtures;
      nock.back.setMode(mode);
      // eslint-disable-next-line prefer-arrow-callback
      nock.back(name, function teardown(nockDone) {
        nock.enableNetConnect();
        // eslint-disable-next-line no-console
        // @ts-ignore
        console.log(`🎙  playback recording: ${Boolean(this.isRecording)}`);
        nockDoneSaved = nockDone;
        resolve();
      });
    });
  });

  afterAll(() => {
    nockDoneSaved();
  });
}
