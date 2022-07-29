// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

function injectStyles(document) {
  const cssText = `
  /* Hide scrollbars */
  ::-webkit-scrollbar {
    display: none !important;
  }

  /* Generic hide */
  [data-test-hidden] {
    opacity: 0 !important;
  }

  /* Generic hide */
  [data-test-no-radius] {
    border-radius: 0 !important;
  }
  `;
  const css = document.createElement("style");
  css.type = "text/css";
  css.textContent = cssText;
  document.body.appendChild(css);
}

/* Cypress command example */
Cypress.Commands.add("argosScreenshot", (name, options = {}) => {
  cy.document().then((doc) => injectStyles(doc));
  cy.document().its("fonts.status").should("equal", "loaded");
  cy.screenshot(name, options);
});
