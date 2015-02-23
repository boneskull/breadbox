'use strict';

var five = require('johnny-five'),
  BeagleBone = require('beaglebone-io');

module.exports = {
  options: {
    board: {
      io: new BeagleBone()
    }
  },
  setup: function setup() {
    return {
      ir: new five.Sensor({
        pin: 'P9_14',
        freq: 10
      })
    };
  },
  run: function fun() {
    this.ir.on('data', function () {
      console.log(this.value);
    });
  }
};

/*
 #!/usr/bin/env node
'use strict';

process.env.DEBUG = 'bone';

var b = require('../../../node_modules/beaglebone-io/node_modules/octalbonescript');

b.pinMode('P9_12', b.INPUT, function () {
  b.attachInterrupt('P9_12', function(value) {
    console.log(value);
  }, b.CHANGE);
});
*/
