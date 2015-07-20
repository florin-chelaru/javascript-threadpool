/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 11:06 AM
 */

goog.provide('parallel.ThreadPool');

goog.require('parallel.ThreadProxy');

var PARALLEL_BASE_PATH = PARALLEL_BASE_PATH || '/';

/**
 * @param {number} maxThreads
 * @constructor
 */
parallel.ThreadPool = function(maxThreads) {

  if (maxThreads <= 0) {
    throw Error('Invalid ThreadPool parameter maxThreads = ' + maxThreads);
  }

  var self = this;

  /**
   * @type {number}
   * @private
   */
  this._maxThreads = maxThreads;

  /**
   * @type {Array.<parallel.ThreadProxy>}
   * @private
   */
  this._threads = [];
  this._threads.push(new parallel.ThreadProxy(0));
  this._threads[0].start();
};

/**
 * @param func
 * @param args
 * @param callback
 */
parallel.ThreadPool.prototype.queue = function(func, args, callback) {
  var thread = this.getAvailableThread();
  thread.queue(func, args, callback);
};

/**
 * @returns {parallel.ThreadProxy}
 */
parallel.ThreadPool.prototype.getAvailableThread = function() {
  var thread = null;
  for (var i = 0; i < this._threads.length; ++i) {
    if (this._threads[i].isIdle()) {
      if (this._threads[i].isStarted()) {
        return this._threads[i];
      }
      thread = this._threads[i];
    }
  }

  if (thread !== null) { return thread; }

  if (this._threads.length < this._maxThreads) {
    thread = new parallel.ThreadProxy(this._threads.length);
    this._threads.push(thread);
    thread.start();
    return thread;
  }

  var index = Math.floor(Math.random() * this._maxThreads);
  return this._threads[index];
};

/**
 * @param {MessageEvent} e
 * @private
 */
parallel.ThreadPool.prototype._onMessage = function(e) {
  if (e.data.id in this._callbacks) {
    var callback = this._callbacks[e.data.id];
    delete this._callbacks[e.data.id];
    callback(e.data);
  }
};

parallel.ThreadPool.prototype._threadStart = function() {
  var worker = new Worker(PARALLEL_BASE_PATH + 'thread.js');

  this._workers[i].onmessage = function(e) {
    self._onMessage(e);
  };
};
