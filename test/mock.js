/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 11/4/2015
 * Time: 1:25 PM
 */

/**
 * @param {number} x
 * @constructor
 */
function Mock(x) {
  /**
   * @type {number}
   * @private
   */
  this._x = x;

  /**
   * @type {number}
   * @private
   */
  this._bar = x + 10;
}

/**
 * @param {number} a
 * @returns {number}
 */
Mock.prototype.foo = function(a) {
  return this._x + a;
};

Object.defineProperties(Mock.prototype, {
  bar: { get: function() { return this._bar; }},
  x: {
    get: function() { return this._x; },
    set: function(value) { this._x = value; }
  }
});
