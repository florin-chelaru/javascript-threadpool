/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 1:19 PM
 */

goog.provide('parallel.events.EventListener');

/**
 * @param {function(T)} callback
 * @constructor
 * @template T
 */
parallel.events.EventListener = function(callback) {
  /**
   * @type {number}
   * @private
   */
  this._id = ++parallel.events.EventListener._lastId;

  /**
   * @type {function(T)}
   * @private
   */
  this._callback = callback;
};

parallel.events.EventListener._lastId = -1;

/**
 * @param {T} [args]
 */
parallel.events.EventListener.prototype.fire = function(args) {
  this._callback(args);
};

/**
 * @returns {number}
 */
parallel.events.EventListener.prototype.id = function() {
  return this._id;
};

