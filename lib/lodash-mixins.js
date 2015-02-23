'use strict';

var _ = require('lodash-node');

_.mixin({
  /**
   * @this lodash
   * @returns {boolean}
   */
  isDefined: function isDefined() {
    return !this.isUndefined.apply(this, arguments);
  }
}, {
  chain: false
});

_.mixin({
  /**
   * Fills an array or object full of the same value
   * @this lodash
   */
  fill: function fill(array, value) {
    var valueIsDefined = this.isDefined(value),
      iterator = function iterator(v, k) {
        array[k] = value;
      };
    if (_.isNumber(array)) {
      array = new Array(array);
    }
    else if (_.isArray(array) && valueIsDefined) {
      return this.map(array, iterator);
    }
    else if (_.isObject(array) && valueIsDefined) {
      return this.mapValues(array, iterator);
    }
    return this.clone(array);
  }
});

module.exports = _;
