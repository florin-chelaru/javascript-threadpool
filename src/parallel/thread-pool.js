/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 11:06 AM
 */

goog.provide('parallel.ThreadPool');

goog.require('parallel.ThreadProxy');
goog.require('parallel.SharedObject');
goog.require('parallel.ParallelException');

/**
 * @param {number} maxThreads
 * @param {string} threadJsPath
 * @constructor
 */
parallel.ThreadPool = function(maxThreads, threadJsPath) {

  if (maxThreads <= 0) {
    throw new parallel.ParallelException('Invalid ThreadPool parameter maxThreads = ' + maxThreads + '; minimum is 1');
  }

  /**
   * @type {number}
   * @private
   */
  this._maxThreads = maxThreads;

  /**
   * @type {string}
   * @private
   */
  this._threadJsPath = threadJsPath;

  /**
   * @type {Array.<parallel.ThreadProxy>}
   * @private
   */
  this._threads = [];
  this._threads.push(new parallel.ThreadProxy(0, this._threadJsPath));
  this._threads[0]['turnedIdle'].addListener(this._threadTurnedIdle, this);
  this._threads[0].start();

  /**
   * @type {Array.<{job: function(parallel.ThreadProxy):Promise, resolve: Function, reject: Function}>}
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
    if (this._threads[i]['isIdle']) {
      if (this._threads[i]['isStarted']) {
        return this._threads[i];
      }
      // if no thread is both idle and started, we will use one that is at least idle and pending start
      thread = this._threads[i];
    }
  }

  if (thread !== null) { return thread; }

  if (this._threads.length < this._maxThreads) {
    thread = new parallel.ThreadProxy(this._threads.length, this._threadJsPath);
    thread['turnedIdle'].addListener(this._threadTurnedIdle, this);
    this._threads.push(thread);

    thread.start();
    return thread;
  }

  return null;
};

/**
 * @param {function(parallel.ThreadProxy):Promise} job
 * @returns {Promise}
 */
parallel.ThreadPool.prototype.queue = function(job) {
  var self = this;
  var thread = self.getAvailableThread();
  if (thread !== null) { return job.call(null, thread); }

  return new Promise(function(resolve, reject) {
    self._jobs.push({job: job, resolve: resolve, reject: reject});
  });
};

/**
 * @param {parallel.ThreadProxy} thread
 * @private
 */
parallel.ThreadPool.prototype._threadTurnedIdle = function(thread) {
  if (this._jobs.length == 0) { return; }

  var tuple = this._jobs.shift();
  var job = tuple.job;
  var resolve = tuple.resolve;
  var reject = tuple.reject;

  job.call(null, thread).then(resolve, reject);
};
