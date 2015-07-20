/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 1:13 PM
 */

goog.provide('parallel.events.Event');

goog.require('parallel.events.EventListener');

/**
 * @param {boolean} [synchronous]
 * @constructor
 * @template T
 */
parallel.events.Event = function(synchronous) {

  /**
   * @type {boolean}
   * @private
   */
  this._synchronous = !!synchronous;

  /**
   * @type {number}
   * @private
   */
  this._count = 0;

  /**
   * @type {Object.<number, parallel.events.EventListener.<T>>}
   * @private
   */
  this._listeners = {};

  /**
   * Set to true when in the notify() method, to avoid infinite loops.
   * This is only used when the events are synchronous
   * @type {boolean}
   * @private
   */
  this._firing = false;
};

/**
 * @param {parallel.events.EventListener.<T>} listener
 */
parallel.events.Event.prototype.addListener = function(listener) {
  if (!this._listeners[listener.id()]) { ++this._count; }

  this._listeners[listener.id()] = listener;
};

/**
 * @param {parallel.events.EventListener.<T>} listener
 */
parallel.events.Event.prototype.removeListener = function(listener) {
  if (!this._listeners[listener.id()]) { return; }

  delete this._listeners[listener.id()];
  --this._count;
};

/**
 * @param {T} [args]
 */
parallel.events.Event.prototype.fire = function(args) {
  if (this._firing) { return; }

  if (this._count == 0) { return; }

  this._firing = this._synchronous;

  var self = this;
  for (var id in this._listeners) {
    if (!this._listeners.hasOwnProperty(id)) { continue; }
    (function(listener) {
      if (!self._synchronous) {
        setTimeout(function() {
          listener.fire(args);
        }, 0);
      } else {
        listener.fire(args);
      }
    })(this._listeners[id]);
  }

  this._firing = false;
};

/**
 * Returns true if the event is already firing
 * @returns {boolean}
 */
parallel.events.Event.prototype.isFiring = function() { return this._firing; };