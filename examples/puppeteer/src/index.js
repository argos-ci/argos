import { argosScreenshot } from "@argos-ci/puppeteer";
import puppeteer from "puppeteer";

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("http://example.com");
  await argosScreenshot(page, "example");
  await browser.close();
})();
