'use strict';

var ShiftRegister = require('johnny-five').ShiftRegister,
  _ = require('lodash-node'),
  Promise = require('bluebird'),
  Button = require('johnny-five').Button,
  Random = require('random-js'),
  sketch = require('../../../lib/sketch');

var SEGMENTS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  makeSegments = function makeSegments() {
    return _.mapValues(_.object(SEGMENTS,
        _.range(SEGMENTS.length)),
      function (seg) {
        return 1 << seg;
      });
  },

  /**
   * Object mapping of LED segments to their numeric equivalents.
   * @type {Object.<string,number>}
   */
  segments1 = makeSegments(),
  segments2 = makeSegments(),

// quick access to segments
  A1 = segments1.a,
  B1 = segments1.b,
  C1 = segments1.c,
  D1 = segments1.d,
  E1 = segments1.e,
  G1 = segments1.g,

  A2 = segments2.a,
  B2 = segments2.b,
  C2 = segments2.c,
  D2 = segments2.d,
  E2 = segments2.e,
  F2 = segments2.f,
  G2 = segments2.g,

  digits = [
    [C2 | B2, 0],
    [G2 | E2 | D2 | A2 | B2, 0],
    [G2 | D2 | C2 | B2 | A2, 0],
    [G2 | F2 | C2 | B2, 0],
    [G2 | F2 | D2 | C2 | A2, 0],
    [G2 | F2 | E2 | D2 | C2 | A2, 0],
    [C2 | B2 | A2, 0],
    [G2 | F2 | E2 | D2 | C2 | B2 | A2, 0],
    [G2 | F2 | D2 | C2 | B2 | A2, 0],
    [F2 | E2 | D2 | C2 | B2 | A2, C1 | B1],
    [C2 | B2, C1 | B1],
    [G2 | E2 | D2 | A2 | B2, C1 | B1],
    [G2 | D2 | C2 | B2 | A2, C1 | B1],
    [G2 | F2 | C2 | B2, C1 | B1],
    [G2 | F2 | D2 | C2 | A2, C1 | B1],
    [G2 | F2 | E2 | D2 | C2 | A2, C1 | B1],
    [C2 | B2 | A2, C1 | B1],
    [G2 | F2 | E2 | D2 | C2 | B2 | A2, C1 | B1],
    [F2 | E2 | D2 | C2 | B2 | A2, G1 | E1 | D1 | A1 | B1]
  ];

function noop() {
}

var sevenSegment = sketch({
  setup: function setup() {
    /**
     * This is a 74HC595 shift register
     * @type {ShiftRegister}
     */
    var ic = new ShiftRegister({
        pins: {
          data: 5,
          clock: 6,
          latch: 7
        }
      }),
      btn = new Button({
        pin: 8,
        invert: true
      }),

      /**
       * Shortcut to clear the LED.
       * @type {function(this:ShiftRegister):ShiftRegister}
       */
      clear = ic.send.bind(ic, 0, 0),

      engine = Random.engines.mt19937().autoSeed(),

      dieRoll = Random.integer(1, 20);

    return {
      ic: ic,
      clear: clear,
      btn: btn,
      digits: digits,
      segments1: segments1,
      segments2: segments2,
      randomDigit: function randomDigit() {
        return dieRoll(engine);
      },
      randomSegment: function (second) {
        return Random.pick(engine, _.values(second ? segments2 : segments1));
      }
    };
  },
  run: function run() {
    this.clear();
    this.btn.on('press', function () {
      var delays = _.fill(10, 16)
        .concat(_.fill(8, 32))
        .concat(_.fill(6, 64))
        .concat(_.fill(4, 128))
        .concat(_.fill(2, 256))
        .concat(512);
      this.clear();

      Promise.bind(this)
        .return(delays)
        .each(function (delay) {
          return Promise.delay(this.ic.send.apply(this.ic,
            digits[this.randomDigit()]), delay);
        });
    }.bind(this));
    return new Promise(noop, noop);
  }
}, {
  autoconnect: require.main === module,
  beaglebone: true
});

module.exports = sevenSegment;
