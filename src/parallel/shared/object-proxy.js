/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/24/2015
 * Time: 1:11 AM
 */

goog.provide('parallel.shared.ObjectProxy');

goog.require('utils');

/**
 * @param {function(new: T)} ctor
 * @constructor
 * @template T
 */
parallel.shared.ObjectProxy = function(ctor) {
  /**
   * @type {number}
   */
  this.__id = ++parallel.shared.ObjectProxy.LAST_ID;

  /**
   * @type {parallel.events.Event.<{deferred: goog.async.Deferred, target: parallel.shared.ObjectProxy, method: string, args: Array}>}
   */
  this.__memberCalled = new parallel.events.Event();

  var self = this;
  for (var member in ctor.prototype) {
    if (typeof(ctor.prototype[member]) != 'function') { continue; }
    (function(member) {
      self[member] = function() {
        var deferred = new goog.async.Deferred();
        self.__memberCalled.fire({
          deferred: deferred,
          target: self,
          method: member,
          args: utils.argumentsToArray(arguments)
        });
        return deferred;
      }
    })(member);
  }
};

/**
 * @type {number}
 */
parallel.shared.ObjectProxy.LAST_ID = -1;

parallel.shared.ObjectProxy.prototype.__strip = function() {
  return {__id: this.__id};
};
