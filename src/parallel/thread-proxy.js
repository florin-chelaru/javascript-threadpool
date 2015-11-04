/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 12:33 PM
 */

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
