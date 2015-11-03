/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 11/2/2015
 * Time: 8:55 PM
 */

goog.provide('parallel.ParallelException');

/**
 * @param {string} message
 * @param {Error} [innerException]
 * @constructor
 * @extends u.Exception
 */
parallel.ParallelException = function(message, innerException) {
  u.Exception.apply(this, arguments);

  /**
   * @type {string}
   */
  this.name = 'ParallelException';
};

goog.inherits(parallel.ParallelException, u.Exception);
