const appUrl = "https://app.argos-ci.com";
const path = "/my-organization/my-repository/builds/-1";

describe("Argos build url", () => {
  it("should redirect to Argos app", () => {
    cy.request({
      url: path,
      followRedirect: false,
    }).then((resp) => {
      expect(resp.status).to.eq(307);
      expect(resp.redirectedToUrl).to.eq(`${appUrl}${path}`);
    });
  });
});
