/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/24/2015
 * Time: 1:11 AM
 */

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
