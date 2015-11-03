/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 8:51 AM
 */

importScripts('base.js');

goog.provide('parallel.Thread');

goog.require('parallel.ThreadMessage');

u.log.VERBOSE = 'info';

/**
 * @param {Object} context
 * @constructor
 */
parallel.Thread = function(context) {
  /**
   * @type {string|number}
   * @private
   */
  this._id = null;

  /**
   * @type {Object}
   * @private
   */
  this._context = context;

  /**
   * @type {Object.<number, *>}
   * @private
   */
  this._sharedObjects = {};

  var self = this;
  context.addEventListener('message', function(e) {
    self._handleMessage(e);
  });
};

/**
 * @param {{__id: number}} proxy
 * @returns {*}
 */
parallel.Thread.prototype.getShared = function(proxy) { return this._sharedObjects[proxy.__id].object; };

parallel.Thread.prototype._handleMessage = function(e) {
  try {
    if (!e.data || !e.data.action) {
      e.ports[0].postMessage({
        threadId: this._id,
        error: 'Unsupported message: ' + JSON.stringify(e.data)
      });
      return;
    }

    var self = this;
    var context = this._context;

    /** @type {parallel.ThreadMessage} */
    var msg = u.reflection.wrap(e.data, parallel.ThreadMessage);

    var result;
    var args = msg.data ? msg.data['args'] : undefined;
    if (args) {
      args = args.map(function(arg) {
        return Object.getOwnPropertyDescriptor(arg, '__id') ? self.getShared(arg) : arg;
      });
    }
    switch (msg.action) {
      case 'load':
        var file = msg.data['file'];
        if (file != undefined) {
          importScripts(DOMAIN_BASE_PATH + file);
        }
        var resource = msg.data['resource'];
        if (resource != undefined) {
          goog.require(resource);
        }

        // success
        e.ports[0].postMessage({ threadId: this._id });
        break;
      case 'start':
        this._id = msg.threadId;
        // success
        e.ports[0].postMessage({ threadId: this._id });
        break;
      case 'stop':
        context.close(); // Terminates the worker.
        break;
      case 'call':
        var func = null;
        if ('func' in msg.data) {
          func = eval('(' + msg.data['func'] + ')');
        } else {
          func = u.reflection.evaluateFullyQualifiedTypeName(msg.data['funcName'], context);
        }
        result = func.apply(null, args);
        e.ports[0].postMessage({
          threadId: this._id,
          data: result
        });
        break;
      case 'createShared':
        var objId = msg.data['id'];
        var typeName = msg.data['type'];
        var ctor = null;

        try {
          ctor = u.reflection.evaluateFullyQualifiedTypeName(typeName, context);
        } catch (err) {
          goog.require(typeName);
          ctor = u.reflection.evaluateFullyQualifiedTypeName(typeName, context);
        }

        var obj = u.reflection.applyConstructor(ctor, args);
        self._sharedObjects[objId] = {typeName: typeName, type: ctor, object: obj};

        // success
        e.ports[0].postMessage({ threadId: this._id });
        break;
      case 'callShared':
        var shared = self._sharedObjects[msg.data['target']];
        if (!shared) {
          e.ports[0].postMessage({
            error: 'Shared object not found: ' + JSON.stringify(e.data)
          });
          break;
        }

        var target = shared.object;
        var method = shared.type.prototype[msg.data['method']];
        var type = msg.data['type'];

        switch (type) {
          case 'function':
            result = method.apply(target, args);
            break;
          case 'get':
            result = target[method];
            break;
          case 'set':
            result = undefined;
            target[method] = args[0];
            break;
        }
        e.ports[0].postMessage({
          threadId: this._id,
          data: result
        });

        break;
      default:
        e.ports[0].postMessage({
          threadId: this._id,
          error: 'Unsupported action: ' + JSON.stringify(e.data)
        });
    }
  } catch (err) {
    e.ports[0].postMessage({
      threadId: this._id,
      error: err.toString()
    });
    u.log.error(err);
  }
};

self.thread = new parallel.Thread(self);
