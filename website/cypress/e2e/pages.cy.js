const pages = {
  homepage: "/",
  terms: "/terms",
  privacy: "/privacy",
  security: "/security",
};

Object.keys(pages).forEach((pageName) => {
  describe(`Page: ${pages[pageName]}`, () => {
    beforeEach(() => {
      cy.visit(pages[pageName]);
    });

    it(`should screenshot`, () => {
      cy.argosScreenshot(pageName);
    });

    it(`should check url`, () => {
      cy.url().should("match", /^http:\/\/localhost/);
    });
  });
});
