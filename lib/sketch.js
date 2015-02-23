/**
 * Returns the {@link init} function.
 * @module sketch
 */

'use strict';

var Promise = require('bluebird'),
  five = require('johnny-five'),
  events = require('events'),
  util = require('util'),
  exceptionFormatter = require('exception-formatter'),
  _ = require('./lodash-mixins');

var EventEmitter = events.EventEmitter,
  Board = five.Board,
  format = util.format,

/**
 * Sketch Options
 * @typedef {Object} SketchOptions
 * @property {boolean} [autoconnect=true] Automatically connect to the Board
 * @property {boolean} [autostart=false] Automatically execute Sketch
 * @property {string} [id] Identifier of Sketch
 * @property {number} [debug=false] Debug mode
 */

  /**
   * Sets defaults
   * @abstract
   * @param {SketchOptions} [opts] Options
   * @param {Log} [log] Logger instance; if omitted, one will be created
   * @returns {Sketch}
   * @constructor
   * @class Represents a Sketch.
   */
  Sketch = function Sketch(opts, log) {
    var die;

    if (!(this instanceof Sketch)) {
      //noinspection TailRecursionJS
      return new Sketch(opts);
    }

    die = function die (err) {
      this.error(exceptionFormatter(err));
      process.kill('SIGINT');
    };

    opts = opts || {};

    _.defaults(opts, {
      beaglebone: false,
      autoconnect: true,
      autostart: true,
      board: {
        debug: !!opts.debug
      },
      debug: opts.debug,
      id: _.uniqueId('sketch')
    });

    if (opts.beaglebone) {
      opts.board.io = new (require('beaglebone-io'))();
      if (opts.debug) {
        process.env.DEBUG = process.env.DEBUG || 'bone';
      }
    }

    log = _.bindAll(log || new (require('log'))());

    _.mixin(this, {
      debug: log.debug,
      warning: log.warning,
      error: log.error,
      info: log.info
    });

    this.debug('Initialized options');

    _.extend(this, {
      /**
       * Name of this Sketch.
       * @type {string}
       */
      id: opts.id,

      /**
       * Raw options object.
       * @type {SketchOptions}
       */
      _opts: opts,

      /**
       * Board instance
       * @type {?Board}
       */
      _board: null,

      /**
       * Promises related to state of execution.
       * @property {?Promise.<Board>} connected Resolved when Board is
       *   connected.
       * @property {?Promise.<Object>} setup Resolved when setup() function is
       *   complete.
       * @property {?Promise.<*>} running Pending while running (during {@link
        *   run} function).
       */
      _state: {
        connected: null,
        running: null,
        setup: null
      }

    });

    this.on('error', die);
    process.on('uncaughtException', die);

    this.on('done', function (value) {
      this.info('Done.');
      if (!_.isUndefined(value)) {
        this.info('Results:\n' + value);
      }
    });

    if (opts.autoconnect) {
      this._state.connected = Promise.try(function () {
        return Promise.bind(this)
          .then(function () {
            return this.connect(opts.board);
          })
          .then(function () {
            return this._state.setup;
          })
          .then(function () {
            if (opts.autostart) {
              return this.start();
            }
          });
      }.bind(this));
    }

    this.debug('Instantiated Sketch "%s"', this.id);
  };

Sketch.prototype = _.create(EventEmitter.prototype, {
  /**
   * Override this function to be run after connection.  Return (or resolve) an
   * object to have the members attach to this instance, as well as the REPL.
   * @abstract
   * @param {Board} board This function will be called with a Board instance.
   * @returns {Promise.<Object>|Object|*}
   */
  setup: function setup(board) {
  },

  /**
   * Override this function to be run after setup.
   * @abstract
   * @param {Board} board This function will be called with a Board instance.
   * @returns {Promise|*}
   */
  run: function run(board) {
    this.warn('Override `procedure()` in your subclass.');
  },

  /**
   * Injects the contents of `obj` into the REPL.  Will wait until the Board is
   * connected.
   * @param {Object} [obj] Object of stuff, accessible by key name
   * @param {Function} [callback] Optional callback
   * @returns {Promise.<Board>}
   */
  inject: function inject(obj, callback) {
    return this._state.setup.then(function () {
      return this._board.repl.inject(_.extend({
        start: this.start.bind(this),
        stop: this.stop.bind(this)
      }, obj));
    })
      .nodeify(callback);
  },

  /**
   * Initializes a Board and returns a Promise.  When the Board is connected,
   * the Promise is resolved with the Board instance.
   * @param {*} [opts] Parameters to pass to the Board constructor.
   * @private
   * @returns {Promise.<Board>}
   */
  _connect: function _connect(opts) {
    return (this._state.setup = new Promise(function (resolve, reject) {
      new Board(opts).on('ready', function () {
        resolve(this);
      }).on('error', function (err) {
        reject(err);
      });
    })
      .bind(this)
      .tap(function (board) {
        this._board = board;
        this.info('Setting up...');
      }))
      .then(this.setup);
  },
  /**
   * Instantiates a Board and returns a Promise.  Called by constructor.  If
   * Board is alconnected connected, then just return it (wrapped in a
   * Promise).
   * @param {*} [opts] Parameters to pass to the Board constructor.
   * @param {Function} [callback] Optional callback
   * @returns {Promise.<Board>}
   */
  connect: function connect(opts, callback) {
    return Promise.resolve(function () {
      if (this._board) {
        return this._board;
      }
      return this._connect(opts)
        .then(function (inject) {
          _.each(_.keys(inject), function(key) {
            if (_.isDefined(this[key])) {
              throw new Error(format('"%s" is reserved and cannot be injected', key));
            }
          }, this);
          _.extend(this, inject);
          return this.inject(inject);
        })
        .tap(function (board) {
          this.emit('connected', board);
          this.info('Setup complete.');
        });
    }.call(this))
      .catch(function (err) {
        this.emit('error', err);
      })
      .nodeify(callback);
  },

  /**
   * Attempts to stop a running procedure.  Returns a resolved promise if
   * successful; otherwise returns a rejected promise.
   * @param {Function} [callback] Optional callback
   * @returns {Promise}
   */
  stop: function stop(callback) {
    var running = this._state.running,
      promise;
    if (running && running.isPending()) {
      if (running.isCancellable()) {
        running.cancel('Stopped!');
        promise = Promise.resolve();
      } else {
        promise = Promise.reject('Procedure is not cancellable!');
      }
    } else {
      promise = Promise.reject('Procedure is not running!');
    }
    return promise.catch(Promise.CancellationError, function (e) {
      this.info(e);
    })
      .nodeify(callback);
  },

  /**
   * Runs procedure.
   * @param [callback]
   * @returns {*}
   */
  start: function start(callback) {
    this._state.running = this._state.setup.then(function (board) {
      this.info('Running...');
      return this.run(board);
    })
      .then(function (value) {
        this.emit('done', value);
      }, function (err) {
        this.emit('error', err);
      });
    return this._state.running.nodeify(callback);
  }
});

/**
 * Convenience function to create an anonymous Sketch pseudosubclass.
 * @param {Object} proto Prototype object.  At minimum should contain a `run`
 *   function.
 * @param {Object} [opts] Options
 * @param {Object|*} [opts.board] Options for Board class
 * @param {boolean} [opts.autoconnect=true] Whether or not to connect to a
 *   Board automatically
 * @param {string} [opts.name] Name for this Sketch.  Uses a unique ID by
 *   default.
 * @param {Log} [log] Log object.
 * @alias module:sketch
 * @returns {Sketch}
 */
var sketch = function sketch(proto, opts, log) {
  var instance = _.create(Sketch.prototype, proto, log);
  Sketch.call(instance, opts);
  return instance;
};

sketch.Sketch = Sketch;

module.exports = sketch;
