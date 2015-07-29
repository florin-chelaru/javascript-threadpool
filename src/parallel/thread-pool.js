/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 11:06 AM
 */

goog.provide('parallel.ThreadPool');

goog.require('parallel.ThreadProxy');
goog.require('parallel.shared.ObjectProxy');

var PARALLEL_BASE_PATH = PARALLEL_BASE_PATH || '/';

/**
 * @param {number} maxThreads
 * @constructor
 */
parallel.ThreadPool = function(maxThreads) {

  if (maxThreads <= 0) {
    throw Error('Invalid ThreadPool parameter maxThreads = ' + maxThreads);
  }

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

  var self = this;
  this._threads[0].onJobFinished().addListener(new parallel.events.EventListener(function(msg) {
    self._jobFinished(msg);
  }));
  this._threads[0].start();

  /**
   * @type {Array.<{job: function(parallel.ThreadProxy):goog.async.Deferred, deferred: goog.async.Deferred}>}
   * @private
   */
  this._jobs = [];
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

    var self = this;
    thread.onJobFinished().addListener(new parallel.events.EventListener(function(msg) {
      self._jobFinished(msg);
    }));
    thread.start();
    return thread;
  }

  return null;
};

/**
 * @param {function(parallel.ThreadProxy):goog.async.Deferred} job
 */
parallel.ThreadPool.prototype.queue = function(job) {
  var self = this;
  var thread = self.getAvailableThread();
  if (thread !== null) { return job.call(null, thread); }

  var deferred = new goog.async.Deferred();
  this._jobs.push({job: job, deferred: deferred});

  return deferred;
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

/**
 * @param {parallel.ThreadMessage} msg
 * @private
 */
parallel.ThreadPool.prototype._jobFinished = function(msg) {
  if (this._jobs.length == 0) { return; }

  var tuple = this._jobs.shift();
  var job = tuple.job;
  var deferred = tuple.deferred;
  var threadId = msg.threadId;
  var thread = this._threads[threadId];

  job.call(null, thread).then(function() {
    deferred.callback(arguments);
  });
};
