#!/usr/bin/env node

'use strict';

var path = require('path'),
  yargs = require('yargs'),
  fs = require('fs'),
  _ = require('lodash-node'),
  Log = require('log'),
  util = require('util'),
  sketch = require(path.join(__dirname, '..', 'lib', 'sketch'));

var format = util.format,
  log,
  run = function run(argv) {
    var script = require(_.first(argv._));
    console.log(script);
  };

run(yargs.usage('Usage: $0 [--beaglebone] [--debug] <path-to-sketch.js>')
  .demand(1)
  .boolean('beaglebone')
  .alias('beaglebone', 'b')
  .describe('beaglebone', 'Use BeagleBone')
  .boolean('debug')
  .describe('debug', 'Enable debug mode')
  .boolean('verbose')
  .describe('verbose', 'Enable verbose mode')
  .alias('verbose', 'v')
  .check(function (argv) {
    var logLevel, filepath;
    if (argv.debug) {
      logLevel = 'debug';
    } else if (argv.verbose) {
      logLevel = 'info';
    } else {
      logLevel = 'error';
    }
    log = new Log(logLevel);
    filepath = _.first(argv._);
    if (!fs.existsSync(filepath)) {
      throw new Error(format('Could not find module "%s"', filepath));
    }
    log.info('Found module "%s"', filepath);
  })
  .argv);
