/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 10:37 AM
 */

goog.provide('utils');

/**
 * Evaluates the given string into a constructor for a type
 * @param {string} typeName
 * @param [context]
 * @returns {?function(new: T)}
 * @template T
 */
utils.evaluateFullyQualifiedTypeName = function(typeName, context) {
  if (context == undefined) { context = window; }
  var namespaces = typeName.split('.');
  var func = namespaces.pop();
  for (var i = 0; i < namespaces.length; ++i) {
    context = context[namespaces[i]];
  }

  var result = context[func];
  if (typeof(result) !== 'function') {
    throw new Error('Unknown type name: ' + typeName);
  }

  return result;
};

/**
 * Applies the given constructor to the given parameters and creates
 * a new instance of the class it defines
 * @param {function(new: T)} ctor
 * @param {Array} params
 * @returns {T}
 * @template T
 */
utils.applyConstructor = function(ctor, params) {
  var obj;

  // Use a fake constructor function with the target constructor's
  // `prototype` property to create the object with the right prototype
  var fakeCtor = function() {};
  fakeCtor.prototype = ctor.prototype;

  /** @type {T} */
  obj = new fakeCtor();

  // Set the object's `constructor`
  obj.constructor = ctor;

  // Call the constructor function
  ctor.apply(obj, params);

  return obj;
};

/**
 * @param {Arguments} args
 * @returns {Array}
 */
utils.argumentsToArray = function(args) {
  var ret = [];
  if (args.length == 0) { return ret; }

  for (var i = 0; i < args.length; ++i) {
    ret[i] = args[i];
  }

  return ret;
};
