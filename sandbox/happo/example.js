/* global happo */

happo.define('foo', () => {
  const elem = document.createElement('div');
  elem.setAttribute('class', 'foo');
  elem.innerHTML = 'Texts insides';
  document.body.appendChild(elem);
});

happo.define('hallooo', () => {
  const elem = document.createElement('span');
  elem.innerHTML = `Hioyi!<br>${Math.random()}Hello`;
  document.body.appendChild(elem);
}, { viewports: ['mobile', 'desktop'] });

happo.define('hallooo + something else', () => {
  const elem = document.createElement('span');
  elem.innerHTML = 'Hioyi!<br>Hello';
  document.body.appendChild(elem);
}, { viewports: ['mobile', 'desktop'] });

happo.define('bar', () => {
  const elem = document.createElement('span');
  elem.innerHTML = 'go bars!<br>bars';
  document.body.appendChild(elem);
});
