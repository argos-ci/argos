export async function goto({ page, link }) {
  await page.goto(link, { waitUntil: "networkidle" });
}
