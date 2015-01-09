'use strict';

var sketch = require('./sketch');

module.exports = function bootstrap(runner, implementation) {
  if (require.main === runner) {
    sketch(implementation).run();
  }
  return implementation;
};
