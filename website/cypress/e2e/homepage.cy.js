describe("Homepage", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("screenshot", () => {
    cy.argosScreenshot("homepage");
  });
});
