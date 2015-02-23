'use strict';

var five = require('johnny-five'),
  Promise = require('bluebird'),
  sketch = require('../../../lib/sketch');

var Piezo = five.Piezo,
  Pir = five.Pior,

  FREQ = 12000,

  DURATION = 500;

module.exports = {
  setup: function setup() {
    var buzzer = new Piezo(9),
      motion = new Pir({
        pin: 7});

    return {
      buzzer: buzzer,
      motion: motion
    };
  },
  _buzz: function _buzz() {
    return Promise.resolve(this.buzzer.frequency(FREQ, DURATION))
      .cancellable()
      .delay(DURATION + (DURATION / 2))
      .bind(this)
      .then(this._buzz)
      .catch(Promise.CancellationError);
  },
  _motionStartHandler: function _motionStartHandler() {
    this.info('Motion detected');
    this._buzzing = this._buzz();
    setTimeout(function() {
      this.motion.once('motionend', this._motionEndHandler.bind(this));
    }.bind(this), 4000);
  },
  _motionEndHandler: function _motionEndHandler() {
    this.info('Motion ceased');
    this._buzzing.cancel();
    setTimeout(function() {
      this.motion.once('motionstart', this._motionStartHandler.bind(this));
    }.bind(this), 4000);
  },
  run: function run() {
    this.motion.once('calibrated', function () {
      this.info('Calibrated');
    }.bind(this))
      .once('motionstart', this._motionStartHandler.bind(this));
    return new Promise(function() {}).cancellable()
      .bind(this)
      .catch(Promise.CancellationError, function() {
        if (this._buzzing && this._buzzing.isPending()) {
          this._buzzing.cancel();
        }
      });
  }
};
