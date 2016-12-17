/* global browser */
const assert = require('assert');

describe('webdriver.io page', () => {
  it('should have the right title - the fancy generator way', () => {
    browser.url('http://www.google.com');
    const title = browser.getTitle();
    assert.strictEqual(title, 'Google');
  });
});
