/**
 * Returns the {@link init} function.
 * @module init
 */

'use strict';

var Promise = require('bluebird'),
  Board = require('johnny-five').Board,
  EventEmitter = require('events').EventEmitter,
  _ = require('lodash-node');

var Sketch = function Sketch(procedure, opts) {
  if (!(this instanceof Sketch)) {
    return new Sketch(opts);
  }

  _.defaults(opts, {
    autoinit: true,
    board: {},
    inject: {},
    name: _.uniqueId('sketch')
  });

  _.extend(this, {
    _procedure: procedure,
    _opts: opts,
    _inject: opts.inject,
    _board: null,
    _ready: null,
    _running: null
  });

  if (opts.autoinit) {
    this._ready = this.init(opts.board)
      .bind(this);
  }

  this.on('error', function (err) {
    this.error(err);
    process.kill('SIGINT');
  });
};

Sketch.prototype = _.create(EventEmitter.prototype, {

  /**
   * Injects the contents of `obj` into the REPL.  Will wait until the Board is ready.
   * @param {Object} [obj] Object of stuff, accessible by key name
   * @param {Function} [callback] Optional callback
   * @returns {Promise.<Board>}
   */
  inject: function inject(obj, callback) {
    return this._ready.then(function (board) {
      board.repl.inject(_.extend({
        run: this.run.bind(this),
        stop: this.stop.bind(this)
      }, obj));
    })
      .catch(function (err) {
        this.error(err);
      })
      .nodeify(callback);
  },
  /**
   * Initializes a Board and returns a Promise.  When the Board is ready, the Promise is resolved
   * with the Board instance.
   * @param {*} [opts] Parameters to pass to the Board constructor.
   * @param {Function} [callback] Optional callback
   * @returns {Promise.<Board>}
   */
  _init: function _init(opts, callback) {
    return new Promise(function (resolve, reject) {
      new Board(opts).on('ready', function () {
        resolve(this);
      }).on('error', function (err) {
        reject(err);
      });
    })
      .bind(this)
      .then(function (board) {
        this._board = board;
        this.error = board.error.bind(board, this.name);
        this.warn = board.warn.bind(board, this.name);
        this.fail = board.fail.bind(board, this.name);
        this.info = board.info.bind(board, this.name);
        this.emit('ready', board);
        return board;
      })
      .nodeify(callback);
  },
  /**
   * Initializes a Board and returns a Promise.  Called by constructor.  If Board
   * is already ready, then just return it (wrapped in a Promise).
   * @param {*} [opts] Parameters to pass to the Board constructor.
   * @param {Function} [callback] Optional callback
   * @returns {Promise.<Board>}
   */
  init: function init(opts, callback) {
    if (this._board) {
      return Promise.resolve(this._board)
        .nodeify(callback);
    }
    return this._init(opts, callback);
  },
  /**
   * Attempts to stop a running procedure.  Returns a resolved promise if successful;
   * otherwise returns a rejected promise.
   * @param {Function} [callback] Optional callback
   * @returns {Promise}
   */
  stop: function stop(callback) {
    var running = this._running,
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
    return promise.nodeify(callback);
  },
  /**
   * Runs procedure.
   * @param callback
   * @returns {*}
   */
  run: function run(callback) {
    this._running = this._ready.then(function (board) {
      return this._procedure.call(board)
        .thenResolve(board);
    })
      .then(function (board) {
        this.emit('done', board);
      }, function (err) {
        this.error('Sketch', err);
      });
    return this._running.nodeify(callback);
  }
});

module.exports = Sketch;
