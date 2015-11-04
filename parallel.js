/**
* @license threadpool.js
* Copyright (c) 2015 Florin Chelaru
* License: MIT
*
* Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
* documentation files (the "Software"), to deal in the Software without restriction, including without limitation the
* rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
* permit persons to whom the Software is furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the
* Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE
* WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
* COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
* OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


goog.provide('parallel.ParallelException');

/**
 * @param {string} message
 * @param {Error} [innerException]
 * @constructor
 * @extends u.Exception
 */
parallel.ParallelException = function(message, innerException) {
  u.Exception.apply(this, arguments);

  /**
   * @type {string}
   */
  this.name = 'ParallelException';
};

goog.inherits(parallel.ParallelException, u.Exception);


goog.provide('parallel.ThreadMessage');

/**
 * @param {string|number} [threadId]
 * @param {string} [action]
 * @param {T} [data]
 * @param {string} [error]
 * @constructor
 * @template T
 */
parallel.ThreadMessage = function(threadId, action, data, error) {
  /**
   * @type {string|number|undefined}
   */
  this['threadId'] = threadId;

  /**
   * @type {string|undefined}
   */
  this['action'] = action;

  /**
   * @type {T|undefined}
   */
  this['data'] = data;

  /**
   * @type {string|undefined}
   */
  this['error'] = error;
};


goog.provide('parallel.SharedObject');

/**
 * @param {function(new: T)} ctor
 * @constructor
 * @template T
 */
parallel.SharedObject = function(ctor) {
  /**
   * @type {number}
   */
  this['__id'] = ++parallel.SharedObject.LAST_ID;

  /**
   * @type {u.Event.<{resolve: Function, reject: Function, target: parallel.SharedObject, method: string, args: (Array|undefined), type: string}>}
   */
  this.__memberCalled = new u.Event();

  var self = this;
  var members = Object.getOwnPropertyNames(ctor.prototype);
  members.forEach(function(member) {
    var property = Object.getOwnPropertyDescriptor(ctor.prototype, member);
    var wrapper = {
      configurable: false,
      enumerable: property.enumerable
    };
    if (typeof property.value != 'function') {
      wrapper.get = function() {
        return new Promise(function(resolve, reject) {
          self.__memberCalled.fire({
            resolve: resolve,
            reject: reject,
            target: self,
            method: member,
            type: 'get'
          });
        });
      };

      if ('set' in property || property.writable) {
        wrapper.set = function(value) {
          return new Promise(function(resolve, reject) {
            self.__memberCalled.fire({
              resolve: resolve,
              reject: reject,
              target: self,
              method: member,
              args: [value],
              type: 'set'
            });
          });
        };
      }
    } else {
      wrapper.value = function() {
        var args = u.array.fromArguments(arguments);
        return new Promise(function(resolve, reject) {
          self.__memberCalled.fire({
            resolve: resolve,
            reject: reject,
            target: self,
            method: member,
            args: args,
            type: 'function'
          });
        });
      };
    }
    Object.defineProperty(self, member, wrapper);
  });
};

/**
 * @type {number}
 */
parallel.SharedObject.LAST_ID = -1;

/**
 * @returns {{__id: number}}
 */
parallel.SharedObject.prototype.__strip = function() {
  return {'__id': this['__id']};
};


goog.provide('parallel.ThreadProxy');

goog.require('parallel.ThreadMessage');
goog.require('parallel.SharedObject');
goog.require('parallel.ParallelException');

/**
 * @param {string|number} id
 * @param {string} threadJsPath
 * @constructor
 */
parallel.ThreadProxy = function(id, threadJsPath) {
  /**
   * @type {string}
   * @private
   */
  this._threadJsPath = threadJsPath;

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
   * @type {number}
   * @private
   */
  this._pendingJobCount = 0;

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
   * @type {Object.<number, parallel.SharedObject>}
   * @private
   */
  this._sharedObjects = {};

  /**
   * @type {Promise}
   * @private
   */
  this._start = null;

  /**
   * @type {Promise}
   * @private
   */
  this._stop = null;

  /**
   * @type {u.Event.<parallel.ThreadProxy>}
   * @private
   */
  this._turnedIdle = new u.Event();
};

/**
 * @type {string|number}
 * @name parallel.ThreadProxy#id
 */
parallel.ThreadProxy.prototype.id;

/**
 * @type {boolean}
 * @name parallel.ThreadProxy#isIdle
 */
parallel.ThreadProxy.prototype.isIdle;

/**
 * @type {boolean}
 * @name parallel.ThreadProxy#isStarted
 */
parallel.ThreadProxy.prototype.isStarted;

/**
 * @type {u.Event.<parallel.ThreadProxy>}
 * @name parallel.ThreadProxy#turnedIdle
 */
parallel.ThreadProxy.prototype.turnedIdle;

Object.defineProperties(parallel.ThreadProxy.prototype, {
  'id': { get: /** @type {function (this:parallel.ThreadProxy)} */ (function() { return this._id; })},
  'isIdle': { get: /** @type {function (this:parallel.ThreadProxy)} */ (function() { return this._isIdle; })},
  'isStarted': { get: /** @type {function (this:parallel.ThreadProxy)} */ (function() { return this._isStarted; })},
  'turnedIdle': { get: /** @type {function (this:parallel.ThreadProxy)} */ (function() { return this._turnedIdle; })}
});

/**
 * @returns {Promise}
 */
parallel.ThreadProxy.prototype.start = function() {
  if (this._start) { return this._start; }

  this._worker = new Worker(this._threadJsPath);
  var self = this;
  this._start = new Promise(function(resolve, reject) {
    self._sendMessage(new parallel.ThreadMessage(self._id, 'start'))
      .then(function(rsp) { self._isStarted = true; resolve(rsp); }, reject);
  });
  return this._start;
};

/**
 * @returns {Promise}
 */
parallel.ThreadProxy.prototype.stop = function() {
  if (!this._worker) { return Promise.resolve(); }

  if (this._stop) { return this._stop; }

  var self = this;
  var cleanUp = function(resolve) {
    self._worker.terminate();
    self._worker = null;
    self._start = null;
    self._stop = null;
    resolve();
  };

  this._stop = new Promise(function(resolve) {
    self._start.then(
      function() {
        return self._sendMessage(new parallel.ThreadMessage(self._id, 'stop'));
      },
      function() {
        // Start did not suceed so we can just clean up
        cleanUp(resolve);
      }).then(
        function() {
          // Stop finished, so we can terminate the worker
          cleanUp(resolve);
        },
        function() {
          // Something went wrong; we will forcefully stop the worker now
          cleanUp(resolve);
        });
  });
  return this._stop;
};

/**
 * @param {Function} func
 * @param {...} [args]
 * @returns {Promise}
 */
parallel.ThreadProxy.prototype.run = function(func, args) {
  var self = this;
  args = u.array.fromArguments(arguments).slice(1);
  return new Promise(function(resolve, reject) {
    args = args ? args.map(function(arg) { return (arg instanceof parallel.SharedObject) ? arg.__strip() : arg; }) : undefined;
    self._sendMessage(new parallel.ThreadMessage(self._id, 'call', {'func': func.toString(), 'args': args}))
      .then(
        function(rsp) { resolve(rsp['data']); },
        function(rsp) { reject(rsp['error']); });
  });
};

/**
 * @param {string} typeName
 * @param {...} [args]
 * @returns {Promise.<parallel.SharedObject>}
 */
parallel.ThreadProxy.prototype.createShared = function(typeName, args) {
  var self = this;
  args = u.array.fromArguments(arguments).slice(1);

  return new Promise(function(resolve, reject) {
    var ctor = u.reflection.evaluateFullyQualifiedTypeName(typeName);
    var proxy = new parallel.SharedObject(ctor);

    args = args ? args.map(function(arg) { return (arg instanceof parallel.SharedObject) ? arg.__strip() : arg; }) : undefined;

    self._sendMessage(new parallel.ThreadMessage(self._id, 'createShared', {'id': proxy['__id'], 'type': typeName, 'args': args}))
      .then(function() {
        proxy.__memberCalled.addListener(function(e) {
          var objResolve = e.resolve;
          var objReject = e.reject;
          var args = e.args ? e.args.map(function(arg) { return (arg instanceof parallel.SharedObject) ? arg.__strip() : arg; }) : undefined;

          self._sendMessage(new parallel.ThreadMessage(self._id, 'callShared', {
            'target': e.target['__id'],
            'method': e.method,
            'type': e.type,
            'args': args
          })).then(
            function(rsp) { objResolve(rsp['data']); },
            function(rsp) { objReject(rsp['error']); });
        });

        self._sharedObjects[proxy['__id']] = proxy;
        resolve(proxy);
      }, reject);
  });
};

/**
 * @param {*} obj
 * @param {string} typeName
 * @param {...} [args]
 * @returns {Promise.<parallel.SharedObject|*|Array.<parallel.SharedObject|*>>}
 */
parallel.ThreadProxy.prototype.swap = function(obj, typeName, args) {
  var self = this;
  args = u.array.fromArguments(arguments);
  return new Promise(function(resolve, reject) {
    try {
      if (args.length == 0 || args.length % 2 != 0) { reject('Invalid arguments'); return; }

      // Create proxies for full objects
      var indices = u.array.range(Math.floor(args.length / 2));
      var ret = indices.map(function(i) {
        if (args[i * 2] instanceof parallel.SharedObject) { return null; }

        var ctor = u.reflection.evaluateFullyQualifiedTypeName(args[i * 2 + 1]);
        return new parallel.SharedObject(ctor);
      });

      var tuples = indices.map(function (i) {
        return {
          'id': args[i * 2] instanceof parallel.SharedObject ? args[i * 2]['__id'] : ret[i]['__id'],
          'object': args[i * 2] instanceof parallel.SharedObject ? undefined : args[i * 2],
          'type': args[i * 2 + 1]
        };
      });

      self._sendMessage(new parallel.ThreadMessage(self._id, 'swap', tuples))
        .then(function (rsp) {
          ret = rsp['data'].map(function (o, i) {
            if (ret[i] instanceof parallel.SharedObject) {
              var proxy = ret[i];
              proxy.__memberCalled.addListener(function(e) {
                var objResolve = e.resolve;
                var objReject = e.reject;
                var args = e.args ? e.args.map(function(arg) { return (arg instanceof parallel.SharedObject) ? arg.__strip() : arg; }) : undefined;

                self._sendMessage(new parallel.ThreadMessage(self._id, 'callShared', {
                  'target': e.target['__id'],
                  'method': e.method,
                  'type': e.type,
                  'args': args
                })).then(
                  function(rsp) { objResolve(rsp['data']); },
                  function(rsp) { objReject(rsp['error']); });
              });

              self._sharedObjects[proxy['__id']] = proxy;
              return proxy;
            }

            return u.reflection.wrap(o, u.reflection.evaluateFullyQualifiedTypeName(args[i * 2 + 1]));
          });
          resolve(ret.length == 1 ? ret[0] : ret);
        }, reject);
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * @param {parallel.ThreadMessage} msg
 * @returns {Promise}
 * @private
 */
parallel.ThreadProxy.prototype._sendMessage = function(msg) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var messageChannel = new MessageChannel();
    messageChannel.port1.onmessage = function(event) {
      /** @type {parallel.ThreadMessage} */
      var rsp = u.reflection.wrap(event.data, parallel.ThreadMessage);
      if (rsp['error']) {
        reject(rsp);
      } else {
        resolve(rsp);
      }
      --self._pendingJobCount;
      self._isIdle = !self._pendingJobCount;
      if (self._isIdle) { self._turnedIdle.fire(self); }
    };

    ++self._pendingJobCount;
    self._isIdle = false;
    self._worker.postMessage(msg, [messageChannel.port2]);
  });
};


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
 * @returns {Promise}
 */
parallel.ThreadPool.prototype.stopAll = function() {
  return u.async.each(this._threads, function(thread) { return thread.stop(); });
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


goog.provide('parallel');

goog.require('parallel.SharedObject');
goog.require('parallel.ThreadProxy');
goog.require('parallel.ThreadPool');
