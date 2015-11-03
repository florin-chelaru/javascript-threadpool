/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 12:39 PM
 */

goog.provide('parallel.ThreadMessage');

/**
 * @param {string|number} [threadId]
 * @param {string} [action]
 * @param {T} [data]
 * @param {string} [error]
 * @constructor
 * @template T
 */
parallel.ThreadMessage = function(threadId, action, data, error) {
  /**
   * @type {string|number|undefined}
   */
  this['threadId'] = threadId;

  /**
   * @type {string|undefined}
   */
  this['action'] = action;

  /**
   * @type {T|undefined}
   */
  this['data'] = data;

  /**
   * @type {string|undefined}
   */
  this['error'] = error;
};
