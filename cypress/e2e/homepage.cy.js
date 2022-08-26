describe("Homepage", () => {
  before(() => {
    cy.login("jsfez-access-token");
    cy.visit("https://app.argos-ci.dev:4002");
  });

  it("should display not logged message", () => {
    expect(true).to.equal(true);
  });
});
