const screenshotFolder = "./screenshots";

export async function goto({ page, link }) {
  await page.goto(link, { waitUntil: "networkidle" });
}

export async function argosScreenshot({ page, name }) {
  await page.screenshot({
    path: `${screenshotFolder}/${name}.png`,
    fullPage: true,
  });
}
