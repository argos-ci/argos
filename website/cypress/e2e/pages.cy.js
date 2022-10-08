const pages = {
  homepage: "/",
  terms: "/terms",
  privacy: "/privacy",
  security: "/security",
};

const viewportPresets = ["macbook-16", "ipad-2", "iphone-8"];

function injectStyles(document, styles) {
  const css = document.createElement("style");
  css.type = "text/css";
  css.textContent = styles;
  document.body.appendChild(css);
}

viewportPresets.forEach((viewportPreset) => {
  describe(viewportPreset, () => {
    beforeEach(() => {
      cy.viewport(viewportPreset);
    });
    Object.keys(pages).forEach((pageName) => {
      const name = `${viewportPreset}/${pageName}`;

      it(pageName, () => {
        cy.visit(pages[pageName]);
        cy.wait(200);
        cy.document().then((document) => {
          injectStyles(
            document,
            `
            /* No sticky header */
            nav {
              position: initial !important;
            }
          `
          );
        });
        cy.argosScreenshot(name);
      });
    });
  });
});
