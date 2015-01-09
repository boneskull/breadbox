'use strict';

/**
 * This is a thermometer.  Use the same setup as in example 15, but also add a TMP-36 unit connected to pin A0, as
 * done in example 7.
 */

var five = require('johnny-five'),
  format = require('util').format,
  Board = five.Board,
  LCD = five.LCD,
  Temperature = five.Temperature;

new Board().on('ready', function () {
  var lcd = new LCD({
      pins: [12, 11, 5, 4, 3, 2]
    }),

    tmp = new Temperature({
      pin: 'A0',
      freq: 1000, // updates every 1s
      controller: 'tmp36'
    }),

    /**
     * Rounds a numeric value to 2 decimal places.
     */
    round = function round(value) {
      return Math.floor(value * 100) / 100;
    };

  lcd.on('ready', function () {
    var lastF;

    // create a "degree" character for the LCD to display.
    lcd.createChar('deg', [12, 18, 18, 18, 12, 0, 0]);
    lcd.print('Ready!');

    // when the temperature changes, display F value on line 1 and C value on line 2.
    tmp.on('change', function () {
      var f = round(tmp.fahrenheit);
      if (f !== lastF) {
        lastF = f;
        lcd.clear()
          .cursor(0, 0)
          .print(format('%d :deg:F', f))
          .cursor(1, 0)
          .print(format('%d :deg:C', round(tmp.celsius)));
      }
    });

  });
  this.repl.inject({
    lcd: lcd
  });
});
