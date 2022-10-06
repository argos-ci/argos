// Welcome to Argos WebdriverIO example

// Here is the minimal example of how to take a screenshot
// with WebdriverIO.

const screenshots = `./screenshots`;

describe("Screenshot homepage", () => {
  it("should take a screenshot", async () => {
    await browser.url(`https://webdriver.io/`);
    await browser.saveScreenshot(`${screenshots}/homepage.png`);
  });
});
