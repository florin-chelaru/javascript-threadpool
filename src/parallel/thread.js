/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 8:51 AM
 */

importScripts('../base.js');

goog.provide('parallel.Thread');

goog.require('utils');
goog.require('parallel.ThreadMessage');

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
      /*case 'load':
        var file = data.msg;
        importScripts(DOMAIN_BASE_PATH + file);
        break;*/
      case 'start':
        self._id = msg.threadId;
        context.postMessage(new parallel.ThreadMessage(self._id, msg.id, 'started'));
        break;
      case 'stop':
        context.close(); // Terminates the worker.
        break;
      case 'call':
        var id = msg.id;
        var funcArgs = msg.data['args'];
        var func = null;
        if (msg.data['func']) {
          func = eval('(' + msg.data['func'] + ')');
        } else {
          func = utils.evaluateFullyQualifiedTypeName(msg.data['funcName'], context);
        }
        var result = func.apply(null, funcArgs);
        context.postMessage(new parallel.ThreadMessage(self._id, msg.id, 'response', result));
        break;
      default:
        context.postMessage('unknown: ' + msg.action);
    }
  });
};

new parallel.Thread(self);
