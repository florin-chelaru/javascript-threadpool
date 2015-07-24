/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/23/2015
 * Time: 9:20 PM
 */

goog.provide('parallel.shared.Array');

goog.require('parallel.shared.SharedObject');
goog.require('utils');

/**
 * @param {Array.<T>} [innerArray]
 * @constructor
 * @implements {parallel.shared.SharedObject}
 * @template T
 */
parallel.shared.Array = function(innerArray) {
  /**
   * @type {Array.<T>}
   * @private
   */
  this._innerArray = innerArray || [];
};

/**
 * @param {number} i
 * @param {T} value
 */
parallel.shared.Array.prototype.set = function(i, value) {
  this._innerArray[i] = value;
};

/**
 * @param {number} i
 * @returns {T}
 */
parallel.shared.Array.prototype.get = function(i) {
  return this._innerArray[i];
};

/**
 * @returns {Number}
 */
parallel.shared.Array.prototype.size = function() { return this._innerArray.length; };

/**
 @param {...T|Array.<T>|parallel.shared.Array.<T>} [items]
 @return {parallel.shared.Array.<T>}
 */
parallel.shared.Array.prototype.concat = function(items) {
  var innerArray;
  if (items instanceof parallel.shared.Array) { innerArray = this._innerArray.concat(items._innerArray); }
  else { innerArray = this._innerArray.concat(items); }
  return new parallel.shared.Array(innerArray);
};

/**
 @param {string} [separator]
 @return {string}
 */
parallel.shared.Array.prototype.join = function(separator) { return this._innerArray.join(separator); };

/**
 @return {T}
 */
parallel.shared.Array.prototype.pop = function() { return this._innerArray.pop(); };

/**
 @param {...T} [items]
 @return {Number}
 */
parallel.shared.Array.prototype.push = function(items) { return Array.prototype.push.apply(this._innerArray, arguments); };

/**
 @return {parallel.shared.Array.<T>}
 */
parallel.shared.Array.prototype.reverse = function() {
  this._innerArray.reverse();
  return this;
};

/**
 @return {T}
 */
parallel.shared.Array.prototype.shift = function() { return this._innerArray.shift(); };

/**
 @param {Number} [start]
 @param {Number} [end]
 @return {parallel.shared.Array.<T>}
 */
parallel.shared.Array.prototype.slice = function(start,end) {
  var innerArray = this._innerArray.slice(start, end);
  return new parallel.shared.Array(innerArray);
};

/**
 @param {function} [compareFn]
 @return {parallel.shared.Array.<T>}
 */
parallel.shared.Array.prototype.sort = function(compareFn) {
  this._innerArray.sort(compareFn);
  return this;
};

/**
 @param {Number} [start]
 @param {Number} [deleteCount]
 @param {...T} [items]
 @return {parallel.shared.Array.<T>}
 */
parallel.shared.Array.prototype.splice = function(start,deleteCount,items) {
  var innerArray = Array.prototype.splice.apply(this._innerArray, arguments);
  return new parallel.shared.Array(innerArray);
};

/**
 @param {...T} [items]
 @return {Number}
 */
parallel.shared.Array.prototype.unshift = function(items) {
  return Array.prototype.unshift.apply(this._innerArray, arguments);
};

/**
 @return {parallel.shared.Array}
 */
parallel.shared.Array.prototype.valueOf = function() {
  return this;
};


/**
 @param {function(*, *=, number=, parallel.shared.Array.<T>=)} callback
 @param {*} [initialValue]
 @return {*}
 */
parallel.shared.Array.prototype.reduce = function(callback,initialValue) {
  var self = this;
  var arrCallback = function(e1, e2, i, arr) {
    return callback(e1, e2, i, self);
  };

  return Array.prototype.reduce.apply(this._innerArray, [arrCallback].concat(utils.argumentsToArray(arguments).slice(1)));
};
/**
 @param {function(*, *=, number=, parallel.shared.Array.<T>=)} callback
 @param {*} [initialValue]
 @return {*}
 */
parallel.shared.Array.prototype.reduceRight = function(callback,initialValue) {
  var self = this;
  var arrCallback = function(e1, e2, i, arr) {
    return callback(e1, e2, i, self);
  };

  return Array.prototype.reduceRight.apply(this._innerArray, [arrCallback].concat(utils.argumentsToArray(arguments).slice(1)));
};
/**
 @param {T} searchElement
 @param {number} [fromIndex]
 @return {number}
 */
parallel.shared.Array.prototype.indexOf = function(searchElement,fromIndex) {
  return this._innerArray.indexOf(searchElement, fromIndex);
};
/**
 @param {T} searchElement
 @param {number} [fromIndex]
 @return {number}
 */
parallel.shared.Array.prototype.lastIndexOf = function(searchElement,fromIndex) {
  return this._innerArray.lastIndexOf(searchElement, fromIndex);
};
/**
 @param {function(T=, number=, parallel.shared.Array.<T>=)} callback
 @param {*} [thisArg]
 @return {boolean}
 */
parallel.shared.Array.prototype.every = function(callback,thisArg) {
  var self = this;
  var arrCallback = function(e, i, arr) {
    return callback(e, i, self);
  };
  return this._innerArray.every(arrCallback, thisArg);
};
/**
 @param {function(T=, number=, parallel.shared.Array.<T>=)} callback
 @param {*} [thisArg]
 @return {parallel.shared.Array.<T>}
 */
parallel.shared.Array.prototype.filter = function(callback,thisArg) {
  var self = this;
  var arrCallback = function(e, i, arr) {
    return callback(e, i, self);
  };

  var innerArray = this._innerArray.filter(arrCallback, thisArg);
  return new parallel.shared.Array(innerArray);
};
/**
 @param {function(T=, number=, parallel.shared.Array.<T>=)} callback
 @param {*} [thisArg]
 @return {void}
 */
parallel.shared.Array.prototype.forEach = function(callback,thisArg) {
  var self = this;
  var arrCallback = function(e, i, arr) {
    return callback(e, i, self);
  };
  return this._innerArray.forEach(arrCallback, thisArg);
};
/**
 @param {function(T=, number=, parallel.shared.Array.<T>=)} callback
 @param {*} [thisArg]
 @return {parallel.shared.Array}
 */
parallel.shared.Array.prototype.map = function(callback,thisArg) {
  var self = this;
  var arrCallback = function(e, i, arr) {
    return callback(e, i, self);
  };
  var innerArray = this._innerArray.map(arrCallback, thisArg);
  return new parallel.shared.Array(innerArray);
};
/**
 @param {function(T=, number=, parallel.shared.Array.<T>=)} callback
 @param {*} [thisArg]
 @return {boolean}
 */
parallel.shared.Array.prototype.some = function(callback,thisArg) {
  var self = this;
  var arrCallback = function(e, i, arr) {
    return callback(e, i, self);
  };
  return this._innerArray.some(arrCallback, thisArg);
};
