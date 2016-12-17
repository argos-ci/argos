happo.define('foo', function() {
  var elem = document.createElement('div');
  elem.setAttribute('class', 'foo');
  elem.innerHTML = 'Texts insides';
  document.body.appendChild(elem);
});

happo.define('hallooo', function() {
  var elem = document.createElement('span');
  elem.innerHTML = 'Hioyi!<br>' + Math.random() + 'Hello';
  document.body.appendChild(elem);
}, { viewports: ['mobile', 'desktop'] });

happo.define('hallooo + something else', function() {
  var elem = document.createElement('span');
  elem.innerHTML = 'Hioyi!<br>Hello';
  document.body.appendChild(elem);
}, { viewports: ['mobile', 'desktop'] });

happo.define('bar', function() {
  var elem = document.createElement('span');
  elem.innerHTML = 'go bars!<br>bars';
  document.body.appendChild(elem);
});
