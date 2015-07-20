/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 12:33 PM
 */

goog.provide('parallel.ThreadProxy');

goog.require('parallel.ThreadMessage');
goog.require('parallel.events.Event');

/**
 * @param {string|number} id
 * @constructor
 */
parallel.ThreadProxy = function(id) {
  /**
   * @type {string|number}
   * @private
   */
  this._id = id;

  /**
   * @type {Worker}
   * @private
   */
  this._worker = null;

  /**
   * @type {Object.<number, function>}
   * @private
   */
  this._callbacks = {};

  /**
   * @type {number}
   * @private
   */
  this._pendingJobCount = 0;

  /**
   * @type {number}
   * @private
   */
  this._lastCallbackId = -1;

  /**
   * @type {boolean}
   * @private
   */
  this._isIdle = true;

  /**
   * @type {boolean}
   * @private
   */
  this._isStarted = false;

  /**
   * @type {parallel.events.Event.<parallel.ThreadMessage>}
   * @private
   */
  this._started = new parallel.events.Event();
};

/**
 */
parallel.ThreadProxy.prototype.start = function() {
  this._worker = new Worker(PARALLEL_BASE_PATH + 'thread.js');

  var self = this;
  this._worker.onmessage = function(e) {
    self._onMessage(e);
  };

  this._worker.postMessage(new parallel.ThreadMessage(this._id, ++this._lastCallbackId, 'start'));
};

/**
 * @returns {boolean}
 */
parallel.ThreadProxy.prototype.isIdle = function() { return this._isIdle; };

/**
 * @returns {boolean}
 */
parallel.ThreadProxy.prototype.isStarted = function() { return this._isStarted; };

/**
 * @param func
 * @param args
 * @param callback
 */
parallel.ThreadProxy.prototype.queue = function(func, args, callback) {
  var id = ++this._lastCallbackId;
  this._callbacks[id] = callback;
  ++this._pendingJobCount;
  this._isIdle = false;
  this._worker.postMessage(new parallel.ThreadMessage(this._id, id, 'call', { func: func.toString(), args: args }));
};

/**
 * @returns {parallel.events.Event}
 */
parallel.ThreadProxy.prototype.onStarted = function() { return this._started; };

/**
 * @param {MessageEvent} e
 * @private
 */
parallel.ThreadProxy.prototype._onMessage = function(e) {
  var msg = /** @type {parallel.ThreadMessage} */ e.data;

  switch (msg.action) {
    case 'started':
      this._isStarted = true;
      this._started.fire(msg);
      break;
    case 'response':
      var callback = this._callbacks[msg.id];
      if (callback == undefined) { return; }

      delete this._callbacks[msg.id];
      --this._pendingJobCount;
      if (this._pendingJobCount == 0) { this._isIdle = true; }
      setTimeout(function() {
        callback(msg.data);
      }, 0);
      break;
  }
};
