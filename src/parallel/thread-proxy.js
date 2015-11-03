/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 12:33 PM
 */

goog.provide('parallel.ThreadProxy');

goog.require('parallel.ThreadMessage');
goog.require('parallel.SharedObject');

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
 * @param {Function} func
 * @param {Array} [args]
 * @returns {Promise}
 */
parallel.ThreadProxy.prototype.run = function(func, args) {
  var self = this;
  ++this._pendingJobCount;
  this._isIdle = false;
  return new Promise(function(resolve, reject) {
    args = args ? args.map(function(arg) { return (arg instanceof parallel.SharedObject) ? arg.__strip() : arg; }) : undefined;
    self._sendMessage(new parallel.ThreadMessage(self._id, 'call', {'func': func.toString(), 'args': args}))
      .then(
      function(rsp) {
        --self._pendingJobCount;
        self._isIdle = !self._pendingJobCount;
        resolve(rsp['data']);
        if (self._isIdle) { self._turnedIdle.fire(self); }
      },
      function(rsp) {
        --self._pendingJobCount;
        self._isIdle = !self._pendingJobCount;
        reject(rsp['error']);
        if (self._isIdle) { self._turnedIdle.fire(self); }
      }
    );
  });
};

/**
 * @param {string} typeName
 * @param {Array} [args]
 * @returns {Promise.<parallel.SharedObject>}
 */
parallel.ThreadProxy.prototype.createShared = function(typeName, args) {
  var self = this;
  return new Promise(function(resolve, reject) {
    var ctor = u.reflection.evaluateFullyQualifiedTypeName(typeName);
    var proxy = new parallel.SharedObject(ctor);
    proxy.__memberCalled.addListener(function(e) {
      var objResolve = e.resolve;
      var objReject = e.reject;
      var args = e.args ? e.args.map(function(arg) { return (arg instanceof parallel.SharedObject) ? arg.__strip() : arg; }) : undefined;

      ++self._pendingJobCount;
      self._isIdle = false;
      self._sendMessage(new parallel.ThreadMessage(self._id, 'callShared', {
        'target': e.target['__id'],
        'method': e.method,
        'type': e.type,
        'args': args
      })).then(
        function(rsp) {
          --self._pendingJobCount;
          self._isIdle = !self._pendingJobCount;
          objResolve(rsp['data']);
          if (self._isIdle) { self._turnedIdle.fire(self); }
        },
        function(rsp) {
          --self._pendingJobCount;
          self._isIdle = !self._pendingJobCount;
          objReject(rsp['error']);
          if (self._isIdle) { self._turnedIdle.fire(self); }
        }
      );
    });

    self._sharedObjects[proxy['__id']] = proxy;
    args = args ? args.map(function(arg) { return (arg instanceof parallel.SharedObject) ? arg.__strip() : arg; }) : undefined;

    ++self._pendingJobCount;
    self._isIdle = false;
    self._sendMessage(new parallel.ThreadMessage(self._id, 'createShared', {'id': proxy['__id'], 'type': typeName, 'args': args}))
      .then(
      function() {
        --self._pendingJobCount;
        self._isIdle = !self._pendingJobCount;
        resolve(proxy);
        if (self._isIdle) { self._turnedIdle.fire(self); }
      },
      function(rsp) {
        --self._pendingJobCount;
        self._isIdle = !self._pendingJobCount;
        reject(rsp);
        if (self._isIdle) { self._turnedIdle.fire(self); }
      });
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
    };

    self._worker.postMessage(msg, [messageChannel.port2]);
  });
};
