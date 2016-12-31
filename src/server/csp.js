// @flow weak

const sources = {
  'frame-ancestors': "'none'", // Disallow embedding of content CSP 2
  'default-src': '* data: blob:',
  'script-src': "* 'unsafe-inline' 'unsafe-eval'",
  'style-src': "* 'unsafe-inline'",
};

const csp = Object
  .keys(sources)
  .reduce((reduction, key) => {
    return `${reduction} ${key} ${sources[key]};`;
  }, '');

// Content Security Policy
export default function (req, res, next) {
  res.setHeader('content-security-policy', csp);

  // Disallow embedded iframe
  res.setHeader('x-frame-options', 'deny');

  // The browser only use the content type
  res.setHeader('x-content-type-options', 'nosniff');
  next();
}
