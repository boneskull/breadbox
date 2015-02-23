'use strict';

var ShiftRegister = require('johnny-five').ShiftRegister,
  _ = require('lodash-node'),
  Promise = require('bluebird'),
  sketch = require('../../lib/sketch');

/**
 * How long to pause between updates (ms)
 * @type {number}
 */
var DELAY = 1000,

  /**
   * Object mapping of LED segments to their numeric equivalents.
   * @type {Object.<string,number>}
   */
  segments = _.mapValues(_.object(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'], _.range(0, 8)),
    function (seg) {
      return 1 << seg;
    }),

// quick access to segments
  A = segments.a,
  B = segments.b,
  C = segments.c,
  D = segments.d,
  E = segments.e,
  F = segments.f,
  G = segments.g,
  DP = segments.dp,

  /**
   * Numeric values for each digit starting at 0 and including DP (decimal point).
   * Each segment is a number, and using bitwise OR will combine the segments.
   * @type {Object.<string,number>}
   */
  digits = _.extend({dp: DP}, [
    F | E | D | C | B | A,
    C | B,
    G | E | D | A | B,
    G | D | C | B | A,
    G | F | C | B,
    G | F | D | C | A,
    G | F | E | D | C | A,
    C | B | A,
    G | F | E | D | C | B | A,
    G | F | D | C | B | A
  ]);

var sevenSegment = sketch({
  setup: function setup() {
    /**
     * This is a 74HC595 shift register
     * @type {ShiftRegister}
     */
    var ic = new ShiftRegister({
        pins: {
          data: 2,
          clock: 3,
          latch: 4
        }
      }),

      /**
       * Shortcut to clear the LED.
       * @type {function(this:ShiftRegister):ShiftRegister}
       */
      clear = ic.send.bind(ic, 0);

    return {
      ic: ic,
      clear: clear,
      digits: digits,
      segments: segments
    };
  },
  run: function run() {
    return Promise.each(_.values(this.digits), function (digit) {
      return Promise.delay(this.ic.send(digit), DELAY).cancellable();
    }, this)
      .bind(this)
      .then(function() {
        this.clear();
      });
  }
}, {
  autoconnect: require.main === module
});

module.exports = sevenSegment;
