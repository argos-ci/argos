/* eslint-disable import/no-extraneous-dependencies */
import nock from "nock";

export const TEST_GITHUB_USER_ACCESS_TOKEN =
  process.env.TEST_GITHUB_USER_ACCESS_TOKEN || "TEST_GITHUB_ACCESS_TOKEN";

export function usePlayback({ fixtures, name, mode }) {
  let nockDoneSaved;

  global.beforeAll((done) => {
    nock.back.fixtures = fixtures;
    nock.back.setMode(mode);
    // eslint-disable-next-line prefer-arrow-callback
    nock.back(name, function teardown(nockDone) {
      nock.enableNetConnect();
      // eslint-disable-next-line no-console
      console.log(`🎙  playback recording: ${Boolean(this.isRecording)}`);
      nockDoneSaved = nockDone;
      done();
    });
  });

  global.afterAll(() => {
    nockDoneSaved();
  });
}
