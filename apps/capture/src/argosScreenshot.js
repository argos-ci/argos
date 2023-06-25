// @ts-nocheck

const GLOBAL_STYLES = `
  /* Hide carets */
  * { caret-color: transparent !important; }

  /* Hide scrollbars */
  ::-webkit-scrollbar {
    display: none !important;
  }

  /* Generic hide */
  [data-visual-test="transparent"] {
    color: transparent !important;
    font-family: monospace !important;
    opacity: 0 !important;
  }

  [data-visual-test="removed"] {
    display: none !important;
  }
`;

/**
 * Check if there is `[aria-busy="true"]` element on the page.
 */
async function ensureNoBusy() {
  const checkIsVisible = (element) =>
    Boolean(
      element.offsetWidth ||
        element.offsetHeight ||
        element.getClientRects().length
    );

  return Array.from(document.querySelectorAll('[aria-busy="true"]')).every(
    (element) => !checkIsVisible(element)
  );
}

/**
 * Wait for all fonts to be loaded.
 */
function waitForFonts() {
  return document.fonts.status === "loaded";
}

/**
 * Wait for all images to be loaded.
 */
async function waitForImages() {
  const allImages = Array.from(document.images);
  allImages.forEach((img) => {
    img.loading = "eager";
    img.decoding = "sync";
  });
  return allImages.every((img) => img.complete && img.naturalWidth > 0);
}

export async function argosScreenshot(page, { element = page } = {}) {
  if (!page) throw new Error("A Puppeteer `page` object is required.");

  const [resolvedElement] = await Promise.all([
    (async () => {
      if (typeof element === "string") {
        await page.waitForSelector(element);
        return page.$(element);
      }
      return element;
    })(),
    page.addStyleTag({ content: GLOBAL_STYLES }),
    page.waitForFunction(ensureNoBusy),
    page.waitForFunction(waitForFonts),
    page.waitForFunction(waitForImages),
  ]);

  return resolvedElement.screenshot({ type: "png", fullPage: true });
}
