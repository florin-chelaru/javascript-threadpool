/**
 * Created by Florin Chelaru ( florin [dot] chelaru [at] gmail [dot] com )
 * Date: 7/20/2015
 * Time: 12:39 PM
 */

goog.provide('parallel.ThreadMessage');

/**
 * @param {string|number} threadId
 * @param {number} id
 * @param {string} action
 * @param {T} [data]
 * @constructor
 * @template T
 */
parallel.ThreadMessage = function(threadId, id, action, data) {
  /**
   * @type {string|number}
   */
  this.threadId = threadId;

  /**
   * @type {number}
   */
  this.id = id;

  /**
   * @type {string}
   */
  this.action = action;

  /**
   * @type {T}
   */
  this.data = data;
};
