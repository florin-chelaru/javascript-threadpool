/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 8:51 AM
 */

importScripts('../base.js');

goog.provide('parallel.Thread');

goog.require('utils');
goog.require('parallel.ThreadMessage');
goog.require('parallel.shared.ObjectProxy');

/**
 * @param {WorkerGlobalScope} context
 * @constructor
 */
parallel.Thread = function(context) {
  /**
   * @type {string|number}
   * @private
   */
  this._id = null;

  /**
   * @type {WorkerGlobalScope}
   * @private
   */
  this._context = context;

  /**
   * @type {Object.<number, *>}
   * @private
   */
  this._sharedObjects = {};

  this._init();
};

/**
 */
parallel.Thread.prototype._init = function() {
  var self = this;
  var context = this._context;
  context.addEventListener('message', function(e) {
    /** @type {parallel.ThreadMessage} */
    var msg = e.data;
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
        break;
      case 'start':
        self._id = msg.threadId;
        context.postMessage(new parallel.ThreadMessage(self._id, msg.id, 'started'));
        break;
      case 'stop':
        context.close(); // Terminates the worker.
        break;
      case 'call':
        var id = msg.id;
        var args = msg.data['args'];
        if (args) {
          args = args.map(function(arg) { return arg.__id !== undefined ? self.getShared(arg) : arg; });
        }
        var func = null;
        if (msg.data['func']) {
          func = eval('(' + msg.data['func'] + ')');
        } else {
          func = utils.evaluateFullyQualifiedTypeName(msg.data['funcName'], context);
        }
        var result = func.apply(null, args);
        context.postMessage(new parallel.ThreadMessage(self._id, msg.id, 'response', result));
        break;
      case 'createShared':
        var objId = msg.data['id'];
        var typeName = msg.data['type'];
        var ctor = null;

        try {
          ctor = utils.evaluateFullyQualifiedTypeName(typeName, context);
        } catch (err) {
          goog.require(typeName);

          try{
            ctor = utils.evaluateFullyQualifiedTypeName(typeName, context);
          } catch (err) {
            console.error('Resource ' + typeName + ' not found.');
            break;
          }
        }

        var args = msg.data['args'];
        if (args) {
          args = args.map(function(arg) { return arg.__id !== undefined ? self.getShared(arg) : arg; });
        }
        var obj = utils.applyConstructor(ctor, args);
        self._sharedObjects[objId] = {typeName: typeName, type: ctor, object: obj};
        context.postMessage(new parallel.ThreadMessage(self._id, msg.id, 'created', objId));
        break;
      case 'callShared':
        var shared = self._sharedObjects[msg.data['target']];
        var target = shared.object;
        var method = shared.type.prototype[msg.data['method']];
        var args = msg.data['args'];
        if (args) {
          args = args.map(function(arg) { return arg.__id !== undefined ? self.getShared(arg) : arg; });
        }
        var result = method.apply(target, args);
        context.postMessage(new parallel.ThreadMessage(self._id, msg.id, 'response', result));
        break;
      default:
        context.postMessage('unknown: ' + msg.action);
    }
  });
};

/**
 * @param {parallel.shared.ObjectProxy} proxy
 * @returns {*}
 */
parallel.Thread.prototype.getShared = function(proxy) { return this._sharedObjects[proxy.__id].object; };

self.thread = new parallel.Thread(self);
